import cors from 'cors'
import watch from 'watch'
import build from './build'
import express from 'express'
import { Server } from 'http'
import { readConfig } from './utils'

type Props = {
    port: number
    host: string
    lang: string
    rootDir: string
    confPath: string
    outputDir: string
}

export default function(props: Props) {
    const app = express()
    const server = new Server(app)
    const buildFile = async() => {
        let config = {}
        if (props.confPath) {
            config = await readConfig(props.confPath)
        }
        await build({
            config,
            env: 'dev',
            readonly: false,
            lang: props.lang,
            babel: false,
            mini: false,
            onlyDefLang: true,
            rootDir: props.rootDir,
            outputDir: props.outputDir,
            readonlyHost: null
        })
    }

    let hasChange = false
    let building = false

    watch.watchTree(props.rootDir, {
        interval: 1.5,
        ignoreDirectoryPattern: /node_modules/
    }, async() => {
        if (building) {
            return null
        }
        building = true
        console.log('Building...')
        await new Promise(resolve => {
            setTimeout(() => {
                resolve(null)
                building = false
            }, 500)
        })
        await buildFile()
        hasChange = true
        let url = `http://${props.host}:${props.port}`
        console.log(`Server正在運行中: ${url}`)
    })
    app.use(cors())
    app.use(express.static(props.outputDir, {
        extensions: ['html', 'hbs']
    }))
    app.post('/onchange', (req, res) => {
        res.json({
            result: hasChange
        })
        if (hasChange) {
            hasChange = false
        }
    })
    server.listen(props.port, props.host, () => {
        console.log(`Server運行成功`)
    })
    return server
}
