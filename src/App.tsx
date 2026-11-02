import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { InkProvider } from "@/lib/ink/react";
import { demoBooks, ensureDemoProgress } from "./demo";
import {
  DriveError,
  findLibraryFolders,
  driveListAll,
  ensureMediaWorker,
  forgetFolder,
  getAccessToken,
  pickLibraryFolder,
  publishTokenToWorker,
  registerMediaWorker,
  rememberedFolder,
  rememberFolder,
  requestDriveToken,
  setAccessToken,
  takeRedirectToken,
  walkLibrary,
  type DriveItem,
} from "./drive";
import { LANG_KEY, copy, type Lang } from "./i18n";
import { buildLibrary, resolveBookMedia, type Book, type ProgressMap } from "./library";
import { usePlayer } from "./use-player";
import { BookScreen, Frame, PlayerScreen, Shelf } from "./views";

type Route = { name: "shelf" } | { name: "book"; id: string } | { name: "player"; id: string };
type Status = "idle" | "signingIn" | "scanning";

function readLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "zh-TW";
  } catch {
    return "zh-TW";
  }
}

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean);
  if ((parts[0] === "book" || parts[0] === "player") && parts[1]) {
    return { name: parts[0], id: safeDecode(parts[1]) };
  }
  return { name: "shelf" };
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function routeHash(route: Route) {
  if (route.name === "shelf") return "#/";
  return `#/${route.name}/${encodeURIComponent(route.id)}`;
}

