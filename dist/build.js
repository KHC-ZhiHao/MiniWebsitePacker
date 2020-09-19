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
const uglifycss_1 = __importDefault(require("uglifycss"));
const imagemin_1 = __importDefault(require("imagemin"));
const imagemin_jpegtran_1 = __importDefault(require("imagemin-jpegtran"));
const imagemin_pngquant_1 = __importDefault(require("imagemin-pngquant"));
const reader_1 = require("./reader");
const core_1 = require("@babel/core");
const output = './dist';
function default_1() {
    return __awaiter(this, void 0, void 0, function* () {
        const outputFiles = [];
        // 刪除所有編譯過後的檔案
        fs_extra_1.default.removeSync(output);
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
        for (let file of outputFiles) {
            let data = path_1.default.parse(file);
            // html
            if (data.ext === '.html') {
                console.log(`正在編譯HTML: ${data.name}${data.ext}`);
                let html = fs_extra_1.default.readFileSync(file).toString();
                let output = reader_1.compile(html);
                fs_extra_1.default.writeFileSync(file, pretty_1.default(output));
            }
            // image
            if (data.ext === '.png' || data.ext === '.jpg') {
                console.log(`正在壓縮: ${data.name}${data.ext}`);
                let [result] = yield imagemin_1.default([file], {
                    destination: 'build/images',
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
                yield new Promise((resolve, reject) => {
                    let js = fs_extra_1.default.readFileSync(file).toString();
                    core_1.transform(js, null, (err, result) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            fs_extra_1.default.writeFileSync(file, result.code);
                            resolve();
                        }
                    });
                });
            }
            // css
            if (data.ext === '.css') {
                console.log(`正在編譯CSS: ${data.name}${data.ext}`);
                let uglified = uglifycss_1.default.processFiles([file], {
                    maxLineLen: 500,
                    expandVars: true
                });
                fs_extra_1.default.writeFileSync(file, uglified);
            }
        }
        console.log('Build done.');
        process.exit();
    });
}
exports.default = default_1;
