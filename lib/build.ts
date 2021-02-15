import fsx from 'fs-extra'
import path from 'path'
import pretty from 'pretty'
import imagemin from 'imagemin'
import imageminJpegtran from 'imagemin-jpegtran'
import imageminPngquant from 'imagemin-pngquant'
import postcss from 'postcss'
import autoprefixer from 'autoprefixer'
import htmlMinifier from 'html-minifier'
import CleanCss from 'clean-css'
import { minify } from "terser"
import { compile, compileCss } from './reader'
import { staticDir, pageDir, localDir } from './dir'

type Params = {
    env: 'prod' | 'dev'
    mini: boolean
    readonly: boolean
    outputDir: string
    lang: string
    config: {
        [key: string]: any
    }
}

async function build(params: Params) {
    const outputFiles: Array<string> = []
    const outputEnv = {
        ...params.config,
        env: params.env,
        lang: params.lang
    }
    // 複製靜態檔案
    fsx.copySync(staticDir, params.outputDir + '/static', {
        filter: (src, dest) => {
            outputFiles.push(dest)
            return true
        }
    })
    // 複製頁面
    fsx.copySync(pageDir, params.outputDir, {
        filter: (src, dest) => {
            outputFiles.push(dest)
            return true
        }
    })
    // 編譯檔案
    for (let file of outputFiles) {
        let data = path.parse(file)
        // html
        if (data.ext === '.html') {
            console.log(`正在編譯HTML: ${data.name}${data.ext}`)
            let html = fsx.readFileSync(file).toString()
            if (params.env === 'dev') {
                html += /* html */`
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
                `
            } 
            let output = compile(file, html, outputEnv)
            if (params.mini) {
                output = htmlMinifier.minify(output, {
                    minifyJS: true,
                    minifyCSS: true,
                    useShortDoctype: true,
                    preserveLineBreaks: true,
                    collapseWhitespace: true,
                    collapseInlineTagWhitespace: true,
                    conservativeCollapse: true,
                    removeComments: true
                })
            }
            if (params.readonly) {
                let id = 'key--' + Buffer.from(Date.now().toString()).toString('base64')
                let base64 = Buffer.from(output, 'utf8').toString('base64')
                let doc = `
                    (function() {
                        var a = \`${unescape(encodeURIComponent(base64))}\`
                        var b = __c__(atob(a))
                        __q__.write(decodeURIComponent(b))
                    })()
                `
                output = /* html */`
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
                `
            }
            if (params.mini) {
                fsx.writeFileSync(file, output)
            } else {
                fsx.writeFileSync(file, pretty(output))
            }
        }
        // image
        if (data.ext === '.png' || data.ext === '.jpg') {
            console.log(`正在壓縮: ${data.name}${data.ext}`)
            let buffer = fsx.readFileSync(file)
            let result = await imagemin.buffer(buffer, {
                plugins: [
                    imageminJpegtran(),
                    imageminPngquant({
                        quality: [0.6, 0.8]
                    })
                ]
            })
            fsx.writeFileSync(file, result)
        }
        // js
        if (data.ext === '.js') {
            console.log(`正在編譯JS: ${data.name}${data.ext}`)
            // let babel = require('@babel/core')
            let code = fsx.readFileSync(file).toString()
            let output = code
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
                fsx.writeFileSync(file, (await minify(output)).code)
            } else {
                fsx.writeFileSync(file, output)
            }
        }
        // css
        if (data.ext === '.css') {
            console.log(`正在編譯CSS: ${data.name}${data.ext}`)
            let post = postcss([
                autoprefixer({
                    overrideBrowserslist: ['last 2 version', '> 1%', 'IE 10']
                })
            ])
            let css = compileCss(fsx.readFileSync(file).toString(), outputEnv)
            let output = css
            let result = await post.process(css, { from: undefined })
            if (result.css) {
                output = result.css
            }
            if (params.mini) {
                fsx.writeFileSync(file, (new CleanCss().minify(output).styles))
            } else {
                fsx.writeFileSync(file, output)
            }
        }
    }
}

export default async function(params: Params) {
    // 刪除所有編譯過後的檔案
    if (fsx.existsSync(params.outputDir)) {
        fsx.removeSync(params.outputDir)
    }
    // 獲取所有語系檔案
    let langs = fsx.readdirSync(localDir).map(s => s.replace('.json', ''))
    for (let lang of langs) {
        if (lang === params.lang) {
            await build(params)
        } else {
            await build({
                ...params,
                outputDir: `${params.outputDir}/${lang}`
            })
        }
    }
    console.log('Build Success.')
}
