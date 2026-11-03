import { describe, expect, it } from "vitest";
import { copy } from "./i18n";
import {
  applyProgress,
  buildLibrary,
  planChapterChoice,
  planPausedOpen,
  planStepChapter,
  planTrackEnded,
  PLAYBACK_MODE_KEY,
  readPlaybackMode,
  savePlaybackMode,
  resolveBookMedia,
  seriesIconName,
  seriesNames,
  type Entry,
  type ProgressMap,
  type Store,
} from "./library";

function file(name: string, size = 1200): Entry["file"] {
  return { name, size };
}

function entry(path: string, size = 1200): Entry {
  const name = path.split("/").pop() || path;
  return { path, file: file(name, size) };
}

const sample: Entry[] = [
  entry("Library/上學不容易-Middle-School/listen/Middle School 01 - First Day/01.mp3"),
  entry("Library/上學不容易-Middle-School/listen/Middle School 01 - First Day/02.mp3"),
  entry("Library/上學不容易-Middle-School/listen/Middle School 01 - First Day/cover.jpg", 40),
  entry("Library/上學不容易-Middle-School/ebooks/Middle School 01 - First Day.epub"),
  entry("Library/上學不容易-Middle-School/listen/Middle School 02 - Get Me Out/01 - Hallway.mp3"),
  entry("Library/上學不容易-Middle-School/_source/secret.mp3"),
  entry("Library/手斧男孩-Hatchet/listen/Hatchet/01 - The Lake.mp3"),
  entry("Library/手斧男孩-Hatchet/listen/Hatchet/02 - The Crash.mp3"),
  entry("Library/手斧男孩-Hatchet/listen/Hatchet/03 - The Shelter.mp3"),
  entry("Library/手斧男孩-Hatchet/ebooks/Hatchet.epub"),
  entry("Library/手斧男孩-Hatchet/listen/Hatchet/notes.pdf"),
];

describe("series names", () => {
  it("splits Chinese-English folder names", () => {
    expect(seriesNames("上學不容易-Middle-School")).toEqual({ zh: "上學不容易", en: "Middle School" });
    expect(seriesNames("手斧男孩-Hatchet")).toEqual({ zh: "手斧男孩", en: "Hatchet" });
    expect(seriesNames("門羅-WhatIf")).toEqual({ zh: "門羅", en: "What If" });
  });
});

describe("series icons", () => {
  it("uses the What If drawing for What If and What If?", () => {
    const whatIf = buildLibrary([entry("Library/What If/listen/What If/01.mp3")])[0];
    const punctuated = buildLibrary([entry("Library/What If？/listen/What If？/01.mp3")])[0];
    const bilingual = buildLibrary([entry("Library/門羅-WhatIf/listen/What If/01.mp3")])[0];
    const sequel = buildLibrary([entry("Library/What If 2/listen/What If 2/01.mp3")])[0];
    const sequelMark = buildLibrary([entry("Library/What If? 2/listen/What If? 2/01.mp3")])[0];
    expect(whatIf?.title).toBe("What If");
    expect(whatIf && seriesIconName(whatIf)).toBe("what-if");
    expect(punctuated && seriesIconName(punctuated)).toBe("what-if");
    expect(bilingual?.seriesEn).toBe("What If");
    expect(bilingual && seriesIconName(bilingual)).toBe("what-if");
    expect(sequel && seriesIconName(sequel)).toBeNull();
    expect(sequelMark && seriesIconName(sequelMark)).toBeNull();
  });

  it("keeps hatchet, middle school, and immune", () => {
    const books = buildLibrary(sample);
    const hatchet = books.find((book) => book.seriesEn === "Hatchet");
    const school = books.find((book) => book.seriesEn === "Middle School");
    const immune = buildLibrary([entry("Library/Immune/listen/Immune Part01/01.mp3")])[0];
    expect(hatchet && seriesIconName(hatchet)).toBe("hatchet");
    expect(school && seriesIconName(school)).toBe("middle-school");
    expect(immune && seriesIconName(immune)).toBe("immune");
  });
});

