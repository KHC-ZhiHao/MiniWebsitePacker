import fsx from 'fs-extra'

const localDir = './locales'
const templateDir = './templates'

type EnvParams = {
    env: string
    lang: string
}

export function compile(file: string, html: string, params: EnvParams): string {
    let templates = fsx.readdirSync(templateDir).map(file => {
        return {
            name: file.replace('.html', ''),
            content: fsx.readFileSync(`${templateDir}/${file}`).toString()
        }
    })
    // 處理模板與變數
    html = randerTemplate(file, html, templates, params)
    // 處理語系
    let locale = JSON.parse(fsx.readFileSync(`${localDir}/${params.lang}.json`).toString())
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

function parseVar(text: string, prop: { [key: string]: string } = {}): {
    text: string
    prop: { [key: string]: string }
} {
    let output = text.trim()
    if (output.slice(0, 6) === '<prop>') {
        output = output.replace(/<prop>/i, '')
        let [key, ...values] = output.split('<\/prop>')[0].split(':')
        output = output.replace(/.*<\/prop>/i, '')
        prop[key] = values.join(':')
        return parseVar(output, prop)
    }
    return {
        text: output,
        prop
    }
}

function parseSlot(name: string, html: string) {
    let text = html.replace(new RegExp(`<t-${name}>|<\/t-${name}>`, 'g'), '')
    return parseVar(text)
}

function randerEnv(html: string, params: EnvParams) {
    return html.replace(/\$\{lang\}/, params.lang).replace(/\$\{env\}/, params.env)
}

function randerTemplate(file: string, html: string, templates: Array<{ name: string, content: string }>, params: EnvParams) {
    // 清除系統註解
    html = clearComment(file, html)
    // 替換環境參數
    html = randerEnv(html, params)
    let output = html
    let matched = false
    for (let { name, content } of templates) {
        let reg = new RegExp(`<t-${name}>.*?<\/t-${name}>`, 'gs')
        let matchs = output.match(reg)
        if (matchs) {
            matched = true
            for (let match of matchs) {
                let solt = parseSlot(name, match)
                for (let key in solt.prop) {
                    content = content.replace(new RegExp(`:${key}:`, 'g'), solt.prop[key])
                }
                let template = content.replace('<!-- SLOT -->', solt.text)
                output = output.replace(match, template)
            }
        }
    }
    if (matched) {
        output = randerTemplate(file, output, templates, params)
    }
    return output
}
