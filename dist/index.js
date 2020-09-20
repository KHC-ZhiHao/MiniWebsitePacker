#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const commander_1 = __importDefault(require("commander"));
const server_1 = __importDefault(require("./server"));
const build_1 = __importDefault(require("./build"));
commander_1.default.version('0.0.1');
commander_1.default.arguments('<mode> [name]');
commander_1.default.option('--lang <items1>', 'Select Language, default is zh-tw.', 'zh-tw');
commander_1.default.action((mode, name = 'my-project') => {
    let lang = commander_1.default.lang;
    if (mode === 'init') {
        fs_extra_1.default.copySync(`${__dirname}/../example`, `./${name}`);
        console.log('Inited');
        process.exit();
    }
    if (mode === 'build') {
        build_1.default(lang);
    }
    if (mode === 'serve') {
        server_1.default({
            port: 8080,
            host: 'localhost',
            lang
        });
    }
});
commander_1.default.parse(process.argv);
