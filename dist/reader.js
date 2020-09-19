"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compile = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const config_1 = __importDefault(require("./config"));
const localDir = './locales';
const templateDir = './templates';
function compile(html) {
    let output = html.replace(/\r\n|\n/g, '');
    let templates = fs_extra_1.default.readdirSync(templateDir).map(file => {
        return {
            name: file.replace('.html', ''),
            content: fs_extra_1.default.readFileSync(`${templateDir}/${file}`).toString()
        };
    });
    // 處理模板
    for (let { name, content } of templates) {
        let reg = new RegExp(`<t-${name}>.*?<\/t-${name}>`, 'g');
        let matchs = output.match(reg);
        if (matchs) {
            for (let match of matchs) {
                let solt = match.replace(new RegExp(`<t-${name}>|<\/t-${name}>`, 'g'), '');
                let template = content.replace('<!-- SLOT -->', solt);
                output = output.replace(match, template).replace(/\r\n|\n/g, '');
            }
        }
    }
    // 處理語系
    let locale = JSON.parse(fs_extra_1.default.readFileSync(`${localDir}/${config_1.default.locale}.json`).toString());
    for (let key in locale) {
        output = output.replace(`{${key}}`, locale[key]);
    }
    return output;
}
exports.compile = compile;
