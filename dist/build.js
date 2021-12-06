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
const path_1 = __importDefault(require("path"));
const imagemin_1 = __importDefault(require("imagemin"));
const imagemin_jpegtran_1 = __importDefault(require("imagemin-jpegtran"));
const imagemin_pngquant_1 = __importDefault(require("imagemin-pngquant"));
const pors_1 = require("pors");
const utils_1 = require("./utils");
const compile_html_1 = require("./compile-html");
const compile_1 = require("./compile");
function build(params) {
    const pawn = new pors_1.Pawn(10);
    const outputFiles = [];
    const variables = Object.assign(Object.assign({}, params.config.variables || {}), { env: params.env, lang: params.lang });
    const { staticDir, pageDir } = (0, utils_1.getDir)(params.rootDir);
    // 複製靜態檔案
    fs_extra_1.default.copySync(staticDir, params.outputDir + '/static', {
        filter: (src, dest) => {
            outputFiles.push(dest);
            return true;
        }
    });
    // 複製頁面
    fs_extra_1.default.copySync(pageDir, params.outputDir, {
        filter: (src, dest) => {
            outputFiles.push(dest);
            return true;
        }
    });
    pawn.on('error', (error) => {
        console.error(error);
    });
    // 編譯檔案
    for (let file of outputFiles) {
        let data = path_1.default.parse(file);
        // html
        if (data.ext === '.html') {
            pawn.addAsync(() => __awaiter(this, void 0, void 0, function* () {
                console.log(`正在編譯HTML: ${data.name}${data.ext}`);
                let html = fs_extra_1.default.readFileSync(file).toString();
                let output = yield (0, compile_html_1.compileHTML)(html, {
                    file,
                    prod: params.env === 'prod',
                    mini: params.mini,
                    rootDir: params.rootDir,
                    readonly: params.readonly,
                    readonlyHost: params.readonlyHost,
                    hotReload: params.env === 'dev',
                    variables
                });
                fs_extra_1.default.writeFileSync(file, output);
            }));
        }
        // image
        if (data.ext === '.png' || data.ext === '.jpg') {
            if (params.env === 'prod') {
                pawn.addAsync(() => __awaiter(this, void 0, void 0, function* () {
                    console.log(`正在壓縮: ${data.name}${data.ext}`);
                    let buffer = fs_extra_1.default.readFileSync(file);
                    let result = yield imagemin_1.default.buffer(buffer, {
                        plugins: [
                            (0, imagemin_jpegtran_1.default)(),
                            (0, imagemin_pngquant_1.default)({
                                quality: [0.6, 0.8]
                            })
                        ]
                    });
                    fs_extra_1.default.writeFileSync(file, result);
                }));
            }
        }
        // javascript
        if (data.ext === '.js') {
            pawn.addAsync(() => __awaiter(this, void 0, void 0, function* () {
                console.log(`正在編譯JS: ${data.name}${data.ext}`);
                let code = fs_extra_1.default.readFileSync(file).toString();
                let output = yield (0, compile_1.compileJs)(code, {
                    mini: params.mini,
                    babel: params.env === 'prod'
                });
                fs_extra_1.default.writeFileSync(file, output);
            }));
        }
        // css
        if (data.ext === '.css') {
            pawn.addAsync(() => __awaiter(this, void 0, void 0, function* () {
                console.log(`正在編譯CSS: ${data.name}${data.ext}`);
                let css = fs_extra_1.default.readFileSync(file).toString();
                let result = yield (0, compile_1.compileCss)(css, {
                    mini: params.mini,
                    variables,
                    autoprefixer: params.env === 'prod'
                });
                fs_extra_1.default.writeFileSync(file, result);
            }));
        }
    }
    return new Promise(resolve => pawn.onEmpty(() => resolve(null)));
}
function default_1(params) {
    return __awaiter(this, void 0, void 0, function* () {
        // 刪除所有編譯過後的檔案
        if (fs_extra_1.default.existsSync(params.outputDir)) {
            fs_extra_1.default.removeSync(params.outputDir);
        }
        // 獲取所有語系檔案
        let localDir = (0, utils_1.getDir)(params.rootDir).localDir;
        let langs = fs_extra_1.default.readdirSync(localDir).map(s => s.replace('.json', ''));
        for (let lang of langs) {
            if (lang === params.lang) {
                yield build(params);
            }
            else {
                yield build(Object.assign(Object.assign({}, params), { outputDir: `${params.outputDir}/${lang}` }));
            }
        }
        console.log('Build Success.');
    });
}
exports.default = default_1;
