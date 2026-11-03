import { describe, expect, it } from "vitest";
import { buildLibrary, type Entry } from "./library";
import { playbackSession, SESSION_ART_SIZE } from "./media-session";

function entry(path: string): Entry {
  const name = path.split("/").pop() || path;
  return { path, file: { name, size: 1200 } };
}

const page = "https://bigdaddy109.github.io/library-listen-looseleaf";
const base = "/library-listen-looseleaf/";

function artSrc(bookPath: string, chapterIndex = 0) {
  const book = buildLibrary([entry(bookPath)])[0];
  if (!book) throw new Error(bookPath);
  const chapter = book.chapters[chapterIndex];
  if (!chapter) throw new Error("missing chapter");
  const meta = playbackSession(book, chapter, page, base);
  return { book, chapter, meta, src: meta.artwork.find((image) => image.sizes === SESSION_ART_SIZE)?.src ?? "" };
}

describe("playback session", () => {
  it("uses the chapter as the title and that book's icon, not Open player", () => {
    const hatchet = buildLibrary([
      entry("Library/手斧男孩-Hatchet/listen/Hatchet/01 - The Lake.mp3"),
      entry("Library/手斧男孩-Hatchet/listen/Hatchet/02 - The Crash.mp3"),
    ])[0];
    const crash = hatchet?.chapters.find((chapter) => chapter.title === "The Crash");
    if (!hatchet || !crash) throw new Error("missing hatchet");
    const meta = playbackSession(hatchet, crash, page, base);
    expect(meta.title).toBe("The Crash");
    expect(meta.artist).toBe("Hatchet");
    expect(`${meta.title} ${meta.artist} ${meta.album}`).not.toContain("Open player");
    expect(`${meta.title} ${meta.artist} ${meta.album}`).not.toContain("Library Listen");
    const artwork = meta.artwork.find((image) => image.sizes === SESSION_ART_SIZE);
    expect(artwork?.type).toBe("image/png");
    expect(artwork?.src).toBe("https://bigdaddy109.github.io/library-listen-looseleaf/session-art/hatchet.png");
    expect(artwork?.src.startsWith("https://")).toBe(true);

    const school = artSrc("Library/上學不容易-Middle-School/listen/Middle School 01 - First Day/01 - First Bell.mp3");
    expect(school.meta.title).toBe("First Bell");
    expect(school.src).toBe("https://bigdaddy109.github.io/library-listen-looseleaf/session-art/middle-school.png");
    expect(school.src).not.toBe(artwork?.src);

    expect(artSrc("Library/Immune/listen/Immune Part01/01.mp3").src).toContain("/session-art/immune.png");
    expect(artSrc("Library/What If/listen/What If/01.mp3").src).toContain("/session-art/what-if.png");
    expect(artSrc("Library/What If 2/listen/What If 2/01.mp3").src).toContain("/session-art/what-if-2.png");
    expect(artSrc("Library/門羅-WhatIf/listen/What If/01.mp3").src).toContain("/session-art/what-if.png");
    expect(artSrc("Library/門羅-WhatIf2/listen/What If 2/01.mp3").src).toContain("/session-art/what-if-2.png");

    const other = artSrc("Library/How To/listen/How To/01 - Start.mp3");
    expect(other.meta.title).toBe("Start");
    expect(other.src).toBe("https://bigdaddy109.github.io/library-listen-looseleaf/session-art/book.png");
    expect(other.src).not.toMatch(/cover|drive/i);
  });
});
