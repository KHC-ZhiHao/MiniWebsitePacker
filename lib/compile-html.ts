import fsx from 'fs-extra'
import pretty from 'pretty'
import cheerio from 'cheerio'
import htmlMinifier from 'html-minifier'
import escapeStringRegexp from 'escape-string-regexp'
import { htmlHotreload, htmlEncryption } from './utils'
import { templateDir, localDir } from './dir'

function clearComment(file: string, text: string) {
    let lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i]
        let warns = line.match(/<!--!.*!-->/g) || []
        for (let warn of warns) {
            console.warn(`Comment ${file} (line: ${i + 1}): ${warn}`)
        }
    }
    return text.replace(/<\!---.*--->/g, '').replace(/<!--!.*!-->/g, '')
}

function parseSlot(name: string, html: string) {
    let reg = escapeStringRegexp(name)
    let text = html.replace(new RegExp(`<t-${reg}.*?>|<\/t-${reg}>`, 'gs'), '')
    let props = {}
    let propsText = html.match(new RegExp(`<t-${reg}.*?>`, 'gs'))
    if (propsText && propsText[0]) {
        let attrs = (propsText[0].match(/\s.*?".*?"/gs) || []).filter(e => !!e).map(e => e.trim())
        for (let i = 0; i < attrs.length; i++) {
            let text = attrs[i]
            let [key, value] = text.split('=')
            props[key] = value.slice(1, -1)
        }
    }
    return {
        text,
        props
    }
}

function randerVariables(html: string, variables: { [key: string]: any }) {
    for (let key in variables) {
        let text = escapeStringRegexp(`--${key}--`)
        let reg = new RegExp(text, 'g')
        html = html.replace(reg, variables[key])
    }
    return html
}

type RanderTemplates = Array<{
    name: string
    content: string
}>

function randerTemplate(html: string, templates: RanderTemplates) {
    let matched = false 
    let output = html.toString()
    // 渲染模板
    for (let { name, content } of templates) {
        let text = escapeStringRegexp(name)
        let reg = new RegExp(`<t-${text}.*?<\/t-${text}>`, 'gs')
        let matchs = output.match(reg)
        if (matchs) {
            matched = true
            for (let match of matchs) {
                let solt = parseSlot(name, match)
                let text = content.toString()
                for (let key in solt.props) {
                    text = text.replace(new RegExp(`:${escapeStringRegexp(key)}:`, 'g'), solt.props[key])
                }
                let template = text.replace(/<slot><\/slot>/g, solt.text)
                output = output.replace(match, template)
            }
        }
    }
    if (matched) {
        output = randerTemplate(html, templates)
    }
    return output
}

type compileHTMLParams = {
    file: string
    mini: boolean
    readonly: boolean
    hotReload: boolean
    variables: {
        [key: string]: any
        env: string
        lang: string
    }
}

export function compileHTML(html: string, params: compileHTMLParams): string {
    let output = html.toString()
    let templates = fsx.readdirSync(templateDir).map(file => {
        return {
            name: file.replace('.html', ''),
            content: fsx.readFileSync(`${templateDir}/${file}`).toString()
        }
    })
    // 處理模板與變數
    output = randerTemplate(output, templates)
    // 處理語系
    let locale = JSON.parse(fsx.readFileSync(`${localDir}/${params.variables.lang}.json`).toString())
    for (let key in locale) {
        output = output.replace(`{${key}}`, locale[key])
    }
    // 清除系統註解、替換環境參數
    output = clearComment(params.file, output)
    output = randerVariables(output, params.variables)
    // 解讀 css 與 js
    let $ = cheerio.load(output)
    $('script').text()
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
