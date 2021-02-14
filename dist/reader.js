"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compile = exports.compileCss = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const dir_1 = require("./dir");
function compileCss(css, params) {
    return randerEnv(css, params);
}
exports.compileCss = compileCss;
function compile(file, html, params) {
    let templates = fs_extra_1.default.readdirSync(dir_1.templateDir).map(file => {
        return {
            name: file.replace('.html', ''),
            content: fs_extra_1.default.readFileSync(`${dir_1.templateDir}/${file}`).toString()
        };
    });
    // 處理模板與變數
    html = randerTemplate(file, html, templates, params);
    // 處理語系
    let locale = JSON.parse(fs_extra_1.default.readFileSync(`${dir_1.localDir}/${params.lang}.json`).toString());
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
    let id = {
        key: '',
        tag: '',
        value: ''
    };
    let props = {};
    let propsText = html.match(new RegExp(`<t-${name}.*?>`, 'gs'));
    if (propsText && propsText[0]) {
        let attrs = (propsText[0].match(/\s.*?".*?"/gs) || []).filter(e => !!e).map(e => e.trim());
        for (let i = 0; i < attrs.length; i++) {
            let text = attrs[i];
            let [key, value] = text.split('=');
            if (key[0] !== '#') {
                props[key] = value.slice(1, -1);
            }
            else {
                id.key = key;
                id.tag = value.slice(1, -1);
                id.value = 'sys-' + Math.floor(Math.random() * 10000);
            }
        }
    }
    return {
        id,
        text,
        props
    };
}
function randerEnv(html, params) {
    for (let key in params) {
        let reg = new RegExp(`\-\-${key}`, 'g');
        html = html.replace(reg, params[key]);
    }
    return html;
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
                let text = content.toString();
                console.log(solt);
                for (let key in solt.props) {
                    text = text.replace(new RegExp(`:${key}:`, 'g'), solt.props[key]);
                }
                if (solt.id.key) {
                    console.log(text);
                    text = text.replace(new RegExp(`#${solt.id.key}`, 'g'), solt.id.value);
                }
                let template = text.replace(/<slot><\/slot>/g, solt.text);
                if (solt.id.tag) {
                    output = output.replace(match, `<${solt.id.tag} id="${solt.id.value}">${template}</${solt.id.tag}>`);
                }
                else {
                    output = output.replace(match, template);
                }
            }
        }
    }
    if (matched) {
        output = randerTemplate(file, output, templates, params);
    }
    return output;
}
