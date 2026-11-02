import { describe, expect, it } from "vitest";
import {
  applyProgress,
  buildLibrary,
  planChapterChoice,
  planPausedOpen,
  resolveBookMedia,
  seriesNames,
  type Entry,
  type ProgressMap,
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
