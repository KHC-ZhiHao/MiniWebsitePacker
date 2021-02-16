"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlEncryption = exports.htmlHotreload = void 0;
exports.htmlHotreload = (html) => {
    return html + `
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
};
exports.htmlEncryption = (html) => {
    let id = Buffer.from(Date.now().toString()).toString('base64');
    let base64 = Buffer.from(html, 'utf8').toString('base64');
    let doc = `
        (function() {
            var a = \`${unescape(encodeURIComponent(base64))}\`
            var b = __c__(atob(a))
            __q__.write(decodeURIComponent(b))
        })()
    `;
    return `
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
};
