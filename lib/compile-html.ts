import fsx from 'fs-extra'
import pretty from 'pretty'
import cheerio from 'cheerio'
import htmlMinifier from 'html-minifier'
import shortid from 'shortid'
import escapeStringRegexp from 'escape-string-regexp'
import handlebars from 'handlebars'
import { text } from 'power-helper'
import { compileCss, compileJs } from './compile'
import { htmlHotreload, htmlEncryption, getDir, commentDelimiter } from './utils'

function clearComment(file: string, text: string) {
    let lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i]
        let warns = line.match(/<!--!.*?!-->/g) || []
        for (let warn of warns) {
            console.warn(`Comment ${file} (line: ${i + 1}): ${warn}`)
        }
    }
    return text.replace(/<\!---.*?--->/g, '').replace(/<!--!.*?!-->/g, '')
}

function randerVariables(html: string, variables: { [key: string]: any }) {
    for (let key in variables) {
        let text = escapeStringRegexp(`--${key}--`)
        let reg = new RegExp(text, 'g')
        html = html.replace(reg, variables[key])
    }
    return html
}

type Templates = Array<{
    name: string
    content: string
    isHandlebars: boolean
}>

function refReplace(content: string) {
    // @ts-ignore
    let $ = cheerio.load(content, null, false)
    $('*').each((index, element: cheerio.TagElement) => {
        let ref = element.attribs?.ref
        if (ref) {
            let uid = `${ref}-${shortid()}`
            content = content.replace(new RegExp(escapeStringRegexp(`ref="${ref}"`), 'g'), `id="${uid}"`)
            content = content.replace(new RegExp(escapeStringRegexp(`ref--${ref}`), 'g'), uid)
        }
    })
    return content
}

async function randerTemplate(file: string, html: string, templates: Templates, variables: any, renderData: any, isHandlebars: boolean) {
    let output = html.toString()
    while (true) {
        // 清除系統註解、替換環境參數
        output = clearComment(file, output)
        output = randerVariables(output, variables)
        // 渲染模板
        // @ts-ignore
        let $ = cheerio.load(output, null, false)
        // js 渲染
        let scripts = getNodes($('script'))
        for (let script of scripts) {
            let content = getElementContent(script)
            if ('render' in script.attribs) {
                let html = await eval(`(async function() {
                    ${content}
                })()`)
                $(script).replaceWith(html)
            }
        }
        output = $.html()
        if (isHandlebars) {
            output = handlebars.compile(output)(renderData)
        }
        // 渲染模板
        let elements: cheerio.TagElement[] = []
        $('*').each((index, element: cheerio.TagElement) => {
            elements.push(element)
        })
        let matched = false
        for (let element of elements) {
            let template = templates.find(e => e.name === element.name)
            if (template) {
                let content = template.content.toString()
                if (template.isHandlebars) {
                    content = handlebars.compile(content)(renderData)
                }
                for (let key in element.attribs) {
                    content = content.replace(new RegExp(`-${escapeStringRegexp(key)}-`, 'g'), element.attribs[key])
                }
                content = refReplace(content)
                let result = content.replace(/<slot>.*?<\/slot>/g, getElementContent(element))
                if (variables.env === 'dev') {
                    let vars = Object.entries(element.attribs)
                    result = `
                        ${commentDelimiter(vars.length ? template.name + `:${vars.map(e => `${e[0]}=${e[1]}`).join()}` : template.name)}
                        ${result}
                    `.trim()
                }
                let text = escapeStringRegexp(element.name)
                let reg = new RegExp(`<${text}.*?<\/${text}>`, 's')
                output = output.replace(reg, result)
                matched = true
                break
            }
        }
        if (matched === false) {
            break
        }
    }
    return output
}

type CompileHTMLParams = {
    file: string
    prod: boolean
    mini: boolean
    babel: boolean
    rootDir: string
    readonly: boolean
    readonlyHost: string
    hotReload: boolean
    isHandlebars: boolean
    renderData: Record<string, any>
    variables: {
        [key: string]: any
        env: string
        lang: string
    }
}

function getElementContent(element: cheerio.TagElement, script?: string, scriptParams?: string) {
    let html = element.children.map(e => cheerio.html(e)).join('').trim()
    if (script) {
        html += `
            <script>
                (function(args) {
                    ${script}
                })("${scriptParams}")
            </script>
        `
    }
    return html.trim()
}

