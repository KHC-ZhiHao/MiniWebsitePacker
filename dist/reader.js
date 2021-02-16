"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compile = exports.compileCss = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const escape_string_regexp_1 = __importDefault(require("escape-string-regexp"));
const dir_1 = require("./dir");
function compileCss(css, variables) {
    return randerEnv(css, variables);
}
exports.compileCss = compileCss;
function compile(file, html, variables) {
    let templates = fs_extra_1.default.readdirSync(dir_1.templateDir).map(file => {
        return {
            name: file.replace('.html', ''),
            content: fs_extra_1.default.readFileSync(`${dir_1.templateDir}/${file}`).toString()
        };
    });
    // 處理模板與變數
    html = randerTemplate(file, html, templates, variables);
    // 處理語系
    let locale = JSON.parse(fs_extra_1.default.readFileSync(`${dir_1.localDir}/${variables.lang}.json`).toString());
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
    let reg = escape_string_regexp_1.default(name);
    let text = html.replace(new RegExp(`<t-${reg}.*?>|<\/t-${reg}>`, 'gs'), '');
    let props = {};
    let propsText = html.match(new RegExp(`<t-${reg}.*?>`, 'gs'));
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
function randerEnv(html, variables) {
    for (let key in variables) {
        let text = escape_string_regexp_1.default(`--${key}`);
        let reg = new RegExp(text, 'g');
        html = html.replace(reg, variables[key]);
    }
    return html;
}
function randerTemplate(file, html, templates, variables) {
    // 清除系統註解
    html = clearComment(file, html);
    // 替換環境參數
    html = randerEnv(html, variables);
    let output = html;
    let matched = false;
    for (let { name, content } of templates) {
        let text = escape_string_regexp_1.default(name);
        let reg = new RegExp(`<t-${text}.*?<\/t-${text}>`, 'gs');
        let matchs = output.match(reg);
        if (matchs) {
            matched = true;
            for (let match of matchs) {
                let solt = parseSlot(name, match);
                let text = content.toString();
                for (let key in solt.props) {
                    text = text.replace(new RegExp(`:${escape_string_regexp_1.default(key)}:`, 'g'), solt.props[key]);
                }
                let template = text.replace(/<slot><\/slot>/g, solt.text);
                output = output.replace(match, template);
            }
        }
    }
    if (matched) {
        output = randerTemplate(file, output, templates, variables);
    }
    return output;
}
