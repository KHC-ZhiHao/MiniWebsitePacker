import fsx from 'fs-extra'

const localDir = './locales'
const templateDir = './templates'

export function compile(html: string, lang: string): string {
    let templates = fsx.readdirSync(templateDir).map(file => {
        return {
            name: file.replace('.html', ''),
            content: fsx.readFileSync(`${templateDir}/${file}`).toString()
        }
    })
    // 處理模板與變數
    let output = randerTemplate(html, templates)
    // 處理語系
    let locale = JSON.parse(fsx.readFileSync(`${localDir}/${lang}.json`).toString())
    for (let key in locale) {
        output = output.replace(`{${key}}`, locale[key])
    }
    return output
}

function parseVar(text: string, prop: { [key: string]: string } = {}): {
    text: string
    prop: { [key: string]: string }
} {
    let output = text.trim()
    if (output.slice(0, 10) === '<prop>') {
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

function randerTemplate(html: string, templates: Array<{ name: string, content: string }>) {
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
                    console.log(content)
                }
                let template = content.replace('<!-- SLOT -->', solt.text)
                output = output.replace(match, template)
            }
        }
    }
    if (matched) {
        output = randerTemplate(output, templates)
    }
    return output
}
