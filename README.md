# Library Listen Looseleaf

筆記本紙的聽書書架。網址是 <https://bigdaddy109.github.io/library-listen-looseleaf/>。

讀 Google 雲端硬碟裡名為 `Library` 的資料夾，只讀。系列資料夾的樣子是 `中文-English/listen/書名/`，旁邊可以有電子書和封面。例如 `上學不容易-Middle-School`、`手斧男孩-Hatchet`。

還沒登入時，畫面上是**示範書架**（靜音音檔）。用 Google 登入之後，換成你的 Library。打開一本書不會自己播放，會停在上次的位置，等你按播放。

介面可以切換繁體中文和英文。

推上 `main` 之後，GitHub Actions 的 `preview-pages` 會把網站發到上面的網址。

## Google 登入

登入用的是網頁用戶端編號（寫在 `src/drive.ts`，這不是密鑰）。電腦上的彈出視窗用的 JavaScript 來源是：

`https://bigdaddy109.github.io`

手機和本機會整頁跳去 Google 再跳回來，Authorized redirect URIs 要有這些完整網址（含路徑，結尾有斜線）：

- `https://bigdaddy109.github.io/library-listen-looseleaf/`
- `http://127.0.0.1:5173/`
- `http://localhost:5173/`

雲端硬碟裡要有一個分享給這個帳號的資料夾，名稱正好是 `Library`，權限檢視者即可。

## 本機

```bash
npm install
npm test
npm run dev
```

開 `http://127.0.0.1:5173/`。

## Looseleaf

畫面元件是從 [Looseleaf](https://github.com/kevintngo/looseleaf) 的 commit `4bdb647940e2fefb3cebb394f3bad25c766a27d2` 複製進來的，授權是 MIT。說明在 `vendor/looseleaf/SOURCE.md`。
