import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { InkProvider } from "@/lib/ink/react";
import { buildLibrary, type Book, type Entry, type ProgressMap } from "../src/library";
import { copy, type Lang } from "../src/i18n";
import { Frame, Shelf } from "../src/views";
import "../src/app.css";

/** Wider than a phone, so a rendered Drive cover would blow the card out of the paper. */
const wideCover =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="1040"><rect width="780" height="1040" fill="#c45c26"/></svg>`,
  );

function chapter(id: string, index: number) {
  return { id, index, title: `Chapter ${index + 1}`, file: { name: `${id}.mp3` }, url: "" };
}

function book(id: string, title: string): Book {
  const chapters = [0, 1, 2, 3].map((index) => chapter(`${id}-${index}`, index));
  return {
    id,
    seriesFolder: "上學不容易-Middle-School",
    seriesZh: "上學不容易",
    seriesEn: "Middle School",
    folder: title,
    title,
    chapters,
    coverFile: { name: "cover.jpg", driveId: "drive-cover" },
    coverUrl: wideCover,
    ebookName: null,
  };
}

const longTitle = "Middle School 01 The Worst Years of My Life";
const packedTitle = "TheWorstYearsOfMyLifeWithoutAnySpacesAtAllExtra";
const books = [book("ms-01", longTitle), book("ms-02", packedTitle)];

const progress: ProgressMap = {
  "ms-01": {
    chapterId: "ms-01-0",
    positionSeconds: 12,
    chapterDurationSeconds: 80,
    updatedAt: "2026-11-02T00:00:00.000Z",
    chapters: {
      "ms-01-0": {
        positionSeconds: 12,
        chapterDurationSeconds: 80,
        updatedAt: "2026-11-02T00:00:00.000Z",
      },
    },
  },
};

const params = new URLSearchParams(location.search);
const langParam = params.get("lang");
const lang: Lang = langParam === "en" ? "en" : "zh-TW";

function fixtureEntry(path: string): Entry {
  const name = path.split("/").pop() || path;
  return { path, file: { name, size: 1200 } };
}

const groupedBooks = buildLibrary([
  fixtureEntry("Library/Immune/listen/Immune Part01/01.mp3"),
  fixtureEntry("Library/Immune/listen/Immune Part02/02.mp3"),
  fixtureEntry("Library/上學不容易-Middle-School/listen/Middle School 01 - First Day/01.mp3"),
  fixtureEntry("Library/上學不容易-Middle-School/listen/Middle School 02 - Get Me Out/01.mp3"),
]);

const shelfBooks = params.get("fixture") === "grouped" ? groupedBooks : books;

function Harness() {
  const text = copy(lang);
  return (
    <InkProvider>
      <Frame text={text} lang={lang} setLang={() => undefined} mode="drive" heading={text.shelf} onSignOut={() => undefined}>
        <Shelf
          text={text}
          lang={lang}
          books={shelfBooks}
          progress={progress}
          mode="drive"
          query=""
          setQuery={() => undefined}
          status="idle"
          error=""
          folders={[]}
          onSignIn={() => undefined}
          onPickFolder={() => undefined}
          onOpen={() => undefined}
        />
      </Frame>
    </InkProvider>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Harness />
    </StrictMode>,
  );
}
