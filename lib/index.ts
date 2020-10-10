#!/usr/bin/env node

import fsx from 'fs-extra'
import program from 'commander'
import server from './server'
import build from './build'

program.version('0.0.1')
program.arguments('<mode> [name]')
program.option('--lang <target>', 'Select Language, default is zh-tw.', 'zh-tw')
program.action((mode, name = 'my-project') => {
    let lang: string = program.lang
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
            port: 8080,
            host: 'localhost',
            lang
        })
    }
})

program.parse(process.argv)