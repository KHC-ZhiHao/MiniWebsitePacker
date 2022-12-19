import fsx from 'fs-extra'
import path from 'path'
import imagemin from 'imagemin'
import imageminJpegtran from 'imagemin-jpegtran'
import imageminPngquant from 'imagemin-pngquant'
import imageminGifsicle from 'imagemin-gifsicle'
import { Pawn } from 'pors'
import { getDir } from './utils'
import { compileHTML } from './compile-html'
import { compileJs, compileCss } from './compile'

type Params = {
    env: 'prod' | 'dev'
    lang: string
    mini: boolean
    rootDir: string
    readonly: boolean
    babel: boolean
    readonlyHost: string
    outputDir: string
    onlyDefLang: boolean
    config: {
        [key: string]: any
    }
}

function build(params: Params) {
    const pawn = new Pawn(10)
    const outputFiles: Array<string> = []
    const variables = {
        ...params.config.variables || {},
        env: params.env,
        lang: params.lang
    }
    const { staticDir, pageDir } = getDir(params.rootDir)
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
    pawn.on('error', (error) => {
        console.error(error)
    })
    // 編譯檔案
    for (let file of outputFiles) {
        let data = path.parse(file)
        // html
        if (data.ext === '.html' || data.ext === '.hbs') {
            pawn.addAsync(async() => {
                console.log(`正在編譯HTML: ${data.name}${data.ext}`)
                let html = fsx.readFileSync(file).toString()
                let output = await compileHTML(html, {
                    file,
                    babel: params.babel,
                    prod: params.env === 'prod',
                    mini: params.mini,
                    rootDir: params.rootDir,
                    readonly: params.readonly,
                    readonlyHost: params.readonlyHost,
                    hotReload: params.env === 'dev',
                    renderData: params.config.renderData || {},
                    isHandlebars: data.ext === '.hbs',
                    variables
                })
                if (data.ext === '.hbs') {
                    fsx.unlinkSync(file)
                    fsx.writeFileSync(file.slice(0, -4) + '.html', output)
                } else {
                    fsx.writeFileSync(file, output)
                }
            })
        }
        // png
        if (data.ext === '.png') {
            if (params.env === 'prod') {
                pawn.addAsync(async() => {
                    console.log(`正在壓縮: ${data.name}${data.ext}`)
                    let result = await imagemin([file], {
                        plugins: [
                            imageminPngquant({
                                quality: [0.6, 0.8]
                            })
                        ]
                    })
                    fsx.writeFileSync(file, result[0].data)
                })
            }
        }
        if (data.ext === '.jpg') {
            if (params.env === 'prod') {
                pawn.addAsync(async() => {
                    console.log(`正在壓縮: ${data.name}${data.ext}`)
                    let result = await imagemin([file], {
                        plugins: [
                            imageminJpegtran()
                        ]
                    })
                    fsx.writeFileSync(file, result[0].data)
                })
            }
        }
        if (data.ext === '.gif') {
            if (params.env === 'prod') {
                pawn.addAsync(async() => {
                    console.log(`正在壓縮: ${data.name}${data.ext}`)
                    let result = await imagemin([file], {
                        plugins: [
                            imageminGifsicle({
                                optimizationLevel: 3
                            })
                        ]
                    })
                    fsx.writeFileSync(file, result[0].data)
                })
            }
        }
        // javascript
        if (data.ext === '.js') {
            pawn.addAsync(async() => {
                console.log(`正在編譯JS: ${data.name}${data.ext}`)
                let code = fsx.readFileSync(file).toString()
                let output: string = await compileJs(code, {
                    mini: params.mini,
                    babel: params.babel
                })
                fsx.writeFileSync(file, output)
            })
        }
        // css
        if (data.ext === '.css') {
            pawn.addAsync(async() => {
                console.log(`正在編譯CSS: ${data.name}${data.ext}`)
                let css = fsx.readFileSync(file).toString()
                let result = await compileCss(css, {
                    mini: params.mini,
                    variables,
                    scope: '',
                    autoprefixer: params.env === 'prod'
                })
                fsx.writeFileSync(file, result)
            })
        }
    }
    return new Promise(resolve => pawn.onEmpty(() => resolve(null)))
}

export default async function(params: Params) {
    // 刪除所有編譯過後的檔案
    if (fsx.existsSync(params.outputDir)) {
        fsx.removeSync(params.outputDir)
    }
    // 獲取所有語系檔案
    let localDir = getDir(params.rootDir).localDir
    let langs = fsx.readdirSync(localDir).map(s => s.replace('.json', ''))
    for (let lang of langs) {
        if (lang === params.lang) {
            await build(params)
        } else if (params.onlyDefLang === false) {
            await build({
                ...params,
                lang,
                outputDir: `${params.outputDir}/${lang}`
            })
        }
    }
    console.log('Build Success.')
}
