/** Pure shelf, progress, and "open paused" helpers. No DOM. */

export const AUDIO_EXT = new Set(["mp3", "m4a", "m4b", "aac"]);
export const COVER_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
export const EPUB_EXT = new Set(["epub"]);

export const PROGRESS_KEY = "librarylisten.v2.progress";

export type LibFile = {
  name: string;
  size?: number;
  driveId?: string;
  url?: string;
  type?: string;
};

export type Entry = { path: string; file: LibFile };

export type Chapter = {
  id: string;
  index: number;
  title: string;
  file: LibFile;
  url: string;
};

export type Book = {
  id: string;
  seriesFolder: string;
  seriesZh: string;
  seriesEn: string;
  folder: string;
  title: string;
  chapters: Chapter[];
  coverFile: LibFile | null;
  coverUrl: string;
  ebookName: string | null;
};

export type ChapterProgress = {
  positionSeconds: number;
  chapterDurationSeconds: number | null;
  updatedAt: string;
};

export type BookProgress = {
  chapterId: string;
  positionSeconds: number;
  chapterDurationSeconds: number | null;
  updatedAt: string;
  chapters: Record<string, ChapterProgress>;
};

export type ProgressMap = Record<string, BookProgress>;

export type Store = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function slug(value: string) {
  const folded = value.normalize("NFKD").replace(/\p{M}/gu, "");
  const cleaned = folded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "item";
}

export function stableId(value: string) {
  const id = slug(value);
  if (id !== "item") return id;
  let hash = 0;
  for (const ch of value) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return `id-${hash.toString(36)}`;
}

export function pathParts(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.?\//, "").split("/").filter((part) => part && part !== ".");
}

export function shouldSkipPath(parts: string[]) {
  return parts.some((part) => part.startsWith("_") || part.startsWith("."));
}

/** `上學不容易-Middle-School` → 中文 上學不容易、英文 Middle School. */
export function seriesNames(folder: string) {
  const name = folder.normalize("NFC").trim();
  const split = name.match(/^(.+?)-([A-Za-z0-9].*)$/);
  if (split && /[\u3400-\u9fff]/.test(split[1])) {
    return { zh: split[1].trim(), en: spaceEnglish(split[2]) };
  }
  if (/[\u3400-\u9fff]/.test(name)) return { zh: name, en: spaceEnglish(name) };
  const en = spaceEnglish(name);
  return { zh: en, en };
}

function spaceEnglish(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleFromFilename(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "");
  const part = base.match(/(?:^|[-_\s])part\s*0*(\d+)$/i);
  if (part) return `Part ${String(Number(part[1])).padStart(2, "0")}`;
  if (/^\d+$/.test(base)) return `Part ${base.padStart(2, "0")}`;
  const numbered = base.replace(/^\s*\d+\s*[-.)]+\s*/, "").trim();
  return numbered || base;
}

export function titleFromFolder(folder: string) {
  return spaceEnglish(folder) || folder;
}

function locateListen(parts: string[]) {
  const idx = parts.map((part) => part.toLowerCase()).lastIndexOf("listen");
  if (idx < 0) return null;
  const series = idx > 0 ? parts[idx - 1] : "Library";
  const rest = parts.slice(idx + 1);
  if (!rest.length) return null;
  if (rest.length === 1) {
    const leaf = rest[0];
    if (AUDIO_EXT.has(extOf(leaf))) return { series, book: leaf.replace(/\.[^.]+$/, "") };
    return { series, book: series };
  }
  return { series, book: rest[0] };
}

function locateEbook(parts: string[]) {
  const idx = parts.map((part) => part.toLowerCase()).lastIndexOf("ebooks");
  if (idx < 0) return null;
  const series = idx > 0 ? parts[idx - 1] : "Library";
  const rest = parts.slice(idx + 1);
  if (!rest.length) return null;
  if (rest.length === 1) {
    if (!EPUB_EXT.has(extOf(rest[0]))) return null;
    return { series, book: rest[0].replace(/\.[^.]+$/, "") };
  }
  return { series, book: rest[0] };
}

