module.exports = async({ handlebars }) => {
    return {
        variables: {
            primary: 'blue'
        },
        renderData: {
            messages: [
                '{你好}',
                '{歡迎使用} <a href="https://github.com/KHC-ZhiHao/MiniWebsitePacker">MiniWebsitePacker</a>'
            ]
        }
    }
}
