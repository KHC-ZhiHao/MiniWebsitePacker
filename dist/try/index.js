"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const build_1 = __importDefault(require("../lib/build"));
build_1.default({
    config: {},
    env: 'dev',
    lang: 'zh',
    mini: false,
    outputDir: './try/dist',
    rootDir: './try/src',
    readonly: false
});