function pickCover(files: Entry[]) {
  return [...files].sort((a, b) => {
    const score = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes("cover")) return 0;
      if (n.includes("folder")) return 1;
      return 2;
    };
    return score(a.file.name) - score(b.file.name) || a.file.name.localeCompare(b.file.name);
  })[0];
}

type Group = {
  seriesFolder: string;
  bookFolder: string;
  audio: Entry[];
  covers: Entry[];
  ebook: Entry | null;
};

/**
 * Series layout: `<中文>-<English>/listen/<book>/` audio, plus sibling `ebooks/` and covers.
 */
export function buildLibrary(entries: Entry[]): Book[] {
  const groups = new Map<string, Group>();
  const ebooks = new Map<string, Entry>();
  const keyOf = (series: string, book: string) => `${series}::${slug(book)}`;

  for (const entry of entries) {
    const parts = pathParts(entry.path || entry.file.name);
    if (shouldSkipPath(parts) || !entry.file?.name) continue;
    const ext = extOf(entry.file.name);
    const size = Number(entry.file.size ?? 0);
    if (parts.some((part) => part.toLowerCase() === "ebooks")) {
      const located = locateEbook(parts);
      if (!located || !EPUB_EXT.has(ext) || size === 0) continue;
      ebooks.set(keyOf(located.series, located.book), entry);
      continue;
    }
    if (!AUDIO_EXT.has(ext) && !COVER_EXT.has(ext)) continue;
    if (AUDIO_EXT.has(ext) && size === 0) continue;
    const located = locateListen(parts);
    if (!located) continue;
    const key = keyOf(located.series, located.book);
    let group = groups.get(key);
    if (!group) {
      group = { seriesFolder: located.series, bookFolder: located.book, audio: [], covers: [], ebook: null };
      groups.set(key, group);
    }
    if (AUDIO_EXT.has(ext)) group.audio.push(entry);
    else group.covers.push(entry);
  }

  for (const [key, entry] of ebooks) {
    const exact = groups.get(key);
    if (exact) {
      exact.ebook = entry;
      continue;
    }
    const bookSlug = key.split("::")[1];
    for (const group of groups.values()) {
      if (!group.ebook && slug(group.bookFolder) === bookSlug) {
        group.ebook = entry;
        break;
      }
    }
  }

  const books: Book[] = [];
  for (const group of groups.values()) {
    if (!group.audio.length) continue;
    group.audio.sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, { numeric: true, sensitivity: "base" }));
    const names = seriesNames(group.seriesFolder);
    const cover = pickCover(group.covers);
    books.push({
      id: `${stableId(names.en)}/${stableId(group.bookFolder)}`,
      seriesFolder: group.seriesFolder,
      seriesZh: names.zh,
      seriesEn: names.en,
      folder: group.bookFolder,
      title: titleFromFolder(group.bookFolder),
      chapters: group.audio.map((entry, index) => ({
        id: entry.file.name,
        index,
        title: titleFromFilename(entry.file.name),
        file: entry.file,
        url: "",
      })),
      coverFile: cover?.file ?? null,
      coverUrl: "",
      ebookName: group.ebook?.file.name ?? null,
    });
  }

  return books.sort(
    (a, b) => a.seriesZh.localeCompare(b.seriesZh, "zh-Hant") || a.title.localeCompare(b.title, "en"),
  );
}