function getNodes(io: cheerio.Cheerio): cheerio.TagElement[]  {
    let nodes = []
    io.each((i, e) => nodes.push(e))
    return nodes
}

function getAllFiles(root: string, child?: string) {
    let output = []
    let rootPath = root + (child ? '/' + child : '')
    let nextPath = child ? child + '/' : ''
    let files = fsx.readdirSync(rootPath)
    for (let file of files) {
        if (fsx.statSync(rootPath + '/' + file).isDirectory()) {
            output = output.concat(getAllFiles(root, nextPath + file))
        } else {
            output.push(`${nextPath}${file}`)
        }
    }
    return output
}

export async function compileHTML(html: string, params: CompileHTMLParams): Promise<string> {
    // @ts-ignore
    global.mwp = {
        variables: params.variables,
        renderData: params.renderData,
        handlebars
    }
    let output = html.toString()
    let onceOutput: Templates = []
    let templates: Templates = []
    let { templateDir, localDir } = getDir(params.rootDir)
    getAllFiles(templateDir).map((file: string) => {
        let fileName = file.replace('.html', '').replace('.hbs', '')
        let name = 't-' + fileName
        let content = fsx.readFileSync(`${templateDir}/${file}`).toString()
        // @ts-ignore
        let $ = cheerio.load(content, null, false)
        let once = getNodes($('once'))
        let isHandlebars = text.lastMatch(file, '.hbs')
        for (let temp of once) {
            onceOutput.push({
                name: `once: ${name}`,
                isHandlebars,
                content: getElementContent(temp)
            })
        }
        let temps = getNodes($('template'))
        if (temps.length > 0) {
            for (let temp of temps) {
                let script = null
                let templateScript = temp.attribs.script
                if (templateScript != null) {
                    script = fsx.readFileSync(`${templateDir}/${fileName}.js`).toString()
                }
                let templateName = (temp.attribs.name ? `${name}.${temp.attribs.name}` : name).replace('/', '|')
                console.log('模板:', templateName)
                templates.push({
                    name: templateName,
                    isHandlebars,
                    content: getElementContent(temp, script, templateScript)
                })
            }
        } else {
            console.log('模板:', name)
            templates.push({
                name,
                isHandlebars: false,
                content: ''
            })
        }
    })
    output = output + '\n' + onceOutput.map(e => {
        let content = e.content
        if (e.isHandlebars) {
            handlebars.compile(content)(params.renderData)
        }
        content = refReplace(content)
        if (params.variables.env === 'dev') {
            content = `
                ${commentDelimiter(e.name)}
                ${content}
            `.trim()
        }
        return content
    }).join('\n')
    // 處理模板與變數
    output = await randerTemplate(params.file, output, templates, params.variables, params.renderData, params.isHandlebars)
    // 處理語系
    let locale = JSON.parse(fsx.readFileSync(`${localDir}/${params.variables.lang}.json`).toString())
    for (let key in locale) {
        output = output.replace(new RegExp(`{${escapeStringRegexp(key)}}`, 'g'), locale[key])
    }
    // 解讀 js
    let $ = cheerio.load(output)
    let scripts = getNodes($('script'))
    for (let script of scripts) {
        let content = getElementContent(script)
        if ('scoped' in script.attribs) {
            content = `
                (function() {
                    ${content}
                })()
            `
        }
        if (content.trim()) {
            let result = await compileJs(content, {
                mini: params.mini,
                babel: params.babel
            })
            $(script).replaceWith(`<script>${result}</script>`)
        }
    }
    // 解讀 css
    let styles = getNodes($('style'))
    for (let style of styles) {
        let content = getElementContent(style)
        if (content.trim()) {
            let result = await compileCss(content, {
                mini: params.mini,
                variables: params.variables,
                autoprefixer: params.prod
            })
            $(style).replaceWith(`<style>${result}</style>`)
        }
    }
    output = $.html()
    // minify
    if (params.mini) {
        output = htmlMinifier.minify(output, {
            minifyJS: true,
            minifyCSS: true,
            useShortDoctype: true,
            preserveLineBreaks: true,
            collapseWhitespace: true,
            collapseInlineTagWhitespace: true,
            conservativeCollapse: true,
            removeComments: true
        })
    }
    // readonly
    if (params.readonly) {
        output = htmlEncryption(output, params.readonlyHost)
    }
    // hot reload
    if (params.hotReload) {
        output = htmlHotreload(output)
    }
    return params.mini ? output : pretty(output)
}
