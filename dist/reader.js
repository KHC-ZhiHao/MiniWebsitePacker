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
    // 處理模板
    let output = randerTemplate(html, templates);
    // 處理語系
    let locale = JSON.parse(fs_extra_1.default.readFileSync(`${localDir}/${lang}.json`).toString());
    for (let key in locale) {
        output = output.replace(`{${key}}`, locale[key]);
    }
    return output;
}
exports.compile = compile;
function randerTemplate(html, templates) {
    let output = html;
    let matched = false;
    for (let { name, content } of templates) {
        let reg = new RegExp(`<t-${name}>.*?<\/t-${name}>`, 'gs');
        let matchs = output.match(reg);
        if (matchs) {
            matched = true;
            for (let match of matchs) {
                let solt = match.replace(new RegExp(`<t-${name}>|<\/t-${name}>`, 'g'), '');
                let template = content.replace('<!-- SLOT -->', solt);
                output = output.replace(match, template);
            }
        }
    }
    if (matched) {
        output = randerTemplate(output, templates);
    }
    return output;
}
