# Library Listen 預覽

這是 Library Listen 的下一版**預覽**，還沒有取代現在用的網站。

現在用的仍是 [https://bigdaddy109.github.io/library-listen/](https://bigdaddy109.github.io/library-listen/)。

預覽網址：<https://bigdaddy109.github.io/library-listen-looseleaf/>

這一版用筆記本紙的畫面（Looseleaf），讀同一個 Google 雲端硬碟資料夾：名稱是 `Library`，只讀。系列資料夾的樣子是 `中文-English/listen/書名/`，旁邊可以有電子書和封面。例如 `上學不容易-Middle-School`、`手斧男孩-Hatchet`。

還沒登入時，畫面上是**示範書架**（靜音音檔），用來先看書架、書頁和播放器。打開一本書不會自己播放，會停在上次的位置，等你按播放。

介面可以切換繁體中文和英文。

## 這一版還不是正式站

請先看預覽、再決定要不要換掉舊站。沒有合併這個 pull request 之前，舊站不會被換掉。

## Google 登入要做的事

登入用的是舊站同一組「網頁應用程式」用戶端編號（寫在 `src/drive.ts`，這不是密鑰）。舊站已經允許的 JavaScript 來源是：

`https://bigdaddy109.github.io`

預覽如果放在 `https://bigdaddy109.github.io/library-listen-looseleaf/`，來源和舊站相同，**電腦上的彈出視窗登入多半不用再加一個來源**。請到 Google Cloud Console 確認這個來源還在：

1. 打開 [Google Cloud Console](https://console.cloud.google.com/) → 選 Library Listen 那個專案。
2. APIs & Services → Credentials → 打開舊站的 Web client（`library-listen-web`）。
3. Authorized JavaScript origins 裡要有 `https://bigdaddy109.github.io`（只有網址開頭，沒有路徑，結尾不要斜線）。沒有的話就加上。
4. 手機和本機是整頁跳去 Google 再跳回來，要在 **Authorized redirect URIs** 加上這幾個完整網址（含路徑，結尾有斜線）：
   - `https://bigdaddy109.github.io/library-listen-looseleaf/`
   - `http://127.0.0.1:5173/`
   - `http://localhost:5173/`
5. 若同意畫面還在測試模式，登入的 Google 帳號要在測試使用者名單裡。
6. 雲端硬碟裡要有一個分享給這個帳號的資料夾，名稱正好是 `Library`，權限檢視者即可。

電腦開預覽網址時按「用 Google 登入」，會跳出 Google 視窗。iPhone、iPad 和本機會離開頁面再回來，所以一定要先做好第 4 步，否則手機會登入失敗。失敗時畫面仍留在示範書架。

## 本機

```bash
npm install
npm test
npm run dev
```

開 `http://127.0.0.1:5173/`。

## Looseleaf

畫面元件是從 [Looseleaf](https://github.com/kevintngo/looseleaf) 的 commit `4bdb647940e2fefb3cebb394f3bad25c766a27d2` 複製進來的，授權是 MIT。說明在 `vendor/looseleaf/SOURCE.md`。
