# Mini Website Packer

這是一個快速開發靜態網站的建置工具，不需要安裝太多東西就能發布純HTML檔案，沒有轉譯JS、CSS等複雜行為，但可以根據語系編譯HTML，還會順便幫你壓縮圖片，適合簡單的DEMO網站或是形象網站。

## 安裝

```bash
npm install -g mini-website-packer
```

**建立符合Mini Website Packer的資料結構**

```bash
mini-website-packer init [project-name]
```

## 開發與發佈

**開啟開發模式**

在開發模式中會有簡易的hot reload功能。

```bash
mini-website-packer serve
```

**打包程式**

打包後的結果會輸出在`dist`資料夾中。

```bash
mini-website-packer build --lang zh-tw
```

## 說明

### 資料結構是固定的

locales、pages、static、templates這四個資料夾是固定的，可以使用`mini-website-packer init`建立樣本。

### 語法介紹

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

#### 語系

使用`{text}`會去找尋locales檔案中指定的語系(預設是zh-tw)並填入，該語系檔案必須是json檔。

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
