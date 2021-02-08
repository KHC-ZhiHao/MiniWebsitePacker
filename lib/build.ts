import fsx from 'fs-extra'
import path from 'path'
import pretty from 'pretty'
import imagemin from 'imagemin'
import imageminJpegtran from 'imagemin-jpegtran'
import imageminPngquant from 'imagemin-pngquant'
import { compile } from './reader'

async function build(output: string, lang: string) {
    const outputFiles: Array<string> = []
    // 複製靜態檔案
    fsx.copySync('./static', output + '/static', {
        filter: (src, dest) => {
            outputFiles.push(dest)
            return true
        }
    })
    // 複製頁面
    fsx.copySync('./pages', output, {
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
            let output = compile(html, lang)
            fsx.writeFileSync(file, pretty(output))
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
        }
        // css
        if (data.ext === '.css') {
            console.log(`正在編譯CSS: ${data.name}${data.ext}`)
        }
    }
}

export default async function(outputDir = './dist') {
    // 刪除所有編譯過後的檔案
    if (fsx.existsSync(outputDir)) {
        fsx.removeSync(outputDir)
    }
    // 獲取所有語系檔案
    let langs = fsx.readdirSync('./locales').map(s => s.replace('.json', ''))
    for (let lang of langs) {
        if (lang === 'main') {
            await build(outputDir, lang)
        } else {
            await build(`${outputDir}/${lang}`, lang)
        }
    }
    console.log('Build done.')
    process.exit()
}
