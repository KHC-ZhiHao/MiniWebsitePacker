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

在開發模式中會有簡易的hot reload功能。

```bash
mini-website-packer serve --lang zh
```

**打包程式**

打包後的結果會輸出在`dist`資料夾中。

```bash
mini-website-packer build
```

## 說明

### 資料結構是固定的

locales、pages、static、templates、package.json 這四個資料夾或檔案是固定的，可以使用`mini-website-packer init`建立樣本。

### 語法介紹

#### 環境變數

在 html 文件裡面可以被替換掉的系統變數，通常以 ${name} 的方式命名。

##### $.env

會有 dev、prod 兩種型態，分別代表現在是開發狀態還是部屬狀態。

```js
// 編譯前
<script src="core.${env}.js"></script>
// 編譯後
<script src="core.dev.js"></script>
```

##### $.lang

獲取當下編譯環境中的語系：

```js
// 編譯前
<html lang="${lang}"></html>
// 編譯後
<html lang="zh"></html>
```

#### 模板

使用`<t-filename></t-filename>`的標籤會在編譯過程中自動找尋`templates`檔案中相對應的檔案名稱，這個標籤**不支援任何屬性**外，可以使用`<!-- SOLT -->`語法來表明插槽位置。

```html
<!-- template/wrapper.html -->
<div>
    Hello，<!-- SOLT -->
<div>
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

在**模板**中使用`:name:`意味著這個值必須從外部傳遞，傳遞語法為`<prop>key:value</prop>`。

> 注意空白鍵是敏感的。

```html
<!-- template/wrapper.html -->
<div>
    Hello，:name:
    Your age is :age:
<div>
```

```html
<!-- pages/index.html -->
<t-wrapper>
    <prop>name:Dave</prop>
    <prop>age:18</prop>
</t-wrapper>
```

必須注意的是所有的`prop`標籤必須要堆在所有標籤的最前方，也就是`t-template`的第一個標籤。

以下是編譯後的結果：

```html
<div>
    Hello，Dave
    Your age is 18
<div>
```

#### 語系

使用`{text}`會去找尋locales檔案中指定的語系(預設是zh)並填入，該語系檔案必須是json檔。

```js
// locales/zh-tw.json
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

> 需注意的是該檔案會隨著編譯一起到專案的跟目錄中，請勿在pages中建立static資料夾以避免衝突。

```html
<!-- pages/index.html -->
<div>
    <!-- 這樣即可獲取static中的圖檔 -->
    <img src="./static/logo.png">
<div>
```
