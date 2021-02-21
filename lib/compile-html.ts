import fsx from 'fs-extra'
import pretty from 'pretty'
import cheerio from 'cheerio'
import htmlMinifier from 'html-minifier'
import escapeStringRegexp from 'escape-string-regexp'
import { htmlHotreload, htmlEncryption, getDir } from './utils'
import { compileCss, compileJs } from './compile'

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
}>

function randerTemplate(file: string, html: string, templates: Templates, variables: any) {
    let output = html.toString()
    // 清除系統註解、替換環境參數
    output = clearComment(file, output)
    output = randerVariables(output, variables)
    // 渲染模板
    let $ = cheerio.load(output)
    $('*').each((index, element: cheerio.TagElement) => {
        let template = templates.find(e => e.name === element.name)
        if (template) {
            let content = template.content.toString()
            for (let key in element.attribs) {
                content = content.replace(new RegExp(`-${escapeStringRegexp(key)}-`, 'g'), element.attribs[key])
            }
            let result = content.replace(/<slot>.*?<\/slot>/g, getElementContent(element))
            let text = escapeStringRegexp(element.name)
            let reg = new RegExp(`<${text}.*?<\/${text}>`, 's')
            output = output.replace(reg, result)
            output = randerTemplate(file, output, templates, variables)
        }
    })
    return output
}

type compileHTMLParams = {
    file: string
    mini: boolean
    rootDir: string
    readonly: boolean
    hotReload: boolean
    variables: {
        [key: string]: any
        env: string
        lang: string
    }
}

function getElementContent(element: cheerio.TagElement) {
    return element.children.map(e => cheerio.html(e)).join('').trim()
}

function getNodes(io: cheerio.Cheerio): cheerio.TagElement[]  {
    let nodes = []
    io.each((i, e) => nodes.push(e))
    return nodes
}

export async function compileHTML(html: string, params: compileHTMLParams): Promise<string> {
    let output = html.toString()
    let templates: Templates = []
    let { templateDir, localDir } = getDir(params.rootDir)
    fsx.readdirSync(templateDir).map(file => {
        let name = 't-' + file.replace('.html', '')
        let content = fsx.readFileSync(`${templateDir}/${file}`).toString()
        let $ = cheerio.load(content)
        let temps = getNodes($('template'))
        for (let temp of temps) {
            templates.push({
                name: temp.attribs.name ? `${name}.${temp.attribs.name}` : name,
                content: getElementContent(temp)
            })
        }
    })
    // 處理模板與變數
    output = randerTemplate(params.file, output, templates, params.variables)
    // 處理語系
    let locale = JSON.parse(fsx.readFileSync(`${localDir}/${params.variables.lang}.json`).toString())
    for (let key in locale) {
        output = output.replace(`{${key}}`, locale[key])
    }
    // 解讀 js
    let $ = cheerio.load(output)
    let scripts = getNodes($('script'))
    for (let script of scripts) {
        let content = getElementContent(script)
        if (content.trim()) {
            let result = await compileJs(content, {
                mini: params.mini
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
                variables: params.variables
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
        output = htmlEncryption(output)
    }
    // hot reload
    if (params.hotReload) {
        output = htmlHotreload(output)
    }
    return params.mini ? output : pretty(output)
}
