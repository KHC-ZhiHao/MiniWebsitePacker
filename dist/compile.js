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
exports.compileCss = exports.compileJs = void 0;
const postcss_1 = __importDefault(require("postcss"));
const clean_css_1 = __importDefault(require("clean-css"));
const autoprefixer_1 = __importDefault(require("autoprefixer"));
const escape_string_regexp_1 = __importDefault(require("escape-string-regexp"));
const core_1 = require("@babel/core");
const terser_1 = require("terser");
const compileJs = (code, options) => __awaiter(void 0, void 0, void 0, function* () {
    let output = code;
    if (options.babel) {
        output = yield new Promise((resolve, reject) => {
            core_1.transform(code, {
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
                    resolve(result.code);
                }
            });
        });
    }
    if (options.mini) {
        output = (yield terser_1.minify(output)).code;
    }
    return output;
});
exports.compileJs = compileJs;
const compileCss = (css, options) => __awaiter(void 0, void 0, void 0, function* () {
    let code = css.toString();
    let result = {};
    for (let key in options.variables) {
        let text = escape_string_regexp_1.default(`--${key}--`);
        let reg = new RegExp(text, 'g');
        code = code.replace(reg, options.variables[key]);
    }
    if (options.autoprefixer) {
        let post = postcss_1.default([
            autoprefixer_1.default({
                overrideBrowserslist: ['last 2 version', '> 1%', 'IE 10']
            })
        ]);
        result = post.process(code, {
            from: undefined
        });
    }
    let output = result.css || code;
    if (options.mini) {
        let clear = new clean_css_1.default();
        output = clear.minify(output).styles;
    }
    return output;
});
exports.compileCss = compileCss;
