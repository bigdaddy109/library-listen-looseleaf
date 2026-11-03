/** Pure shelf, progress, and "open paused" helpers. No DOM. */

export const AUDIO_EXT = new Set(["mp3", "m4a", "m4b", "aac"]);
export const COVER_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
export const EPUB_EXT = new Set(["epub"]);

export const PROGRESS_KEY = "librarylisten.v2.progress";
export const PLAYBACK_MODE_KEY = "librarylisten.v2.playbackMode";

/** `continue` is 接續播放. `repeat` is 重複播放（單一音檔）. */
export type PlaybackMode = "continue" | "repeat";

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

export type SeriesIconName = "hatchet" | "immune" | "middle-school" | "what-if" | "what-if-2";

/** `What If?` and `WhatIf2` collapse to the series name, without matching a longer title. */
function whatIfKey(value: string) {
  return value
    .normalize("NFC")
    .replace(/[?？]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ");
}

export function seriesIconName(book: { seriesZh: string; seriesEn: string }): SeriesIconName | null {
  const series = `${book.seriesZh} ${book.seriesEn}`;
  const lower = series.toLowerCase();
  if (lower.includes("hatchet") || book.seriesZh.includes("斧")) return "hatchet";
  if (lower.includes("immune") || book.seriesZh.includes("免疫")) return "immune";
  if (whatIfKey(book.seriesEn) === "what if 2") return "what-if-2";
  if (whatIfKey(book.seriesEn) === "what if" || whatIfKey(book.seriesZh) === "what if") return "what-if";
  if (lower.includes("school") || book.seriesZh.includes("學")) return "middle-school";
  return null;
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

type PartMark = { stem: string; order: number; kind: "part" | "juan" | "half" };

/**
 * Titles that are the same book split by a part marker.
 * `Immune Part01` and `Immune Part02` share the stem `Immune`.
 * A bare volume number, as in `Middle School 01`, is not a part marker.
 */
export function partStem(title: string): PartMark | null {
  const name = title.normalize("NFC").replace(/\s+/g, " ").trim();
  const part = name.match(/^(.*?)(?:\s+|[-_])?(?:part|pt\.?)\s*0*(\d+)\s*$/i);
  if (part && part[2]) {
    return { stem: cleanStem(part[1] ?? ""), order: Number(part[2]), kind: "part" };
  }
  const juan = name.match(/^(.*?)第\s*0*(\d+)\s*部\s*$/);
  if (juan && juan[2]) {
    return { stem: cleanStem(juan[1] ?? ""), order: Number(juan[2]), kind: "juan" };
  }
  const half = name.match(/^(.*?)(?:\s+|[-_])?([上下])$/);
  if (half?.[2] && cleanStem(half[1] ?? "")) {
    return { stem: cleanStem(half[1] ?? ""), order: half[2] === "上" ? 1 : 2, kind: "half" };
  }
  return null;
}

function cleanStem(value: string) {
  return value.replace(/[\s_-]+$/g, "").replace(/^[\s_-]+/g, "").trim();
}

function partLabel(mark: PartMark) {
  if (mark.kind === "juan") return `第${mark.order}部`;
  if (mark.kind === "half") return mark.order === 1 ? "上" : "下";
  return `Part ${String(mark.order).padStart(2, "0")}`;
}

function mergePartBooks(books: Book[]): Book[] {
  const alone: Book[] = [];
  const buckets = new Map<string, Book[]>();
  for (const book of books) {
    const mark = partStem(book.title);
    if (!mark) {
      alone.push(book);
      continue;
    }
    const key = `${book.seriesFolder}\0${mark.stem.toLowerCase()}`;
    const list = buckets.get(key) ?? [];
    list.push(book);
    buckets.set(key, list);
  }
  const merged: Book[] = [];
  for (const list of buckets.values()) {
    if (list.length < 2) {
      if (list[0]) alone.push(list[0]);
      continue;
    }
    const ordered = list
      .map((book) => ({ book, mark: partStem(book.title) }))
      .filter((item): item is { book: Book; mark: PartMark } => item.mark != null)
      .sort((a, b) => a.mark.order - b.mark.order || a.book.title.localeCompare(b.book.title, "en"));
    const first = ordered[0];
    if (!first) continue;
    const stem = first.mark.stem || first.book.seriesEn || first.book.seriesZh;
    const chapters: Chapter[] = [];
    for (const item of ordered) {
      const label = partLabel(item.mark);
      for (const chapter of item.book.chapters) {
        chapters.push({
          ...chapter,
          index: chapters.length,
          title: item.book.chapters.length === 1 ? label : chapter.title,
          id: chapters.some((existing) => existing.id === chapter.id) ? `${item.book.folder}/${chapter.id}` : chapter.id,
        });
      }
    }
    merged.push({
      ...first.book,
      id: `${stableId(first.book.seriesEn)}/${stableId(stem)}`,
      folder: stem,
      title: stem,
      chapters,
      coverFile: ordered.find((item) => item.book.coverFile)?.book.coverFile ?? null,
      ebookName: ordered.find((item) => item.book.ebookName)?.book.ebookName ?? null,
    });
  }
  return [...alone, ...merged];
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
  const keyOf = (series: string, book: string) => `${series}::${stableId(book)}`;

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
      if (!group.ebook && stableId(group.bookFolder) === bookSlug) {
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

  return mergePartBooks(books).sort(
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
      const params = new URLSearchParams();
      params.set("name", file.name);
      if (file.size && file.size > 0) params.set("size", String(Math.round(file.size)));
      return `${root}drive-media/${encodeURIComponent(file.driveId)}?${params}`;
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
 * `autoplay` is always false. Playback starts later, from Play or a chapter tap.
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

export type ChapterChoice = {
  autoplay: true;
  /** The chosen chapter is already the current one, so keep the live playhead. */
  resume: boolean;
  chapterIndex: number;
  chapterId: string | null;
  seekSeconds: number;
  chapterTitle: string;
};

/**
 * Tapping a chapter starts playback.
 * The chapter already selected resumes from the live position.
 * A different chapter switches to it and plays from its own saved spot, or the start.
 * Opening a book stays on `planPausedOpen`, which never autoplays.
 */
export function planChapterChoice(
  book: Book,
  progress: ProgressMap | null | undefined,
  chapterIndex: number,
  live?: { chapterIndex: number; seconds: number } | null,
): ChapterChoice {
  const chapters = book.chapters ?? [];
  const index = chapters.length ? Math.min(chapters.length - 1, Math.max(0, chapterIndex)) : 0;
  const chapter = chapters[index] ?? null;
  const resume = !!live && !!chapter && live.chapterIndex === index;
  if (resume) {
    const seconds = Number.isFinite(live.seconds) && live.seconds > 0 ? live.seconds : 0;
    return {
      autoplay: true,
      resume: true,
      chapterIndex: index,
      chapterId: chapter.id,
      seekSeconds: seconds,
      chapterTitle: chapter.title,
    };
  }
  const record = progress?.[book.id] ?? null;
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
    autoplay: true,
    resume: false,
    chapterIndex: index,
    chapterId: chapter?.id ?? null,
    seekSeconds: seek,
    chapterTitle: chapter?.title ?? "",
  };
}

export function readPlaybackMode(store: Store | null = defaultStore()): PlaybackMode {
  try {
    return store?.getItem(PLAYBACK_MODE_KEY) === "repeat" ? "repeat" : "continue";
  } catch {
    return "continue";
  }
}

export function savePlaybackMode(mode: PlaybackMode, store: Store | null = defaultStore()) {
  try {
    store?.setItem(PLAYBACK_MODE_KEY, mode);
  } catch {
    /* private mode */
  }
}

/**
 * What to do when the current track reaches its end.
 * Repeat plays the same track again. Continue plays the next track, or stops on the last one.
 */
export function planTrackEnded(mode: PlaybackMode, chapterCount: number, chapterIndex: number) {
  const count = Math.max(0, chapterCount);
  const index = Number.isFinite(chapterIndex) ? Math.min(Math.max(0, chapterIndex), Math.max(0, count - 1)) : 0;
  if (mode === "repeat") {
    return { autoplay: true as const, action: "repeat" as const, chapterIndex: index };
  }
  if (index < count - 1) {
    return { autoplay: true as const, action: "advance" as const, chapterIndex: index + 1 };
  }
  return { autoplay: false as const, action: "stop" as const, chapterIndex: index };
}

/** Next and previous select that chapter and start it. Staying on the same chapter does not restart. */
export function planStepChapter(
  book: Book,
  progress: ProgressMap | null | undefined,
  chapterIndex: number,
  delta: number,
) {
  const count = book.chapters.length;
  const current = book.chapters[chapterIndex];
  if (!count) {
    return { autoplay: false as const, moved: false as const, chapterIndex: 0, seekSeconds: 0, chapterId: null, chapterTitle: "" };
  }
  const nextIndex = Math.min(count - 1, Math.max(0, chapterIndex + delta));
  if (nextIndex === chapterIndex) {
    return {
      autoplay: false as const,
      moved: false as const,
      chapterIndex,
      seekSeconds: 0,
      chapterId: current?.id ?? null,
      chapterTitle: current?.title ?? "",
    };
  }
  const plan = planChapterChoice(book, progress, nextIndex, { chapterIndex, seconds: 0 });
  return { ...plan, moved: true as const };
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
