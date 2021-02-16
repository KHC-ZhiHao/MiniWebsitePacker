import build from '../lib/build'

build({
    config: {},
    env: 'dev',
    lang: 'zh',
    mini: false,
    outputDir: './try/dist',
    rootDir: './try/src',
    readonly: false
})