describe("buildLibrary", () => {
  const books = buildLibrary(sample);

  it("builds one book per listen folder and skips _source and pdf", () => {
    expect(books.map((book) => book.title)).toEqual([
      "Middle School 01 First Day",
      "Middle School 02 Get Me Out",
      "Hatchet",
    ]);
    expect(books.find((book) => book.title === "Hatchet")?.chapters.map((chapter) => chapter.title)).toEqual([
      "The Lake",
      "The Crash",
      "The Shelter",
    ]);
  });

  it("collects Immune parts into one book and keeps Middle School titles apart", () => {
    const grouped = buildLibrary([
      entry("Library/Immune/listen/Immune Part01/01.mp3"),
      entry("Library/Immune/listen/Immune Part02/02.mp3"),
      entry("Library/上學不容易-Middle-School/listen/Middle School 01 - First Day/01.mp3"),
      entry("Library/上學不容易-Middle-School/listen/Middle School 02 - Get Me Out/01.mp3"),
    ]);
    const immune = grouped.filter((book) => book.seriesFolder === "Immune");
    expect(immune.map((book) => book.title)).toEqual(["Immune"]);
    expect(immune[0]?.chapters.map((chapter) => chapter.title)).toEqual(["Part 01", "Part 02"]);
    expect(grouped.filter((book) => book.seriesEn === "Middle School").map((book) => book.title)).toEqual([
      "Middle School 01 First Day",
      "Middle School 02 Get Me Out",
    ]);

    const loose = buildLibrary([
      entry("Library/Immune/listen/Immune-Part01.mp3"),
      entry("Library/Immune/listen/Immune-Part02.mp3"),
    ]);
    expect(loose.map((book) => book.title)).toEqual(["Immune"]);
    expect(loose[0]?.chapters.map((chapter) => chapter.title)).toEqual(["Part 01", "Part 02"]);

    const halves = buildLibrary([
      entry("Library/紅樓夢/listen/紅樓夢上/01.mp3"),
      entry("Library/紅樓夢/listen/紅樓夢下/01.mp3"),
      entry("Library/免疫/listen/免疫 第1部/01.mp3"),
      entry("Library/免疫/listen/免疫 第2部/01.mp3"),
    ]);
    expect(halves.find((book) => book.seriesFolder === "紅樓夢")?.title).toBe("紅樓夢");
    expect(halves.find((book) => book.seriesFolder === "紅樓夢")?.chapters.map((chapter) => chapter.title)).toEqual(["上", "下"]);
    expect(halves.find((book) => book.seriesFolder === "免疫")?.chapters.map((chapter) => chapter.title)).toEqual(["第1部", "第2部"]);
  });

  it("keeps both languages and pairs the epub", () => {
    const hatchet = books.find((book) => book.id === "hatchet/hatchet");
    expect(hatchet?.seriesZh).toBe("手斧男孩");
    expect(hatchet?.seriesEn).toBe("Hatchet");
    expect(hatchet?.ebookName).toBe("Hatchet.epub");
    const school = books.find((book) => book.folder.startsWith("Middle School 01"));
    expect(school?.ebookName).toBe("Middle School 01 - First Day.epub");
    expect(school?.coverFile?.name).toBe("cover.jpg");
  });
});

describe("playback mode", () => {
  const hatchet = buildLibrary(sample).find((book) => book.id === "hatchet/hatchet");
  if (!hatchet) throw new Error("missing hatchet");

  function memory(initial: Record<string, string> = {}): Store {
    const data = { ...initial };
    return {
      getItem: (key) => data[key] ?? null,
      setItem: (key, value) => {
        data[key] = value;
      },
    };
  }

  it("drops the end-of-chapter prompt and defaults to 接續播放", () => {
    for (const lang of ["zh-TW", "en"] as const) {
      const values = Object.values(copy(lang)).join("\n");
      expect(values).not.toContain("這一章結束了");
      expect(values).not.toContain("接著播放");
      expect(values).not.toContain("停在這裡");
      expect(values).not.toContain("This chapter is finished");
      expect(values).not.toContain("Stop here");
    }
    expect(copy("zh-TW").continuePlay).toBe("接續播放");
    expect(copy("zh-TW").repeatTrack).toBe("重複播放（單一音檔）");
    expect(readPlaybackMode(memory())).toBe("continue");
  });

  it("repeats the current track, continues to the next, and remembers the mode", () => {
    const repeat = planTrackEnded("repeat", hatchet.chapters.length, 0);
    expect(repeat.autoplay).toBe(true);
    expect(repeat.action).toBe("repeat");
    expect(repeat.chapterIndex).toBe(0);

    const next = planTrackEnded("continue", hatchet.chapters.length, 0);
    expect(next.autoplay).toBe(true);
    expect(next.action).toBe("advance");
    expect(next.chapterIndex).toBe(1);

    const last = planTrackEnded("continue", hatchet.chapters.length, hatchet.chapters.length - 1);
    expect(last.autoplay).toBe(false);
    expect(last.action).toBe("stop");

    const store = memory();
    savePlaybackMode("repeat", store);
    expect(readPlaybackMode(store)).toBe("repeat");
    expect(store.getItem(PLAYBACK_MODE_KEY)).toBe("repeat");
    expect(readPlaybackMode(memory({ [PLAYBACK_MODE_KEY]: "continue" }))).toBe("continue");
  });

  it("starts playback when Next chapter is pressed", () => {
    const next = planStepChapter(hatchet, {}, 0, 1);
    expect(next.autoplay).toBe(true);
    expect(next.moved).toBe(true);
    expect(next.chapterIndex).toBe(1);
    expect(next.chapterTitle).toBe("The Crash");
  });
});

