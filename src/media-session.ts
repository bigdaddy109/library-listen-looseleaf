import { coverKind, seriesIconName, type SeriesIconName } from "./library";

/** iOS Safari shows lock-screen art only from an absolute https image, and it wants 512. */
export const SESSION_ART_SIZE = "512x512";

const ART_FILE: Record<SeriesIconName | "woods" | "school" | "book", string> = {
  hatchet: "session-art/hatchet.png",
  immune: "session-art/immune.png",
  "middle-school": "session-art/middle-school.png",
  "what-if": "session-art/what-if.png",
  "what-if-2": "session-art/what-if-2.png",
  woods: "session-art/woods.png",
  school: "session-art/school.png",
  book: "session-art/book.png",
};

export type SessionImage = { src: string; sizes: string; type: "image/png" };

export type PlaybackSession = {
  title: string;
  artist: string;
  album: string;
  artwork: SessionImage[];
};

export function sessionArtUrl(file: string, pageHref: string, base = "/") {
  const page = new URL(pageHref, "https://example.invalid/");
  const rootPath = base.endsWith("/") ? base : `${base}/`;
  return new URL(file.replace(/^\//, ""), new URL(rootPath, page.origin)).href;
}

/**
 * Lock-screen label for the chapter that is actually loaded.
 * Title is the chapter. Artist is the book. Artwork is that series' designed icon.
 */
export function playbackSession(
  book: { title: string; seriesZh: string; seriesEn: string },
  chapter: { title: string },
  pageHref: string,
  base = "/",
): PlaybackSession {
  const src = sessionArtUrl(ART_FILE[seriesIconName(book) ?? coverKind(book)], pageHref, base);
  const album = book.seriesZh === book.seriesEn ? book.seriesEn : `${book.seriesZh} · ${book.seriesEn}`;
  return {
    title: chapter.title,
    artist: book.title,
    album,
    artwork: [{ src, sizes: SESSION_ART_SIZE, type: "image/png" }],
  };
}

export function publishPlaybackSession(meta: PlaybackSession) {
  const session = globalThis.navigator?.mediaSession;
  if (!session || typeof MediaMetadata !== "function") return;
  session.metadata = new MediaMetadata({
    title: meta.title,
    artist: meta.artist,
    album: meta.album,
    artwork: meta.artwork,
  });
}