export function resolveBookMedia(book: Book, base = "/"): Book {
  const root = base.endsWith("/") ? base : `${base}/`;
  const urlFor = (file: LibFile | null | undefined) => {
    if (!file) return "";
    if (file.url) {
      if (/^(https?:|blob:|data:)/.test(file.url)) return file.url;
      return root + file.url.replace(/^\//, "");
    }
    if (file.driveId) {
      return `${root}drive-media/${encodeURIComponent(file.driveId)}?name=${encodeURIComponent(file.name)}`;
    }
    return "";
  };
  return {
    ...book,
    coverUrl: urlFor(book.coverFile),
    chapters: book.chapters.map((chapter) => ({ ...chapter, url: urlFor(chapter.file) })),
  };
}

export function loadProgress(store: Store | null = defaultStore()): ProgressMap {
  try {
    const raw = store?.getItem(PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as ProgressMap) : {};
  } catch {
    return {};
  }
}

export function saveProgressMap(map: ProgressMap, store: Store | null = defaultStore()) {
  try {
    store?.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {
    /* private mode / quota */
  }
}

export function applyProgress(
  map: ProgressMap,
  bookId: string,
  chapterId: string,
  positionSeconds: number,
  chapterDurationSeconds: number | null,
  now = new Date().toISOString(),
): ProgressMap {
  const previous = map[bookId];
  const chapters = { ...(previous?.chapters ?? {}) };
  const pos = Math.round(Math.max(0, positionSeconds) * 100) / 100;
  const duration =
    Number.isFinite(chapterDurationSeconds) && (chapterDurationSeconds ?? 0) > 0
      ? chapterDurationSeconds
      : (chapters[chapterId]?.chapterDurationSeconds ?? null);
  chapters[chapterId] = { positionSeconds: pos, chapterDurationSeconds: duration, updatedAt: now };
  return {
    ...map,
    [bookId]: {
      chapterId,
      positionSeconds: pos,
      chapterDurationSeconds: duration,
      updatedAt: now,
      chapters,
    },
  };
}

/**
 * Opening a book cues the saved chapter and does not start audio.
 * `autoplay` is always false. The Play button starts playback later.
 */
export function planPausedOpen(book: Book, progress: ProgressMap | null | undefined) {
  const record = progress?.[book.id] ?? null;
  const chapters = book.chapters ?? [];
  let chapterIndex = 0;
  if (record?.chapterId) {
    const found = chapters.findIndex((chapter) => chapter.id === record.chapterId);
    if (found >= 0) chapterIndex = found;
  }
  const chapter = chapters[chapterIndex] ?? null;
  const saved = chapter ? (record?.chapters?.[chapter.id] ?? null) : null;
  let seek = 0;
  if (saved && Number.isFinite(saved.positionSeconds)) seek = saved.positionSeconds;
  else if (chapter && record?.chapterId === chapter.id && Number.isFinite(record.positionSeconds)) {
    seek = record.positionSeconds;
  }
  const dur = saved?.chapterDurationSeconds ?? null;
  if (dur && dur > 0 && seek >= dur - 2) seek = 0;
  if (!Number.isFinite(seek) || seek < 0) seek = 0;
  return {
    autoplay: false as const,
    chapterIndex,
    chapterId: chapter?.id ?? null,
    seekSeconds: seek,
    chapterTitle: chapter?.title ?? "",
  };
}

export function bookFraction(book: Book, progress: ProgressMap) {
  const record = progress[book.id];
  if (!record || !book.chapters.length) return null;
  const index = book.chapters.findIndex((chapter) => chapter.id === record.chapterId);
  if (index < 0) return null;
  const dur = record.chapters?.[record.chapterId]?.chapterDurationSeconds ?? record.chapterDurationSeconds ?? 0;
  const pos = record.chapters?.[record.chapterId]?.positionSeconds ?? record.positionSeconds ?? 0;
  const within = dur > 0 ? Math.min(1, Math.max(0, pos / dur)) : 0;
  return (index + within) / book.chapters.length;
}

export function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const whole = Math.floor(seconds);
  const s = whole % 60;
  const m = Math.floor(whole / 60) % 60;
  const h = Math.floor(whole / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function defaultStore(): Store | null {
  try {
    if (typeof globalThis.localStorage !== "undefined") return globalThis.localStorage;
  } catch {
    /* private mode */
  }
  return null;
}
