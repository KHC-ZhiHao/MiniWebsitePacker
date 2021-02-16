import fsx from 'fs-extra'
import escapeStringRegexp from 'escape-string-regexp'
import { templateDir, localDir } from './dir'

type Variables = {
    [key: string]: any
    env: string
    lang: string
}

export function compileCss(css: string, variables: Variables) {
    return randerEnv(css, variables)
}

export function compile(file: string, html: string, variables: Variables): string {
    let templates = fsx.readdirSync(templateDir).map(file => {
        return {
            name: file.replace('.html', ''),
            content: fsx.readFileSync(`${templateDir}/${file}`).toString()
        }
    })
    // 處理模板與變數
    html = randerTemplate(file, html, templates, variables)
    // 處理語系
    let locale = JSON.parse(fsx.readFileSync(`${localDir}/${variables.lang}.json`).toString())
    for (let key in locale) {
        html = html.replace(`{${key}}`, locale[key])
    }
    return html
}

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

function randerEnv(html: string, variables: Variables) {
    for (let key in variables) {
        let text = escapeStringRegexp(`--${key}`)
        let reg = new RegExp(text, 'g')
        html = html.replace(reg, variables[key])
    }
    return html
}

function randerTemplate(file: string, html: string, templates: Array<{ name: string, content: string }>, variables: Variables) {
    // 清除系統註解
    html = clearComment(file, html)
    // 替換環境參數
    html = randerEnv(html, variables)
    let output = html
    let matched = false
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
        output = randerTemplate(file, output, templates, variables)
    }
    return output
}