describe("open paused", () => {
  const hatchet = buildLibrary(sample).find((book) => book.id === "hatchet/hatchet");
  if (!hatchet) throw new Error("missing hatchet");

  it("stops at the saved spot and never autoplays", () => {
    const progress: ProgressMap = applyProgress({}, hatchet.id, "02 - The Crash.mp3", 45, 90, "2026-11-02T00:00:00.000Z");
    const plan = planPausedOpen(hatchet, progress);
    expect(plan.autoplay).toBe(false);
    expect(plan.chapterId).toBe("02 - The Crash.mp3");
    expect(plan.chapterTitle).toBe("The Crash");
    expect(plan.seekSeconds).toBe(45);
  });

  it("stays paused when a book opens, and plays when a chapter is chosen", () => {
    const progress: ProgressMap = applyProgress({}, hatchet.id, "02 - The Crash.mp3", 45, 90, "2026-11-02T00:00:00.000Z");
    const opened = planPausedOpen(hatchet, progress);
    expect(opened.autoplay).toBe(false);
    expect(opened.chapterId).toBe("02 - The Crash.mp3");
    expect(opened.chapterIndex).toBe(1);
    expect(opened.seekSeconds).toBe(45);

    const same = planChapterChoice(hatchet, progress, opened.chapterIndex, {
      chapterIndex: opened.chapterIndex,
      seconds: 12,
    });
    expect(same.autoplay).toBe(true);
    expect(same.resume).toBe(true);
    expect(same.chapterId).toBe("02 - The Crash.mp3");
    expect(same.seekSeconds).toBe(12);

    const other = planChapterChoice(hatchet, progress, 0, {
      chapterIndex: opened.chapterIndex,
      seconds: 12,
    });
    expect(other.autoplay).toBe(true);
    expect(other.resume).toBe(false);
    expect(other.chapterIndex).toBe(0);
    expect(other.chapterId).toBe("01 - The Lake.mp3");
    expect(other.seekSeconds).toBe(0);

    const finished = applyProgress(progress, hatchet.id, "03 - The Shelter.mp3", 88, 90);
    const shelter = planChapterChoice(hatchet, finished, 2, { chapterIndex: 1, seconds: 12 });
    expect(shelter.autoplay).toBe(true);
    expect(shelter.resume).toBe(false);
    expect(shelter.chapterId).toBe("03 - The Shelter.mp3");
    expect(shelter.seekSeconds).toBe(0);
  });

  it("does not borrow another chapter's position", () => {
    const progress: ProgressMap = applyProgress({}, hatchet.id, "02 - The Crash.mp3", 45, 90);
    const other = { ...hatchet, id: "real/hatchet", chapters: [{ ...hatchet.chapters[0], id: "01-real.mp3" }] };
    const plan = planPausedOpen(other, progress);
    expect(plan.autoplay).toBe(false);
    expect(plan.seekSeconds).toBe(0);
    expect(plan.chapterIndex).toBe(0);
  });

  it("resolves demo and drive urls without starting playback", () => {
    const demo = resolveBookMedia(
      { ...hatchet, chapters: [{ ...hatchet.chapters[0], file: { ...hatchet.chapters[0].file, url: "demo/silence.mp3" } }] },
      "/library-listen-looseleaf/",
    );
    expect(demo.chapters[0].url).toBe("/library-listen-looseleaf/demo/silence.mp3");
    const drive = resolveBookMedia(
      {
        ...hatchet,
        chapters: [{ ...hatchet.chapters[0], file: { name: "01.mp3", driveId: "abc", size: 10 } }],
        coverFile: { name: "cover.jpg", driveId: "cov", size: 10 },
      },
      "/",
    );
    expect(drive.chapters[0].url).toContain("/drive-media/abc");
    expect(drive.coverUrl).toContain("/drive-media/cov");
  });
});
