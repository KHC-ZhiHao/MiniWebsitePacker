"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileHTML = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const pretty_1 = __importDefault(require("pretty"));
const cheerio_1 = __importDefault(require("cheerio"));
const html_minifier_1 = __importDefault(require("html-minifier"));
const escape_string_regexp_1 = __importDefault(require("escape-string-regexp"));
const utils_1 = require("./utils");
const compile_1 = require("./compile");
function clearComment(file, text) {
    let lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let warns = line.match(/<!--!.*?!-->/g) || [];
        for (let warn of warns) {
            console.warn(`Comment ${file} (line: ${i + 1}): ${warn}`);
        }
    }
    return text.replace(/<\!---.*?--->/g, '').replace(/<!--!.*?!-->/g, '');
}
function randerVariables(html, variables) {
    for (let key in variables) {
        let text = escape_string_regexp_1.default(`--${key}--`);
        let reg = new RegExp(text, 'g');
        html = html.replace(reg, variables[key]);
    }
    return html;
}
function randerTemplate(file, html, templates, variables) {
    let matched = false;
    let output = html.toString();
    // 清除系統註解、替換環境參數
    output = clearComment(file, output);
    output = randerVariables(output, variables);
    // 渲染模板
    let $ = cheerio_1.default.load(output);
    $('*').each((index, element) => {
        let template = templates.find(e => e.name === element.name);
        if (template) {
            let content = template.content.toString();
            for (let key in element.attribs) {
                content = content.replace(new RegExp(`-${escape_string_regexp_1.default(key)}-`, 'g'), element.attribs[key]);
            }
            let result = content.replace(/<slot>.*?<\/slot>/g, getElementContent(element));
            let text = escape_string_regexp_1.default(element.name);
            let reg = new RegExp(`<${text}.*?<\/${text}>`, 's');
            output = output.replace(reg, result);
            matched = true;
        }
    });
    if (matched) {
        output = randerTemplate(file, output, templates, variables);
    }
    return output;
}
function getElementContent(element) {
    return element.children.map(e => cheerio_1.default.html(e)).join('').trim();
}
function getNodes(io) {
    let nodes = [];
    io.each((i, e) => nodes.push(e));
    return nodes;
}
function compileHTML(html, params) {
    return __awaiter(this, void 0, void 0, function* () {
        let output = html.toString();
        let templates = [];
        let { templateDir, localDir } = utils_1.getDir(params.rootDir);
        fs_extra_1.default.readdirSync(templateDir).map(file => {
            let name = 't-' + file.replace('.html', '');
            let content = fs_extra_1.default.readFileSync(`${templateDir}/${file}`).toString();
            let $ = cheerio_1.default.load(content);
            let temps = getNodes($('template'));
            for (let temp of temps) {
                templates.push({
                    name: temp.attribs.name ? `${name}.${temp.attribs.name}` : name,
                    content: getElementContent(temp)
                });
            }
        });
        // 處理模板與變數
        output = randerTemplate(params.file, output, templates, params.variables);
        // 處理語系
        let locale = JSON.parse(fs_extra_1.default.readFileSync(`${localDir}/${params.variables.lang}.json`).toString());
        for (let key in locale) {
            output = output.replace(`{${key}}`, locale[key]);
        }
        // 解讀 js
        let $ = cheerio_1.default.load(output);
        let scripts = getNodes($('script'));
        for (let script of scripts) {
            let content = getElementContent(script);
            if (content.trim()) {
                let result = yield compile_1.compileJs(content, {
                    mini: params.mini
                });
                $(script).replaceWith(`<script>${result}</script>`);
            }
        }
        // 解讀 css
        let styles = getNodes($('style'));
        for (let style of styles) {
            let content = getElementContent(style);
            if (content.trim()) {
                let result = yield compile_1.compileCss(content, {
                    mini: params.mini,
                    variables: params.variables
                });
                $(style).replaceWith(`<style>${result}</style>`);
            }
        }
        output = $.html();
        // minify
        if (params.mini) {
            output = html_minifier_1.default.minify(output, {
                minifyJS: true,
                minifyCSS: true,
                useShortDoctype: true,
                preserveLineBreaks: true,
                collapseWhitespace: true,
                collapseInlineTagWhitespace: true,
                conservativeCollapse: true,
                removeComments: true
            });
        }
        // readonly
        if (params.readonly) {
            output = utils_1.htmlEncryption(output);
        }
        // hot reload
        if (params.hotReload) {
            output = utils_1.htmlHotreload(output);
        }
        return params.mini ? output : pretty_1.default(output);
    });
}
exports.compileHTML = compileHTML;
