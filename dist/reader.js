"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compile = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const localDir = './locales';
const templateDir = './templates';
function compile(file, html, params) {
    let templates = fs_extra_1.default.readdirSync(templateDir).map(file => {
        return {
            name: file.replace('.html', ''),
            content: fs_extra_1.default.readFileSync(`${templateDir}/${file}`).toString()
        };
    });
    // 處理模板與變數
    html = randerTemplate(file, html, templates, params);
    // 處理語系
    let locale = JSON.parse(fs_extra_1.default.readFileSync(`${localDir}/${params.lang}.json`).toString());
    for (let key in locale) {
        html = html.replace(`{${key}}`, locale[key]);
    }
    return html;
}
exports.compile = compile;
function clearComment(file, text) {
    let lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let warns = line.match(/<!--!.*!-->/g) || [];
        for (let warn of warns) {
            console.warn(`Comment ${file} (line: ${i + 1}): ${warn}`);
        }
    }
    return text.replace(/<\!---.*--->/g, '').replace(/<!--!.*!-->/g, '');
}
function parseSlot(name, html) {
    let text = html.replace(new RegExp(`<t-${name}.*?>|<\/t-${name}>`, 'gs'), '');
    let props = {};
    let propsText = html.match(new RegExp(`<t-${name}.*?>`, 'gs'));
    if (propsText && propsText[0]) {
        let attrs = (propsText[0].match(/\s.*?".*?"/gs) || []).filter(e => !!e).map(e => e.trim());
        for (let i = 0; i < attrs.length; i++) {
            let text = attrs[i];
            let [key, value] = text.split('=');
            props[key] = value.slice(1, -1);
        }
    }
    return {
        text,
        props
    };
}
function randerEnv(html, params) {
    return html.replace(/\$\{lang\}/, params.lang).replace(/\$\{env\}/, params.env);
}
function randerTemplate(file, html, templates, params) {
    // 清除系統註解
    html = clearComment(file, html);
    // 替換環境參數
    html = randerEnv(html, params);
    let output = html;
    let matched = false;
    for (let { name, content } of templates) {
        let reg = new RegExp(`<t-${name}.*?<\/t-${name}>`, 'gs');
        let matchs = output.match(reg);
        if (matchs) {
            matched = true;
            for (let match of matchs) {
                let solt = parseSlot(name, match);
                for (let key in solt.props) {
                    content = content.replace(new RegExp(`:${key}:`, 'g'), solt.props[key]);
                }
                let template = content.replace(/<slot><\/slot>/g, solt.text);
                output = output.replace(match, template);
            }
        }
    }
    if (matched) {
        output = randerTemplate(file, output, templates, params);
    }
    return output;
}
