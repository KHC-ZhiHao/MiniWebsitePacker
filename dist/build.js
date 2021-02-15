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
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const pretty_1 = __importDefault(require("pretty"));
const imagemin_1 = __importDefault(require("imagemin"));
const imagemin_jpegtran_1 = __importDefault(require("imagemin-jpegtran"));
const imagemin_pngquant_1 = __importDefault(require("imagemin-pngquant"));
const postcss_1 = __importDefault(require("postcss"));
const autoprefixer_1 = __importDefault(require("autoprefixer"));
const html_minifier_1 = __importDefault(require("html-minifier"));
const clean_css_1 = __importDefault(require("clean-css"));
const terser_1 = require("terser");
const reader_1 = require("./reader");
const dir_1 = require("./dir");
function build(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const outputFiles = [];
        const outputEnv = Object.assign(Object.assign({}, params.config), { env: params.env, lang: params.lang });
        // 複製靜態檔案
        fs_extra_1.default.copySync(dir_1.staticDir, params.outputDir + '/static', {
            filter: (src, dest) => {
                outputFiles.push(dest);
                return true;
            }
        });
        // 複製頁面
        fs_extra_1.default.copySync(dir_1.pageDir, params.outputDir, {
            filter: (src, dest) => {
                outputFiles.push(dest);
                return true;
            }
        });
        // 編譯檔案
        for (let file of outputFiles) {
            let data = path_1.default.parse(file);
            // html
            if (data.ext === '.html') {
                console.log(`正在編譯HTML: ${data.name}${data.ext}`);
                let html = fs_extra_1.default.readFileSync(file).toString();
                if (params.env === 'dev') {
                    html += /* html */ `
                    <script>
                        setInterval(() => {
                            let oReq = new XMLHttpRequest()
                                oReq.addEventListener('load', (data) => {
                                    if (JSON.parse(oReq.response).result) {
                                        location.reload()
                                    }
                                })
                                oReq.open('POST', '/onchange')
                                oReq.send()
                        }, 1500)
                    </script>
                `;
                }
                let output = reader_1.compile(file, html, outputEnv);
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
                if (params.readonly) {
                    let id = 'key--' + Buffer.from(Date.now().toString()).toString('base64');
                    let base64 = Buffer.from(output, 'utf8').toString('base64');
                    let doc = `
                    (function() {
                        var a = \`${unescape(encodeURIComponent(base64))}\`
                        var b = __c__(atob(a))
                        __q__.write(decodeURIComponent(b))
                    })()
                `;
                    output = /* html */ `
                    <script>
                        (function (a, e) {
                            eval(atob(e(a)))
                            function endebug(off, code) {
                                if (!off) {
                                    !function (e) {
                                        function n(e) {
                                            function n() {
                                                return u
                                            }
                                            function o() {
                                                window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized ? t("on") : (a = "off", console.log(d), console.clear(), t(a))
                                            }
                                            function t(e) {
                                                u !== e && (u = e, "function" == typeof c.onchange && c.onchange(e))
                                            }
                                            function r() {
                                                l || (l = !0, window.removeEventListener("resize", o), clearInterval(f))
                                            }
                                            "function" == typeof e && (e = {
                                                onchange: e
                                            });
                                            var i = (e = e || {}).delay || 500,
                                                c = {};
                                            c.onchange = e.onchange;
                                            var a, d = new Image;
                                            d.__defineGetter__("id", function () {
                                                a = "on"
                                            });
                                            var u = "unknown";
                                            c.getStatus = n;
                                            var f = setInterval(o, i);
                                            window.addEventListener("resize", o);
                                            var l;
                                            return c.free = r, c
                                        }
                                        var o = o || {};
                                        o.create = n, "function" == typeof define ? (define.amd || define.cmd) && define(function () {
                                            return o
                                        }) : "undefined" != typeof module && module.exports ? module.exports = o : window.jdetects = o
                                    }(), jdetects.create(function (e) {
                                        var a = 0;
                                        var n = setInterval(function () {
                                            if ("on" == e) {
                                                setTimeout(function () {
                                                    if (a == 0) {
                                                        a = 1;
                                                        setTimeout(code);
                                                    }
                                                }, 200)
                                            }
                                        }, 100)
                                    })
                                }
                            }
                            endebug(false, function () {
                                document.write('Readonly');
                            });
                        })(\`${id + Buffer.from(doc, 'utf8').toString('base64')}\`, (a) => {
                            __c__ = window['escape']
                            __q__ = window['document']
                            return a.replace('${id}', '')
                        })
                    </script>
                `;
                }
                if (params.mini) {
                    fs_extra_1.default.writeFileSync(file, output);
                }
                else {
                    fs_extra_1.default.writeFileSync(file, pretty_1.default(output));
                }
            }
            // image
            if (data.ext === '.png' || data.ext === '.jpg') {
                console.log(`正在壓縮: ${data.name}${data.ext}`);
                let buffer = fs_extra_1.default.readFileSync(file);
                let result = yield imagemin_1.default.buffer(buffer, {
                    plugins: [
                        imagemin_jpegtran_1.default(),
                        imagemin_pngquant_1.default({
                            quality: [0.6, 0.8]
                        })
                    ]
                });
                fs_extra_1.default.writeFileSync(file, result);
            }
            // js
            if (data.ext === '.js') {
                console.log(`正在編譯JS: ${data.name}${data.ext}`);
                // let babel = require('@babel/core')
                let code = fs_extra_1.default.readFileSync(file).toString();
                let output = code;
                // let output: string = await new Promise((resolve, reject) => {
                //     babel.transform(code, {
                //         presets: [
                //             [
                //                 '@babel/preset-env'
                //             ]
                //         ]
                //     }, (err, result) => {
                //         if (err) {
                //             reject(err)
                //         } else {
                //             resolve(result.code)
                //         }
                //     })
                // })
                if (params.mini) {
                    fs_extra_1.default.writeFileSync(file, (yield terser_1.minify(output)).code);
                }
                else {
                    fs_extra_1.default.writeFileSync(file, output);
                }
            }
            // css
            if (data.ext === '.css') {
                console.log(`正在編譯CSS: ${data.name}${data.ext}`);
                let post = postcss_1.default([
                    autoprefixer_1.default({
                        overrideBrowserslist: ['last 2 version', '> 1%', 'IE 10']
                    })
                ]);
                let css = reader_1.compileCss(fs_extra_1.default.readFileSync(file).toString(), outputEnv);
                let output = css;
                let result = yield post.process(css, { from: undefined });
                if (result.css) {
                    output = result.css;
                }
                if (params.mini) {
                    fs_extra_1.default.writeFileSync(file, (new clean_css_1.default().minify(output).styles));
                }
                else {
                    fs_extra_1.default.writeFileSync(file, output);
                }
            }
        }
    });
}
function default_1(params) {
    return __awaiter(this, void 0, void 0, function* () {
        // 刪除所有編譯過後的檔案
        if (fs_extra_1.default.existsSync(params.outputDir)) {
            fs_extra_1.default.removeSync(params.outputDir);
        }
        // 獲取所有語系檔案
        let langs = fs_extra_1.default.readdirSync(dir_1.localDir).map(s => s.replace('.json', ''));
        for (let lang of langs) {
            if (lang === params.lang) {
                yield build(params);
            }
            else {
                yield build(Object.assign(Object.assign({}, params), { outputDir: `${params.outputDir}/${lang}` }));
            }
        }
        console.log('Build Success.');
    });
}
exports.default = default_1;
