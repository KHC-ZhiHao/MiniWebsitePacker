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
const pretty_1 = __importDefault(require("pretty"));
const imagemin_1 = __importDefault(require("imagemin"));
const imagemin_jpegtran_1 = __importDefault(require("imagemin-jpegtran"));
const imagemin_pngquant_1 = __importDefault(require("imagemin-pngquant"));
const postcss_1 = __importDefault(require("postcss"));
const autoprefixer_1 = __importDefault(require("autoprefixer"));
const reader_1 = require("./reader");
function build(output, lang) {
    return __awaiter(this, void 0, void 0, function* () {
        const outputFiles = [];
        // 複製靜態檔案
        fs_extra_1.default.copySync('./static', output + '/static', {
            filter: (src, dest) => {
                outputFiles.push(dest);
                return true;
            }
        });
        // 複製頁面
        fs_extra_1.default.copySync('./pages', output, {
            filter: (src, dest) => {
                outputFiles.push(dest);
                return true;
            }
        });
        // 編譯檔案
        for (let file of outputFiles) {
            let data = path_1.default.parse(file);
            // html
            if (data.ext === '.html') {
                console.log(`正在編譯HTML: ${data.name}${data.ext}`);
                let html = fs_extra_1.default.readFileSync(file).toString();
                let output = reader_1.compile(html, lang);
                fs_extra_1.default.writeFileSync(file, pretty_1.default(output));
            }
            // image
            if (data.ext === '.png' || data.ext === '.jpg') {
                console.log(`正在壓縮: ${data.name}${data.ext}`);
                let buffer = fs_extra_1.default.readFileSync(file);
                let result = yield imagemin_1.default.buffer(buffer, {
                    plugins: [
                        imagemin_jpegtran_1.default(),
                        imagemin_pngquant_1.default({
                            quality: [0.6, 0.8]
                        })
                    ]
                });
                fs_extra_1.default.writeFileSync(file, result);
            }
            // js
            if (data.ext === '.js') {
                console.log(`正在編譯JS: ${data.name}${data.ext}`);
                let babel = require('@babel/core');
                let code = fs_extra_1.default.readFileSync(file).toString();
                yield new Promise((resolve, reject) => {
                    babel.transform(code, {
                        presets: [
                            [
                                '@babel/preset-env'
                            ]
                        ]
                    }, (err, result) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            fs_extra_1.default.writeFileSync(file, result.code);
                            resolve(null);
                        }
                    });
                });
            }
            // css
            if (data.ext === '.css') {
                console.log(`正在編譯CSS: ${data.name}${data.ext}`);
                let post = postcss_1.default([
                    autoprefixer_1.default({
                        overrideBrowserslist: ['last 2 version', '> 1%', 'IE 10']
                    })
                ]);
                let css = fs_extra_1.default.readFileSync(file).toString();
                let result = yield post.process(css, { from: undefined });
                if (result.css) {
                    fs_extra_1.default.writeFileSync(file, result.css);
                }
                else {
                    fs_extra_1.default.writeFileSync(file, css);
                }
            }
        }
    });
}
function default_1(mainLang, outputDir = './dist') {
    return __awaiter(this, void 0, void 0, function* () {
        // 刪除所有編譯過後的檔案
        if (fs_extra_1.default.existsSync(outputDir)) {
            fs_extra_1.default.removeSync(outputDir);
        }
        // 獲取所有語系檔案
        let langs = fs_extra_1.default.readdirSync('./locales').map(s => s.replace('.json', ''));
        for (let lang of langs) {
            if (lang === mainLang) {
                yield build(outputDir, lang);
            }
            else {
                yield build(`${outputDir}/${lang}`, lang);
            }
        }
        console.log('Build done.');
        process.exit();
    });
}
exports.default = default_1;
