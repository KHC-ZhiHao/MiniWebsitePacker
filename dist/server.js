"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const cors_1 = __importDefault(require("cors"));
const watch_1 = __importDefault(require("watch"));
const build_1 = __importDefault(require("./build"));
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const config_1 = require("./config");
function default_1(props) {
    const app = express_1.default();
    const server = new http_1.Server(app);
    const buildFile = () => __awaiter(this, void 0, void 0, function* () {
        let config = {};
        if (props.confPath) {
            config = JSON.parse(fs_extra_1.default.readFileSync(props.confPath).toString());
        }
        yield build_1.default({
            config,
            env: 'dev',
            readonly: false,
            lang: props.lang,
            mini: false,
            outputDir: props.outputDir
        });
    });
    let hasChange = false;
    watch_1.default.watchTree(config_1.rootDir, {
        interval: 1.5,
        ignoreDirectoryPattern: /node_modules/
    }, () => __awaiter(this, void 0, void 0, function* () {
        console.log('Building...');
        yield buildFile();
        hasChange = true;
        let url = `http://${props.host}:${props.port}`;
        console.log(`Server正在運行中: ${url}`);
    }));
    app.use(cors_1.default());
    app.use(express_1.default.static(props.outputDir, {
        extensions: ['html']
    }));
    app.post('/onchange', (req, res) => {
        res.json({
            result: hasChange
        });
        if (hasChange) {
            hasChange = false;
        }
    });
    server.listen(props.port, props.host, () => {
        console.log(`Server運行成功`);
    });
    return server;
}
exports.default = default_1;
