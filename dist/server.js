"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const watch_1 = __importDefault(require("watch"));
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const fs_1 = require("fs");
const reader_1 = require("./reader");
function default_1(props) {
    const app = express_1.default();
    const server = new http_1.Server(app);
    let hasChange = false;
    watch_1.default.watchTree('.', {
        interval: 1.5,
        ignoreDirectoryPattern: /node_modules/
    }, () => {
        hasChange = true;
    });
    app.use(cors_1.default());
    app.use(express_1.default.static('.'));
    app.get('*', function (req, res) {
        try {
            let fileName = req.url.match('html') ? req.url : req.url + '.html';
            let file = `./pages${fileName}`;
            if (fs_1.existsSync(file) === false) {
                file = `./pages${req.url}/index.html`;
            }
            let html = fs_1.readFileSync(file);
            let result = reader_1.compile(html.toString(), props.lang);
            result += /* html */ `
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
            `;
            res.send(result);
        }
        catch (error) {
            res.statusCode = 404;
            res.send(`Error - ${error}`);
        }
    });
    app.post('/onchange', (req, res) => {
        res.json({
            result: hasChange
        });
        if (hasChange) {
            hasChange = false;
        }
    });
    server.listen(props.port, props.host, () => {
        let url = `http://${props.host}:${props.port}`;
        console.log(`Server正在運行中: ${url}`);
    });
}
exports.default = default_1;
