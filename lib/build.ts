import fsx from 'fs-extra'
import path from 'path'
import pretty from 'pretty'
import imagemin from 'imagemin'
import imageminJpegtran from 'imagemin-jpegtran'
import imageminPngquant from 'imagemin-pngquant'
import { compile } from './reader'

export default async function(lang: string) {
    const output = `./dist`
    const outputFiles: Array<string> = []
    // 刪除所有編譯過後的檔案
    fsx.removeSync(output)
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
            let [ result ] = await imagemin([file], {
                destination: 'build/images',
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
    console.log('Build done.')
    process.exit()
}
