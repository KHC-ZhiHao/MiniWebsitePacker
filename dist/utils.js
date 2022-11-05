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
exports.htmlEncryption = exports.htmlHotreload = exports.getDir = exports.commentDelimiter = exports.readConfig = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const handlebars_1 = __importDefault(require("handlebars"));
const power_helper_1 = require("power-helper");
const readConfig = (path) => __awaiter(void 0, void 0, void 0, function* () {
    let context = {
        handlebars: handlebars_1.default
    };
    if (power_helper_1.text.lastMatch(path, '.json')) {
        return JSON.parse(fs_extra_1.default.readFileSync(path).toString());
    }
    else {
        return yield require(`../../../${path}`)(context);
    }
});
exports.readConfig = readConfig;
const commentDelimiter = (comment) => {
    return `
        <!--|||-->
        <!-- ${comment} -->
        <!--|||-->
    `.trim();
};
exports.commentDelimiter = commentDelimiter;
const getDir = (root) => {
    return {
        rootDir: root,
        localDir: `${root}/locales`,
        templateDir: `${root}/templates`,
        pageDir: `${root}/pages`,
        staticDir: `${root}/static`
    };
};
exports.getDir = getDir;
const htmlHotreload = (html) => {
    return html + `
        ${(0, exports.commentDelimiter)('Hot Reload')}
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
            }, 1000)
        </script>
    `;
};
exports.htmlHotreload = htmlHotreload;
const htmlEncryption = (html, readonlyHost) => {
    let id = Buffer.from(Date.now().toString()).toString('base64');
    let base64 = Buffer.from(html, 'utf8').toString('base64');
    let doc = `
        (function() {
            var a = \`${unescape(encodeURIComponent(base64))}\`
            var b = __c__(atob(a))
            var g = \`${readonlyHost}\`
            __q__.write(decodeURIComponent(b))
            setInterval(() => {
                if (g && !location.host.match(g)) {
                    document.write('');
                }
            }, 100)
        })()
    `;
    return `
        <script>
            (function (a, e) {
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
                eval(atob(e(a)));
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
};
exports.htmlEncryption = htmlEncryption;
