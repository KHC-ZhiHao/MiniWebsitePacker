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
const shortid_1 = __importDefault(require("shortid"));
const escape_string_regexp_1 = __importDefault(require("escape-string-regexp"));
const handlebars_1 = __importDefault(require("handlebars"));
const power_helper_1 = require("power-helper");
const compile_1 = require("./compile");
const utils_1 = require("./utils");
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
        let text = (0, escape_string_regexp_1.default)(`--${key}--`);
        let reg = new RegExp(text, 'g');
        html = html.replace(reg, variables[key]);
    }
    return html;
}
function refReplace(content) {
    // @ts-ignore
    let $ = cheerio_1.default.load(content, null, false);
    $('*').each((index, element) => {
        var _a;
        let ref = (_a = element.attribs) === null || _a === void 0 ? void 0 : _a.ref;
        if (ref) {
            let uid = `${ref}-${(0, shortid_1.default)()}`;
            content = content.replace(new RegExp((0, escape_string_regexp_1.default)(`ref="${ref}"`), 'g'), `id="${uid}"`);
            content = content.replace(new RegExp((0, escape_string_regexp_1.default)(`ref--${ref}`), 'g'), uid);
        }
    });
    return content;
}
function randerTemplate(file, html, templates, variables, renderData, isHandlebars) {
    return __awaiter(this, void 0, void 0, function* () {
        let output = html.toString();
        while (true) {
            // 清除系統註解、替換環境參數
            output = clearComment(file, output);
            output = randerVariables(output, variables);
            // 渲染模板
            // @ts-ignore
            let $ = cheerio_1.default.load(output, null, false);
            // js 渲染
            let scripts = getNodes($('script'));
            for (let script of scripts) {
                let content = getElementContent(script);
                if ('render' in script.attribs) {
                    let html = yield eval(`(async function() {
                    ${content}
                })()`);
                    $(script).replaceWith(html);
                }
            }
            output = $.html();
            if (isHandlebars) {
                output = handlebars_1.default.compile(output)(Object.assign(Object.assign({}, renderData), { vars: variables, props: {} }));
            }
            // 渲染模板
            let elements = [];
            $('*').each((index, element) => {
                elements.push(element);
            });
            let matched = false;
            for (let element of elements) {
                let template = templates.find(e => e.name === element.name);
                if (template) {
                    let content = template.content.toString();
                    if (template.isHandlebars) {
                        content = handlebars_1.default.compile(content)(Object.assign(Object.assign({}, renderData), { vars: variables, props: element.attribs }));
                    }
                    for (let key in element.attribs) {
                        content = content.replace(new RegExp(`-${(0, escape_string_regexp_1.default)(key)}-`, 'g'), element.attribs[key]);
                    }
                    content = refReplace(content);
                    let result = content.replace(/<slot>.*?<\/slot>/g, getElementContent(element));
                    if (variables.env === 'dev') {
                        let vars = Object.entries(element.attribs);
                        result = `
                        ${(0, utils_1.commentDelimiter)(vars.length ? template.name + `:${vars.map(e => `${e[0]}=${e[1]}`).join()}` : template.name)}
                        ${result}
                    `.trim();
                    }
                    let text = (0, escape_string_regexp_1.default)(element.name);
                    let reg = new RegExp(`<${text}.*?<\/${text}>`, 's');
                    output = output.replace(reg, result);
                    matched = true;
                    break;
                }
            }
            if (matched === false) {
                break;
            }
        }
        return output;
    });
}
function getElementContent(element, script, scriptParams) {
    let html = element.children.map(e => cheerio_1.default.html(e)).join('').trim();
    if (script) {
        html += `
            <script>
                (function(args) {
                    ${script}
                })("${scriptParams}")
            </script>
        `;
    }
    return html.trim();
}
function getNodes(io) {
    let nodes = [];
    io.each((i, e) => nodes.push(e));
    return nodes;
}
function getAllFiles(root, child) {
    let output = [];
    let rootPath = root + (child ? '/' + child : '');
    let nextPath = child ? child + '/' : '';
    let files = fs_extra_1.default.readdirSync(rootPath);
    for (let file of files) {
        if (fs_extra_1.default.statSync(rootPath + '/' + file).isDirectory()) {
            output = output.concat(getAllFiles(root, nextPath + file));
        }
        else {
            output.push(`${nextPath}${file}`);
        }
    }
    return output;
}
function compileHTML(html, params) {
    return __awaiter(this, void 0, void 0, function* () {
        // @ts-ignore
        global.mwp = {
            variables: params.variables,
            renderData: params.renderData,
            handlebars: handlebars_1.default
        };
        let output = html.toString();
        let onceOutput = [];
        let templates = [];
        let { templateDir, localDir } = (0, utils_1.getDir)(params.rootDir);
        getAllFiles(templateDir).map((file) => {
            let fileName = file.replace('.html', '').replace('.hbs', '');
            let name = 't-' + fileName;
            let content = fs_extra_1.default.readFileSync(`${templateDir}/${file}`).toString();
            // @ts-ignore
            let $ = cheerio_1.default.load(content, null, false);
            let once = getNodes($('once'));
            let isHandlebars = power_helper_1.text.lastMatch(file, '.hbs');
            for (let temp of once) {
                onceOutput.push({
                    name: `once: ${name}`,
                    isHandlebars,
                    content: getElementContent(temp)
                });
            }
            let temps = getNodes($('template'));
            if (temps.length > 0) {
                for (let temp of temps) {
                    let script = null;
                    let templateScript = temp.attribs.script;
                    if (templateScript != null) {
                        script = fs_extra_1.default.readFileSync(`${templateDir}/${fileName}.js`).toString();
                    }
                    let templateName = (temp.attribs.name ? `${name}.${temp.attribs.name}` : name).replace('/', '|');
                    console.log('模板:', templateName);
                    templates.push({
                        name: templateName,
                        isHandlebars,
                        content: getElementContent(temp, script, templateScript)
                    });
                }
            }
            else {
                console.log('模板:', name);
                templates.push({
                    name,
                    isHandlebars: false,
                    content: ''
                });
            }
        });
        output = output + '\n' + onceOutput.map(e => {
            let content = e.content;
            if (e.isHandlebars) {
                handlebars_1.default.compile(content)(Object.assign(Object.assign({}, params.renderData), { vars: params.variables, props: {} }));
            }
            content = refReplace(content);
            if (params.variables.env === 'dev') {
                content = `
                ${(0, utils_1.commentDelimiter)(e.name)}
                ${content}
            `.trim();
            }
            return content;
        }).join('\n');
        // 處理模板與變數
        output = yield randerTemplate(params.file, output, templates, params.variables, params.renderData, params.isHandlebars);
        // 處理語系
        let locale = JSON.parse(fs_extra_1.default.readFileSync(`${localDir}/${params.variables.lang}.json`).toString());
        for (let key in locale) {
            output = output.replace(new RegExp(`{${(0, escape_string_regexp_1.default)(key)}}`, 'g'), locale[key]);
        }
        // 解讀 js
        let $ = cheerio_1.default.load(output);
        let scripts = getNodes($('script'));
        for (let script of scripts) {
            let content = getElementContent(script);
            if ('scoped' in script.attribs) {
                content = `
                (function() {
                    ${content}
                })()
            `;
            }
            if (content.trim()) {
                let result = yield (0, compile_1.compileJs)(content, {
                    mini: params.mini,
                    babel: params.babel
                });
                $(script).replaceWith(`<script>${result}</script>`);
            }
        }
        // 解讀 css
        let styles = getNodes($('style'));
        for (let style of styles) {
            let content = getElementContent(style);
            if (content.trim()) {
                let result = yield (0, compile_1.compileCss)(content, {
                    mini: params.mini,
                    variables: params.variables,
                    autoprefixer: params.prod
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
            output = (0, utils_1.htmlEncryption)(output, params.readonlyHost);
        }
        // hot reload
        if (params.hotReload) {
            output = (0, utils_1.htmlHotreload)(output);
        }
        return params.mini ? output : (0, pretty_1.default)(output);
    });
}
exports.compileHTML = compileHTML;
