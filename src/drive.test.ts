import { describe, expect, it } from "vitest";
import { buildLibrary } from "./library";
import {
  implicitRedirectUri,
  libraryFolderQuery,
  parseImplicitHash,
  usesRedirect,
  walkLibrary,
  type DriveItem,
} from "./drive";

const FOLDER = "application/vnd.google-apps.folder";

describe("drive queries", () => {
  it("looks for a folder named Library", () => {
    expect(libraryFolderQuery(false)).toBe(
      "name='Library' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    );
    expect(libraryFolderQuery(true)).toContain("sharedWithMe=true");
  });

  it("uses the page URL as the redirect URI, including the Pages path", () => {
    const loc = { origin: "https://bigdaddy109.github.io", pathname: "/library-listen-looseleaf/index.html" } as Location;
    expect(implicitRedirectUri(loc)).toBe("https://bigdaddy109.github.io/library-listen-looseleaf/");
  });

  it("keeps the desktop site on the popup and phones on the redirect", () => {
    expect(usesRedirect("bigdaddy109.github.io", { userAgent: "Mozilla/5.0", maxTouchPoints: 0 } as Navigator)).toBe(false);
    expect(usesRedirect("bigdaddy109.github.io", { userAgent: "iPhone", maxTouchPoints: 5 } as Navigator)).toBe(true);
    expect(usesRedirect("localhost", { userAgent: "Mozilla/5.0", maxTouchPoints: 0 } as Navigator)).toBe(true);
  });

  it("reads an implicit token hash", () => {
    expect(parseImplicitHash("#access_token=abc&expires_in=3600")).toEqual({ accessToken: "abc", expiresIn: 3600 });
    expect(parseImplicitHash("#error=access_denied&error_description=no")).toEqual({
      error: "access_denied",
      description: "no",
    });
    expect(parseImplicitHash("")).toBeNull();
  });
});

describe("walkLibrary", () => {
  it("reads the series/listen/book layout and skips _source", async () => {
    const tree: Record<string, DriveItem[]> = {
      lib: [
        { id: "series", name: "手斧男孩-Hatchet", mimeType: FOLDER },
        { id: "hidden", name: "_source", mimeType: FOLDER },
      ],
      series: [
        { id: "listen", name: "listen", mimeType: FOLDER },
        { id: "ebooks", name: "ebooks", mimeType: FOLDER },
      ],
      listen: [{ id: "book", name: "Hatchet", mimeType: FOLDER }],
      book: [
        { id: "a", name: "01 - The Lake.mp3", mimeType: "audio/mpeg", size: "1000" },
        { id: "c", name: "cover.jpg", mimeType: "image/jpeg", size: "80" },
      ],
      ebooks: [{ id: "e", name: "Hatchet.epub", mimeType: "application/epub+zip", size: "2000" }],
      hidden: [{ id: "nope", name: "secret.mp3", mimeType: "audio/mpeg", size: "1000" }],
    };
    const entries = await walkLibrary("lib", async (id) => tree[id] ?? [], "Library");
    const books = buildLibrary(entries);
    expect(books).toHaveLength(1);
    expect(books[0].seriesZh).toBe("手斧男孩");
    expect(books[0].seriesEn).toBe("Hatchet");
    expect(books[0].chapters.map((chapter) => chapter.file.driveId)).toEqual(["a"]);
    expect(books[0].ebookName).toBe("Hatchet.epub");
    expect(books[0].coverFile?.driveId).toBe("c");
    expect(entries.some((entry) => entry.path.includes("_source"))).toBe(false);
  });
});
