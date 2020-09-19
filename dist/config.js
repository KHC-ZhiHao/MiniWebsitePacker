"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("joi"));
const fs_extra_1 = __importDefault(require("fs-extra"));
let schema = joi_1.default.object({
    port: joi_1.default.number().allow(null),
    host: joi_1.default.string().allow(null)
});
let projectPath = './mws-project.json';
let output = {
    port: 8080,
    host: 'localhost',
    locale: 'zh-tw'
};
if (fs_extra_1.default.existsSync(projectPath)) {
    let file = fs_extra_1.default.readFileSync(projectPath);
    let data = JSON.parse(file.toString());
    let validate = schema.validate(data);
    if (validate.error) {
        console.error(validate.error.message);
        process.exit();
    }
    Object.assign(output, data);
}
exports.default = output;
