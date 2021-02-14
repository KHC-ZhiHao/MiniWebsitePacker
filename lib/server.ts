import fsx from 'fs-extra'
import cors from 'cors'
import watch from 'watch'
import build from './build'
import express from 'express'
import { Server } from 'http'
import { rootDir } from './dir'

type Props = {
    port: number
    host: string
    lang: string
    confPath: string
    outputDir: string
}

export default function(props: Props) {

    const app = express()
    const server = new Server(app)
    const buildFile = async() => {
        let config = {}
        if (props.confPath) {
            config = JSON.parse(fsx.readFileSync(props.confPath).toString())
        }
        await build({
            config,
            env: 'dev',
            lang: props.lang,
            mini: false,
            outputDir: props.outputDir
        })
    }

    let hasChange = false

    watch.watchTree(rootDir, {
        interval: 1.5,
        ignoreDirectoryPattern: /node_modules/
    }, async() => {
        console.log('Change...')
        await buildFile()
        hasChange = true
    })

    buildFile()

    app.use(cors())
    app.use(express.static(props.outputDir, {
        extensions: ['html']
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
        let url = `http://${props.host}:${props.port}`
        console.log(`Server正在運行中: ${url}`)
    })

    return server
}
