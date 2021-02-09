import cors from 'cors'
import watch from 'watch'
import express from 'express'
import { Server } from 'http'
import { readFileSync, existsSync } from 'fs'
import { compile } from './reader'

type Props = {
    port: number
    host: string
    lang: string
}

export default function(props: Props) {

    const app = express()
    const server = new Server(app)

    let hasChange = false

    watch.watchTree('.', {
        interval: 1.5,
        ignoreDirectoryPattern: /node_modules/
    }, () => {
        hasChange = true
    })

    app.use(cors())
    app.use(express.static('.'))
    
    app.get('*', function(req, res) {
        try {
            let fileName = req.url.match('html') ? req.url : req.url + '.html'
            let file = `./pages${fileName}`
            if (existsSync(file) === false) {
                file = `./pages${req.url}/index.html`
            }
            let html = readFileSync(file)
            let result = compile(html.toString(), props.lang)
            result += /* html */`
                <script>
                    setInterval(() => {
                        let oReq = new XMLHttpRequest()
                            oReq.addEventListener('load', (data) => {
                                if (JSON.parse(oReq.response).result) {
                                    location.reload()
                                }
                            })
                            oReq.open('POST', '/onchange?height=123')
                            oReq.send()
                    }, 1500)
                </script>
            `
            res.send(result)
        } catch (error) {
            res.statusCode = 404
            res.send(`Error - ${error}`)
        }
    })

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
