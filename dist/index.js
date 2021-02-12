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
commander_1.default.version('0.0.2');
commander_1.default.arguments('<mode> [name]');
commander_1.default.option('--mini', 'Minify Code.');
commander_1.default.option('--lang <target>', 'Main Language, default is zh.', 'zh');
commander_1.default.option('--port <target>', 'Select Language, default is 8080.', '8080');
commander_1.default.option('--host <target>', 'Select Language, default is localhost.', 'localhost');
commander_1.default.action((mode, name = 'my-project') => {
    let lang = commander_1.default.lang;
    let host = commander_1.default.host;
    let port = Number(commander_1.default.port);
    if (mode === 'init') {
        fs_extra_1.default.copySync(`${__dirname}/../example`, `./${name}`);
        console.log('Inited');
        process.exit();
    }
    if (mode === 'build') {
        build_1.default(lang, './dist', !!commander_1.default.mini);
    }
    if (mode === 'serve') {
        server_1.default({
            port,
            host,
            lang
        });
    }
});
commander_1.default.parse(process.argv);
