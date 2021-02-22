# Mini Website Packer

這是一個快速開發靜態網站的建置工具，不需要安裝太多東西就能發布純HTML檔案，協助轉換 JS 支援 es5、auto prefix CSS 等複雜行為，甚至可以根據語系編譯 HTML，還會順便幫你壓縮圖片，適合簡單的 DEMO 網站或是形象網站。

這個工具能做的不多，如果你有更複雜的需求請直接參考 webpack。

## 安裝

```bash
npm install -g mini-website-packer
```

**建立符合Mini Website Packer的資料結構**

> 如果不想在全域環境下安裝套件，也可以直接複製本專案的 example 資料夾進行開發。

```bash
mini-website-packer init myproject
cd myproject
npm install
```

## 開發與發佈

**開啟開發模式**

在開發模式中會有簡易的 hot reload 功能，選項 lang 可以指定使用哪種語言作為預覽。

```bash
mini-website-packer serve --lang zh
```

**打包程式**

打包後的結果會輸出在`dist`資料夾中，選項 mini 會壓縮文檔，選項 lang 則是選擇哪種語言作為主要語言，其他語言仍然會輸出自己的資料夾。

```bash
mini-website-packer build --mini --lang zh
```

* 使用 --mini 即壓縮所有檔案

## 說明

### 資料結構是固定的

locales、pages、static、templates、package.json 這四個資料夾或檔案是固定的，可以使用`mini-website-packer init`建立樣本。

### 語法介紹

#### 環境變數

在 html、css 文件裡面可以被替換掉的系統變數，通常以 --{name}-- 的方式命名。

##### env

會有 dev、prod 兩種型態，分別代表現在是開發狀態還是部屬狀態。

```js
// 編譯前
<script src="core.--env--.js"></script>
// 編譯後
<script src="core.dev.js"></script>
```

##### lang

獲取當下編譯環境中的語系：

```js
// 編譯前
<html lang="--lang--"></html>
// 編譯後
<html lang="zh"></html>
```

##### 自定義

使用 `--conf config.json` 即可自定義自己的變數，例如我們定義主題顏色，如下：

```bash
# 部屬
mini-website-packer build --conf ./src/config.json --lang zh
# 開發
mini-website-packer serve --conf ./src/config.json --lang zh
```

src/config.json

```json
{
    "primary": "red"
}
```

src/static/style/index.css

```css
/* 編譯前 */
* {
    color: --primary--
}
/* 編譯後 */
* {
    color: red
}
```

#### 模板

使用`<t-filename></t-filename>`的標籤會在編譯過程中自動找尋`templates`檔案中相對應的檔案名稱，這個標籤**不支援任何Tag屬性**(例如: class)，且必須使用`<template></template>`包裝起來，並使用`<slot></slot>`語法來表明插槽位置。

> 你也可以在模板中引用其他模板。

> 由於是採用 cheerio 作為解讀工具，這個套件會自動處理html大綱結構，所以請避免在template中出現`<html>`、`<head>`、`<body>`這三種標籤。

```html
<!-- template/wrapper.html -->
<template>
    <div>
        Hello，<slot></slot>
    <div>
</template>
```

```html
<!-- pages/index.html -->
<t-wrapper>Dave</t-wrapper>
```

以下是編譯後的結果：

> 這是以結果正確為主的示意結果，實際排版視編譯結果而定。

```html
<div>Hello，Dave<div>
```

#### Props

在**模板**中使用`-name-`意味著這個值必須從外部傳遞。

> 注意空白鍵是敏感的。

```html
<!-- template/wrapper.html -->
<template>
    <div>
        Hello，-name-
        Your age is -age-
    <div>
</template>
```

```html
<!-- pages/index.html -->
<t-wrapper name="Dave" age="18"></t-wrapper>
```

以下是編譯後的結果：

```html
<div>
    Hello，Dave
    Your age is 18
<div>
```

#### Children Template

可以在 template file 內使用 `<template name="child"></template>` 來表明這是一個子模板，可以用`<t-filename.childname>`來獲取定義的子模板。

> 你可以在模板中引用自己的子模板，協助簡潔化程式碼。

```html
<!-- template/wrapper.html -->
<template>
    <div>
        Hello，<slot></slot>
    <div>
</template>

<template name="hi">
    <div>
        Hi，<slot></slot>
    </div>
</template>
```

```html
<!-- pages/index.html -->
<t-wrapper.hi>Dave</t-wrapper.hi>
```

以下是編譯後的結果：

```html
<div>
    Hi，Dave
<div>
```

#### 語系

使用`{text}`會去找尋locales檔案中指定的語系(預設是zh)並填入，該語系檔案必須是json檔。

> 語系在編譯過程中會產生自己的目錄，請勿在pages中建立其語系相同名稱的資料夾以避免衝突。

```js
// locales/zh.json
{
    "name": "Dave"
}
```

```html
<!-- pages/index.html -->
<div>
    Hello {name}
</div>
```

以下是編譯後的結果：

> 這是以結果正確為主的示意結果，實際排版視編譯結果而定。

```html
<div>Hello Dave<div>
```

### 從Static獲取靜態資源

當我們需要圖片或是管理css相關檔案時，請把檔案放在`static`中。

> 需注意的是該檔案會隨著編譯一起到專案的根目錄中，請勿在pages中建立static資料夾以避免衝突。

```html
<!-- pages/index.html -->
<div>
    <!-- 這樣即可獲取static中的圖檔 -->
    <img src="./static/logo.png">
<div>
```

## 高級註解

使用三減號註解可以在編譯過程中被移除，可以避免要交付的程式碼中包含自己的開發邏輯：

```html
<!--- Props: title --->
<div>-title-</div>
```

使用警告註解可以在編譯過程中發出警告，目的在於給未定義的參數添加檢查提示：

```html
<!--! 這裡還沒有填入資料 !-->
<div>...</div>
```
