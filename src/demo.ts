import { applyProgress, buildLibrary, loadProgress, resolveBookMedia, saveProgressMap, type Book, type Entry } from "./library";

const silence = "demo/silence.mp3";

function entry(path: string): Entry {
  const name = path.split("/").pop() || path;
  const audio = /\.(mp3|m4a|m4b|aac)$/i.test(name);
  return { path, file: { name, size: audio ? 8000 : 2000, url: audio ? silence : undefined } };
}

/** Sample shelf in the same folder shape as Jeff's Drive Library. Audio is a short silent file. */
export function demoEntries(): Entry[] {
  return [
    entry("Library/上學不容易-Middle-School/listen/Middle School 01 - First Day/01 - First Bell.mp3"),
    entry("Library/上學不容易-Middle-School/listen/Middle School 01 - First Day/02 - The Cafeteria.mp3"),
    entry("Library/上學不容易-Middle-School/ebooks/Middle School 01 - First Day.epub"),
    entry("Library/上學不容易-Middle-School/listen/Middle School 02 - Get Me Out/01 - Hallway.mp3"),
    entry("Library/手斧男孩-Hatchet/listen/Hatchet/01 - The Lake.mp3"),
    entry("Library/手斧男孩-Hatchet/listen/Hatchet/02 - The Crash.mp3"),
    entry("Library/手斧男孩-Hatchet/listen/Hatchet/03 - The Shelter.mp3"),
    entry("Library/手斧男孩-Hatchet/ebooks/Hatchet.epub"),
  ];
}

export function demoBooks(base = "/"): Book[] {
  return buildLibrary(demoEntries()).map((book) => resolveBookMedia({ ...book, id: `demo:${book.id}` }, base));
}

export const DEMO_HATCHET_ID = "demo:hatchet/hatchet";
export const DEMO_CHAPTER_ID = "02 - The Crash.mp3";

/** So the first visit can show "stopped at the last position" without pretending it is Jeff's real progress. */
export function ensureDemoProgress() {
  const map = loadProgress();
  if (map[DEMO_HATCHET_ID]) return map;
  const next = applyProgress(map, DEMO_HATCHET_ID, DEMO_CHAPTER_ID, 45, 90, "2026-11-02T00:00:00.000Z");
  saveProgressMap(next);
  return next;
}
