#!/usr/bin/env node

import fsx from 'fs-extra'
import program from 'commander'
import server from './server'
import build from './build'

program.version('0.0.2')
program.arguments('<mode> [name]')
program.option('--lang <target>', 'Main Language, default is zh.', 'zh')
program.option('--port <target>', 'Select Language, default is 8080.', '8080')
program.option('--host <target>', 'Select Language, default is localhost.', 'localhost')
program.action((mode, name = 'my-project') => {
    let lang: string = program.lang
    let host: string = program.host
    let port: number = Number(program.port)
    if (mode === 'init') {
        fsx.copySync(`${__dirname}/../example`, `./${name}`)

        console.log('Inited')
        process.exit()
    }
    if (mode === 'build') {
        build(lang)
    }
    if (mode === 'serve') {
        server({
            port,
            host,
            lang
        })
    }
})

program.parse(process.argv)