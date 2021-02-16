import postcss from 'postcss'
import CleanCss from 'clean-css'
import autoprefixer from 'autoprefixer'
import escapeStringRegexp from 'escape-string-regexp'
import { minify } from "terser"

type CompileJsOptions = {
    mini: boolean
}

export const compileJs = async (code: string, options: CompileJsOptions) => {
    let babel = require('@babel/core')
    let output: string = await new Promise((resolve, reject) => {
        babel.transform(code, {
            presets: [
                [
                    '@babel/preset-env'
                ]
            ]
        }, (err, result) => {
            if (err) {
                reject(err)
            } else {
                resolve(result.code)
            }
        })
    })
    if (options.mini) {
        output = (await minify(output)).code
    }
    return output
}

type CompileCssOptions = {
    mini: boolean
    variables: {
        [key: string]: any
    }
}

export const compileCss = async (css: string, options: CompileCssOptions) => {
    let code = css.toString()
    for (let key in options.variables) {
        let text = escapeStringRegexp(`--${key}--`)
        let reg = new RegExp(text, 'g')
        code = code.replace(reg, options.variables[key])
    }
    let post = postcss([
        autoprefixer({
            overrideBrowserslist: ['last 2 version', '> 1%', 'IE 10']
        })
    ])
    let result = post.process(code, {
        from: undefined
    })
    let output = result.css || code
    if (options.mini) {
        let clear = new CleanCss()
        output = clear.minify(output).styles
    }
    return output
}
