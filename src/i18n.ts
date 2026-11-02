export type Lang = "zh-TW" | "en";

export const LANG_KEY = "librarylisten.v2.lang";

const dict = {
  "zh-TW": {
    appName: "Library Listen Looseleaf",
    shelf: "書架",
    demoBanner: "這是示範書架，方便先看畫面。用 Google 登入之後，會改讀你雲端硬碟裡名為 Library 的資料夾。",
    signedOut: "尚未登入。下面是示範書，音檔是靜音，用來試播放器。",
    yourLibrary: "你的 Library",
    demoShelf: "示範書架",
    signIn: "用 Google 登入",
    signOut: "登出",
    signingIn: "正在打開 Google…",
    scanning: "正在讀 Library 資料夾…",
    openBook: "開啟",
    backShelf: "回書架",
    backBook: "回這一本",
    openPlayer: "打開播放器",
    play: "播放",
    pause: "暫停",
    paused: "暫停中",
    waiting: "已停在上次的位置。按播放才會開始。",
    lastHeard: "上次聽到",
    startHere: "從開頭開始，按播放才會出聲。",
    chapters: "章節",
    ebook: "這個資料夾裡有電子書",
    search: "搜尋書名或章節",
    searchLabel: "搜尋",
    noMatchTitle: "沒有符合的書",
    noMatch: "換一個詞，或把搜尋清掉。",
    continue: "繼續聽",
    prev: "上一章",
    next: "下一章",
    back30: "退 30 秒",
    fwd30: "進 30 秒",
    seek: "進度",
    language: "語言",
    pickFolder: "找到不只一個名為 Library 的資料夾。請選要讀的那一個。",
    yourDrive: "你的雲端硬碟",
    shared: "與你分享",
    sharedBy: "分享",
    errorGeneric: "讀資料夾時發生問題。可以再試一次。",
    errorNoLibrary: "這個 Google 帳號看不到名為 Library 的資料夾。請先把那個資料夾分享給這個帳號，檢視者就夠了。",
    errorDenied: "Google 沒有同意讀取雲端硬碟。請改用看得到 Library 的帳號。",
    errorConfig: "Google 登入還沒設好。",
    cancelled: "登入已取消。",
    retry: "再試一次",
    emptyLibrary: "這個 Library 資料夾裡沒有聽書音檔。",
    chapterWord: "章",
  },
  en: {
    appName: "Library Listen Looseleaf",
    shelf: "Shelf",
    demoBanner:
      "This is a demo shelf so you can look around. After you sign in with Google, it reads the Drive folder named Library.",
    signedOut: "Signed out. The books below are samples. The audio is silence, so you can try the player.",
    yourLibrary: "Your Library",
    demoShelf: "Demo shelf",
    signIn: "Sign in with Google",
    signOut: "Sign out",
    signingIn: "Opening Google…",
    scanning: "Reading the Library folder…",
    openBook: "Open",
    backShelf: "Back to shelf",
    backBook: "Back to this book",
    openPlayer: "Open player",
    play: "Play",
    pause: "Pause",
    paused: "Paused",
    waiting: "Stopped at the last position. Nothing plays until you press Play.",
    lastHeard: "Last stopped at",
    startHere: "Starts at the beginning. Press Play to hear it.",
    chapters: "Chapters",
    ebook: "An ebook is in this folder",
    search: "Search title or chapter",
    searchLabel: "Search",
    noMatchTitle: "No matching books",
    noMatch: "Try another word, or clear the search.",
    continue: "Continue",
    prev: "Previous chapter",
    next: "Next chapter",
    back30: "Back 30 seconds",
    fwd30: "Forward 30 seconds",
    seek: "Position",
    language: "Language",
    pickFolder: "More than one folder is named Library. Pick the one to read.",
    yourDrive: "your Drive",
    shared: "shared with you",
    sharedBy: "shared by",
    errorGeneric: "Something went wrong while reading the folder. You can try again.",
    errorNoLibrary:
      "This Google account cannot see a folder named Library. Share that folder with this account. Viewer is enough.",
    errorDenied: "Google did not grant Drive access. Sign in with the account that can see Library.",
    errorConfig: "Google sign-in is not set up yet.",
    cancelled: "Sign-in was cancelled.",
    retry: "Try again",
    emptyLibrary: "This Library folder has no audiobook files.",
    chapterWord: "chapters",
  },
} as const;

export type Copy = { [K in keyof (typeof dict)["zh-TW"]]: string };

export function copy(lang: Lang): Copy {
  return dict[lang];
}

export function chapterCount(lang: Lang, count: number) {
  return lang === "zh-TW" ? `${count} 個章節` : `${count} ${count === 1 ? "chapter" : "chapters"}`;
}

export function folderCaption(lang: Lang, owned: boolean | undefined, owner: string) {
  const text = copy(lang);
  if (owned) return text.yourDrive;
  if (owner) return lang === "zh-TW" ? `由 ${owner} 分享` : `shared by ${owner}`;
  return text.shared;
}