export function App() {
  const [lang, setLangState] = useState<Lang>(readLang);
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  const [books, setBooks] = useState<Book[]>(() => demoBooks(import.meta.env.BASE_URL));
  const [mode, setMode] = useState<"demo" | "drive">("demo");
  const [progress, setProgress] = useState<ProgressMap>(() => ensureDemoProgress());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const player = usePlayer(books, progress, setProgress);
  const text = copy(lang);

  useEffect(() => {
    document.documentElement.lang = lang === "zh-TW" ? "zh-Hant" : "en";
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  useEffect(() => {
    const title =
      route.name === "book"
        ? books.find((book) => book.id === route.id)?.title || text.shelf
        : route.name === "player"
          ? text.openPlayer
          : text.shelf;
    document.title = `${title} · ${text.appName} · ${text.preview}`;
  }, [route, books, text]);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    void registerMediaWorker();
    try {
      const token = takeRedirectToken();
      if (token) void loadFolder(token);
    } catch (err) {
      setError(messageFor(err, "zh-TW"));
    }
    // The redirect token is only present on the first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (route.name === "shelf") return;
    const next = books.find((book) => book.id === route.id);
    if (!next) return;
    if (player.cue?.bookId === next.id) return;
    player.armBook(next);
    // armBook identity changes every render; cue.bookId is the guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, books]);

  function go(next: Route) {
    const hash = routeHash(next);
    if (location.hash !== hash) location.hash = hash;
    setRoute(next);
  }

  function setLang(next: Lang) {
    setLangState(next);
  }

  function messageFor(err: unknown, which: Lang = lang) {
    const labels = copy(which);
    if (err instanceof DriveError) {
      if (err.kind === "no-library") return labels.errorNoLibrary;
      if (err.kind === "denied") return labels.errorDenied;
      if (err.kind === "cancelled") return labels.cancelled;
      if (err.kind === "config") return labels.errorConfig;
    }
    return labels.errorGeneric;
  }

  async function loadFolder(token: string, chosen?: DriveItem) {
    setStatus("scanning");
    setError("");
    try {
      let folder = chosen;
      if (!folder) {
        const found = await findLibraryFolders(token);
        const saved = rememberedFolder();
        const match = found.find((item) => item.id === saved);
        if (match) folder = match;
        else if (found.length === 1) folder = found[0];
        else {
          const filled = new Map<string, boolean>();
          for (const item of found) {
            try {
              const kids = await driveListAll(
                token,
                `'${item.id.replaceAll("'", "\\'")}' in parents and trashed=false`,
                fetch,
                { corpora: "allDrives" },
              );
              filled.set(
                item.id,
                kids.some((child) => child?.name && !child.name.startsWith("_") && !child.name.startsWith(".")),
              );
            } catch {
              filled.set(item.id, false);
            }
          }
          const picked = pickLibraryFolder(found, filled);
          if (picked) folder = picked;
          else {
            const choices = found.filter((item) => filled.get(item.id) !== false);
            setFolders(choices.length ? choices : found);
            setStatus("idle");
            return;
          }
        }
      }
      await ensureMediaWorker(token);
      rememberFolder(folder.id);
      const entries = await walkLibrary(
        folder.id,
        (id) => driveListAll(token, `'${id.replaceAll("'", "\\'")}' in parents and trashed=false`, fetch, { corpora: "allDrives" }),
        folder.name || "Library",
      );
      const next = buildLibrary(entries).map((book) => resolveBookMedia(book, import.meta.env.BASE_URL));
      setBooks(next);
      setMode("drive");
      setFolders([]);
      setStatus("idle");
      go({ name: "shelf" });
    } catch (err) {
      setStatus("idle");
      setError(messageFor(err));
    }
  }

  async function signIn() {
    setStatus("signingIn");
    setError("");
    try {
      const token = await requestDriveToken();
      if (!token) return;
      await loadFolder(token);
    } catch (err) {
      setStatus("idle");
      setError(messageFor(err));
    }
  }

  function signOut() {
    player.pause();
    setAccessToken(null);
    publishTokenToWorker("");
    forgetFolder();
    setMode("demo");
    setBooks(demoBooks(import.meta.env.BASE_URL));
    setFolders([]);
    setError("");
    setStatus("idle");
    go({ name: "shelf" });
  }

  function openBook(id: string) {
    const next = books.find((book) => book.id === id);
    if (!next) return;
    player.armBook(next);
    go({ name: "book", id });
  }

  const current = books.find((book) => book.id === (route.name === "shelf" ? "" : route.id)) ?? null;
  const heading =
    route.name === "player" && current ? current.title : route.name === "book" && current ? current.title : text.shelf;

  return (
    <InkProvider>
      <Frame text={text} lang={lang} setLang={setLang} mode={mode} heading={heading} onSignOut={signOut}>
        {route.name === "shelf" ? (
          <Shelf
            text={text}
            lang={lang}
            books={books}
            progress={progress}
            mode={mode}
            query={query}
            setQuery={setQuery}
            status={status}
            error={error}
            folders={folders}
            onSignIn={() => void signIn()}
            onPickFolder={(folder) => {
              const token = getAccessToken();
              if (token) void loadFolder(token, folder);
            }}
            onOpen={openBook}
          />
        ) : null}

        {route.name !== "shelf" && !current ? (
          <EmptyMissing text={text} onBack={() => go({ name: "shelf" })} />
        ) : null}

        {route.name === "book" && current ? (
          <BookScreen
            book={current}
            text={text}
            lang={lang}
            progress={progress}
            activeChapterId={player.book?.id === current.id ? (player.chapter?.id ?? "") : ""}
            clock={player.book?.id === current.id ? player.clock : ""}
            onBack={() => go({ name: "shelf" })}
            onOpenPlayer={() => go({ name: "player", id: current.id })}
            onChapter={(index) => {
              const chapter = current.chapters[index];
              if (!chapter) return;
              const saved = progress[current.id]?.chapters?.[chapter.id];
              const dur = saved?.chapterDurationSeconds ?? 0;
              const spot = saved?.positionSeconds ?? 0;
              player.arm(current.id, index, dur > 0 && spot >= dur - 2 ? 0 : spot);
            }}
          />
        ) : null}

        {route.name === "player" && current ? (
          <PlayerScreen
            book={current}
            text={text}
            chapterTitle={player.chapter?.title || ""}
            paused={player.paused}
            clock={player.clock}
            durationClock={player.durationClock}
            seconds={player.seconds}
            duration={player.duration}
            onBack={() => go({ name: "book", id: current.id })}
            backLabel={text.backBook}
            onToggle={() => void player.toggle()}
            onPrev={() => player.changeChapter(-1)}
            onNext={() => player.changeChapter(1)}
            onSkip={(delta) => player.skip(delta)}
            onSeek={(seconds) => player.seek(seconds)}
          />
        ) : null}
      </Frame>
      <audio ref={player.audioRef} preload="metadata" playsInline style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
    </InkProvider>
  );
}

function EmptyMissing({ text, onBack }: { text: ReturnType<typeof copy>; onBack: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p>{text.emptyLibrary}</p>
      <Button variant="outline" onClick={onBack}>
        {text.backShelf}
      </Button>
    </div>
  );
}
