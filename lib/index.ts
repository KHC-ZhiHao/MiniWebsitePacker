#!/usr/bin/env node

import fsx from 'fs-extra'
import program from 'commander'
import server from './server'
import build from './build'

program.version('0.0.2')
program.arguments('<mode> [name]')
program.option('--mini', 'Minify code.')
program.option('--readonly', 'Enable readonly mode.')
program.option('--conf <target>', 'Select Config File.', '')
program.option('--lang <target>', 'Main language, default is zh.', 'zh')
program.option('--port <target>', 'Service prot, default is 8080.', '8080')
program.option('--host <target>', 'Service host, default is localhost.', 'localhost')
program.action((mode, name = 'my-project') => {
    let outputDir = './dist'
    let lang: string = program.lang
    let host: string = program.host
    let port: number = Number(program.port)
    let readonly = !!program.readonly
    if (mode === 'init') {
        fsx.copySync(`${__dirname}/../example`, `./${name}`)
        console.log('Inited')
        process.exit()
    }
    if (mode === 'build') {
        let conf = {}
        if (program.conf) {
            conf = JSON.parse(fsx.readFileSync(program.conf).toString())
        }
        build({
            config: conf,
            env: 'prod',
            lang,
            readonly,
            mini: !!program.mini,
            outputDir
        })
    }
    if (mode === 'serve') {
        server({
            port,
            host,
            lang,
            confPath: program.conf,
            outputDir
        })
    }
})

program.parse(process.argv)