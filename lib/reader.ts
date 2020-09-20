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
    // 處理模板
    let output = randerTemplate(html, templates)
    // 處理語系
    let locale = JSON.parse(fsx.readFileSync(`${localDir}/${lang}.json`).toString())
    for (let key in locale) {
        output = output.replace(`{${key}}`, locale[key])
    }
    return output
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
                let solt = match.replace(new RegExp(`<t-${name}>|<\/t-${name}>`, 'g'), '')
                let template = content.replace('<!-- SLOT -->', solt)
                output = output.replace(match, template)
            }
        }
    }
    if (matched) {
        output = randerTemplate(output, templates)
    }
    return output
}
