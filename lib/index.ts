#!/usr/bin/env node

import fsx from 'fs-extra'
import program from 'commander'
import server from './server'
import build from './build'

program.version('0.0.2')
program.arguments('<mode> [name]')
program.option('--mini', 'Minify code.')
program.option('--readonly', 'Enable readonly mode.')
program.option('--readonlyhost <target>', 'Readonly mode only in target host.')
program.option('--root <target>', 'Code Source Folder.', './src')
program.option('--dist <target>', 'Build Release Folder.', './dist')
program.option('--conf <target>', 'Select Config File.', '')
program.option('--lang <target>', 'Main language, default is zh.', 'zh')
program.option('--port <target>', 'Service prot, default is 8080.', '8080')
program.option('--host <target>', 'Service host, default is localhost.', 'localhost')
program.action((mode, name = 'my-project') => {
    let rootDir: string = program.root
    let outputDir: string = program.dist
    let lang: string = program.lang
    let host: string = program.host
    let port: number = Number(program.port)
    let readonly = !!program.readonly
    let readonlyhost: string = program.readonlyhost
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
            rootDir,
            outputDir,
            readonlyHost: readonlyhost
        })
    }
    if (mode === 'serve') {
        server({
            port,
            host,
            lang,
            confPath: program.conf,
            rootDir,
            outputDir: './.dev'
        })
    }
})

program.parse(process.argv)
