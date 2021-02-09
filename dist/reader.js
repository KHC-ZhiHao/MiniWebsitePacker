"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compile = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const localDir = './locales';
const templateDir = './templates';
function compile(html, lang) {
    let templates = fs_extra_1.default.readdirSync(templateDir).map(file => {
        return {
            name: file.replace('.html', ''),
            content: fs_extra_1.default.readFileSync(`${templateDir}/${file}`).toString()
        };
    });
    // 替換環境參數
    let origin = randerEnv(html, {
        lang
    });
    // 處理模板與變數
    let output = randerTemplate(origin, templates);
    // 處理語系
    let locale = JSON.parse(fs_extra_1.default.readFileSync(`${localDir}/${lang}.json`).toString());
    for (let key in locale) {
        output = output.replace(`{${key}}`, locale[key]);
    }
    return output;
}
exports.compile = compile;
function parseVar(text, prop = {}) {
    let output = text.trim();
    if (output.slice(0, 6) === '<prop>') {
        output = output.replace(/<prop>/i, '');
        let [key, ...values] = output.split('<\/prop>')[0].split(':');
        output = output.replace(/.*<\/prop>/i, '');
        prop[key] = values.join(':');
        return parseVar(output, prop);
    }
    return {
        text: output,
        prop
    };
}
function parseSlot(name, html) {
    let text = html.replace(new RegExp(`<t-${name}>|<\/t-${name}>`, 'g'), '');
    return parseVar(text);
}
function randerEnv(html, params) {
    return html.replace('$.lang', params.lang);
}
function randerTemplate(html, templates) {
    let output = html;
    let matched = false;
    for (let { name, content } of templates) {
        let reg = new RegExp(`<t-${name}>.*?<\/t-${name}>`, 'gs');
        let matchs = output.match(reg);
        if (matchs) {
            matched = true;
            for (let match of matchs) {
                let solt = parseSlot(name, match);
                for (let key in solt.prop) {
                    content = content.replace(new RegExp(`:${key}:`, 'g'), solt.prop[key]);
                }
                let template = content.replace('<!-- SLOT -->', solt.text);
                output = output.replace(match, template);
            }
        }
    }
    if (matched) {
        output = randerTemplate(output, templates);
    }
    return output;
}
