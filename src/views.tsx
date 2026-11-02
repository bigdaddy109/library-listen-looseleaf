import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Paper } from "@/components/ui/paper";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DriveItem } from "./drive";
import { chapterCount, folderCaption, type Copy, type Lang } from "./i18n";
import { bookFraction, formatClock, planPausedOpen, type Book, type ProgressMap } from "./library";

export function seriesLine(book: Book) {
  if (book.seriesZh === book.seriesEn) return book.seriesZh;
  return `${book.seriesZh} · ${book.seriesEn}`;
}

function coverKind(book: Book) {
  const blob = `${book.seriesZh} ${book.seriesEn}`.toLowerCase();
  if (blob.includes("hatchet") || book.seriesZh.includes("斧")) return "woods";
  if (blob.includes("school") || book.seriesZh.includes("學")) return "school";
  return "book";
}

export function Cover({ book, photo = true, shape = "poster" }: { book: Book; photo?: boolean; shape?: "poster" | "square" }) {
  const kind = coverKind(book);
  const stock = kind === "woods" ? "kraft" : kind === "school" ? "pad" : "card";
  const showPhoto = photo && !!book.coverUrl && shape !== "square";
  const square = shape === "square";
  return (
    <Paper
      stock={stock}
      rules="none"
      tilt={false}
      tape={false}
      shadow="card"
      seed={book.id}
      data-cover={showPhoto ? "photo" : "designed"}
      className={
        square
          ? "flex aspect-square w-full items-center justify-center p-1 text-ink"
          : `flex aspect-[3/4] w-24 shrink-0 flex-col justify-between p-2 text-ink${showPhoto ? " overflow-hidden" : ""}`
      }
    >
      <CoverMark kind={kind} />
      {showPhoto ? (
        <img src={book.coverUrl} alt="" className="h-10 w-full max-w-full object-cover" />
      ) : square ? null : (
        <p className="font-script text-sm leading-tight break-words">{book.seriesZh === book.seriesEn ? book.title : book.seriesZh}</p>
      )}
    </Paper>
  );
}

function CoverMark({ kind }: { kind: "woods" | "school" | "book" }) {
  if (kind === "woods") {
    return (
      <svg data-cover-mark="" viewBox="0 0 64 36" aria-hidden="true" className="h-8 w-full">
        <path d="M6 32 18 12 30 32M26 32 40 8 56 32" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M32 32v-6" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === "school") {
    return (
      <svg data-cover-mark="" viewBox="0 0 64 36" aria-hidden="true" className="h-8 w-full">
        <path d="M8 30 V16 L32 8 56 16 V30" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M28 30 v-8 h8 v8" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg data-cover-mark="" viewBox="0 0 64 36" aria-hidden="true" className="h-8 w-full">
      <path d="M14 8 h28 v20 H14 z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 14 h16 M20 20 h12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function Frame({
  text,
  lang,
  setLang,
  mode,
  heading,
  onSignOut,
  mini = false,
  children,
}: {
  text: Copy;
  lang: Lang;
  setLang: (lang: Lang) => void;
  mode: "demo" | "drive";
  heading: string;
  onSignOut: () => void;
  mini?: boolean;
  children: ReactNode;
}) {
  return (
    <Paper as="main" stock="paper" rules="ruled" tape="top" tilt={false} className="mx-auto mt-8 mb-10 w-full min-w-0 min-h-[calc(100dvh-4.5rem)] max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{mode === "drive" ? text.yourLibrary : text.demoShelf}</Badge>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p data-app-name="" className="font-hand text-sm hyphens-none break-keep text-wrap">
              {text.appName.split(" ").map((word, index) => (
                <span key={`${word}-${index}`}>
                  {index > 0 ? " " : null}
                  <span className="whitespace-nowrap">{word}</span>
                </span>
              ))}
            </p>
            <h1 className="font-script text-4xl leading-none sm:text-5xl">{heading}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={lang}
              spacing={0}
              variant="outline"
              aria-label={text.language}
              onValueChange={(value) => {
                if (value === "zh-TW" || value === "en") setLang(value);
              }}
            >
              <ToggleGroupItem value="zh-TW">中文</ToggleGroupItem>
              <ToggleGroupItem value="en">EN</ToggleGroupItem>
            </ToggleGroup>
            {mode === "drive" ? (
              <Button variant="outline" onClick={onSignOut}>
                {text.signOut}
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      {children}
      {mini ? <div aria-hidden="true" className="ll-mini-spacer" /> : null}
    </Paper>
  );
}

export function Shelf({
  text,
  lang,
  books,
  progress,
  mode,
  query,
  setQuery,
  status,
  error,
  folders,
  onSignIn,
  onPickFolder,
  onOpen,
}: {
  text: Copy;
  lang: Lang;
  books: Book[];
  progress: ProgressMap;
  mode: "demo" | "drive";
  query: string;
  setQuery: (value: string) => void;
  status: "idle" | "signingIn" | "scanning";
  error: string;
  folders: DriveItem[];
  onSignIn: () => void;
  onPickFolder: (folder: DriveItem) => void;
  onOpen: (id: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const visible = books.filter((book) => {
    if (!q) return true;
    const blob = [book.title, book.seriesZh, book.seriesEn, book.folder, ...book.chapters.map((chapter) => chapter.title)]
      .join("\n")
      .toLowerCase();
    return blob.includes(q);
  });
  const continued = [...visible]
    .filter((book) => progress[book.id]?.chapterId && book.chapters.some((chapter) => chapter.id === progress[book.id].chapterId))
    .sort((a, b) => (progress[b.id]?.updatedAt || "").localeCompare(progress[a.id]?.updatedAt || ""))[0];

  return (
    <div className="flex w-full min-w-0 flex-col gap-5" data-screen="shelf">
      {mode === "demo" ? (
        <Card tilt={false} stock="slip" className="w-full min-w-0 max-w-full">
          <CardHeader>
            <CardTitle>{text.demoShelf}</CardTitle>
            <CardDescription>{text.demoBanner}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{text.signedOut}</p>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Button size="lg" onClick={onSignIn} disabled={status !== "idle"}>
              {status === "signingIn" ? text.signingIn : status === "scanning" ? text.scanning : text.signIn}
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {error ? (
        <Card tilt={false} className="w-full min-w-0 max-w-full">
          <CardHeader>
            <CardTitle>{text.retry}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={onSignIn}>{text.signIn}</Button>
          </CardFooter>
        </Card>
      ) : null}

      {folders.length > 1 ? (
        <Card tilt={false} className="w-full min-w-0 max-w-full">
          <CardHeader>
            <CardTitle>Library</CardTitle>
            <CardDescription>{text.pickFolder}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {folders.map((folder) => {
              const owner = folder.owners?.[0]?.displayName || folder.owners?.[0]?.emailAddress || "";
              return (
                <Button key={folder.id} variant="outline" className="h-auto justify-start py-3" onClick={() => onPickFolder(folder)}>
                  {folder.name} · {folderCaption(lang, folder.ownedByMe, owner)}
                </Button>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {status === "scanning" ? <p className="font-hand">{text.scanning}</p> : null}

      <div className="flex flex-col gap-2">
        <label className="sr-only" htmlFor="shelf-search">
          {text.searchLabel}
        </label>
        <Input
          id="shelf-search"
          type="search"
          value={query}
          placeholder={text.search}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {continued ? (
        <Card tilt={false} stock="sticky-yellow" rules="none" className="w-full min-w-0 max-w-full">
          <CardHeader>
            <CardDescription>{text.continue}</CardDescription>
            <CardTitle className="break-words">{continued.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm">{seriesLine(continued)}</p>
            <p className="font-hand">
              {planPausedOpen(continued, progress).chapterTitle} · {formatClock(planPausedOpen(continued, progress).seekSeconds)}
            </p>
            <Progress value={(bookFraction(continued, progress) ?? 0) * 100} />
          </CardContent>
          <CardFooter className="min-w-0">
            <Button className="h-auto w-full min-w-0 max-w-full whitespace-normal text-center sm:w-auto" aria-label={continued.title} onClick={() => onOpen(continued.id)}>
              {text.openBook}
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {visible.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{books.length === 0 ? text.emptyLibrary : text.noMatchTitle}</EmptyTitle>
            <EmptyDescription>{books.length === 0 ? text.emptyLibrary : text.noMatch}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <BookGroups lang={lang} books={visible} text={text} progress={progress} onOpen={onOpen} />
      )}
    </div>
  );
}

function BookGroups({
  books,
  text,
  lang,
  progress,
  onOpen,
}: {
  books: Book[];
  text: Copy;
  lang: Lang;
  progress: ProgressMap;
  onOpen: (id: string) => void;
}) {
  const groups: { label: string; books: Book[] }[] = [];
  for (const book of books) {
    const label = seriesLine(book);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.books.push(book);
    else groups.push({ label, books: [book] });
  }
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      {groups.map((group) => (
        <section key={group.label} className="flex w-full min-w-0 flex-col gap-3">
          <Separator>{group.label}</Separator>
          <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            {group.books.map((book) => {
              const fraction = bookFraction(book, progress);
              return (
                <Card key={book.id} tilt={false} className="w-full min-w-0 max-w-full gap-3 py-4">
                  <CardContent className="flex min-w-0 gap-3">
                    <Cover book={book} photo={false} />
                    <div className="min-w-0 flex-1">
                      <CardDescription className="break-words">{seriesLine(book)}</CardDescription>
                      <CardTitle className="mt-1 break-words text-[1.45rem]">{book.title}</CardTitle>
                      <p className="mt-2 text-sm">{chapterCount(lang, book.chapters.length)}</p>
                      {book.ebookName ? <p className="text-sm text-muted-foreground break-words">{text.ebook}</p> : null}
                      {fraction != null ? <Progress className="mt-3" value={fraction * 100} /> : null}
                    </div>
                  </CardContent>
                  <CardFooter className="min-w-0">
                    <Button className="h-auto w-full min-w-0 max-w-full whitespace-normal text-center sm:w-auto" aria-label={book.title} onClick={() => onOpen(book.id)}>
                      {text.openBook}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function BookScreen({
  book,
  text,
  lang,
  progress,
  activeChapterId,
  clock,
  paused,
  dock = true,
  onBack,
  onOpenPlayer,
  onChapter,
}: {
  book: Book;
  text: Copy;
  lang: Lang;
  progress: ProgressMap;
  activeChapterId: string;
  clock: string;
  paused: boolean;
  dock?: boolean;
  onBack: () => void;
  onOpenPlayer: () => void;
  onChapter: (index: number) => void;
}) {
  const plan = planPausedOpen(book, progress);
  const resumed = plan.seekSeconds > 0;
  return (
    <div className="flex flex-col gap-5" data-screen="book">
      <Button variant="ghost" className="w-fit" onClick={onBack}>
        {text.backShelf}
      </Button>
      <div className="grid items-start gap-5 md:grid-cols-[11rem_1fr]">
        <Cover book={book} />
        <div className="flex min-w-0 flex-col gap-2">
          <p className="font-hand text-sm">{seriesLine(book)}</p>
          <h2 className="font-script text-4xl leading-none">{book.title}</h2>
          <p>{resumed ? `${text.lastHeard}：${plan.chapterTitle} · ${formatClock(plan.seekSeconds)}` : text.startHere}</p>
          {paused ? <p className="text-sm text-muted-foreground">{text.waiting}</p> : null}
          {book.ebookName ? <Badge variant="secondary">{text.ebook}</Badge> : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="lg" onClick={onOpenPlayer}>
              {text.openPlayer}
            </Button>
          </div>
        </div>
      </div>
      <Separator>{text.chapters}</Separator>
      <ul className="flex flex-col gap-2">
        {book.chapters.map((chapter) => {
          const saved = progress[book.id]?.chapters?.[chapter.id];
          const active = chapter.id === activeChapterId;
          return (
            <li key={chapter.id}>
              <Button
                variant={active ? "default" : "outline"}
                className="h-auto w-full justify-between gap-3 py-3 text-left whitespace-normal"
                onClick={() => onChapter(chapter.index)}
              >
                <span>
                  {chapter.index + 1}. {chapter.title}
                </span>
                <span className="font-hand text-sm">{saved ? formatClock(saved.positionSeconds) : clock && active ? clock : ""}</span>
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted-foreground">
        {chapterCount(lang, book.chapters.length)}
        {paused && resumed ? ` · ${text.paused} ${clock}` : ""}
      </p>
      {dock ? (
        <Dock
          text={text}
          title={book.title}
          chapter={book.chapters.find((chapter) => chapter.id === activeChapterId)?.title || plan.chapterTitle}
          clock={clock || formatClock(plan.seekSeconds)}
          paused={paused}
          onOpen={onOpenPlayer}
        />
      ) : null}
    </div>
  );
}

function PlayMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
      <path d="M8.2 5.1 18.7 12.1 7.7 18.7Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function PauseMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
      <path d="M8 5.3v13.3M16.1 5.1v13.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function SkipMark({ dir }: { dir: "back" | "forward" }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${dir === "forward" ? "flex-row-reverse" : ""}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
        <path
          d={dir === "back" ? "M16.8 16.2c.6-6.4-6.6-9.6-10.4-5.4" : "M7.2 16.2c-.6-6.4 6.6-9.6 10.4-5.4"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d={dir === "back" ? "M6.2 9.2 6.4 13.4 10.4 12.6" : "M17.8 9.2 17.6 13.4 13.6 12.6"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-hand text-sm leading-none">30</span>
    </span>
  );
}

export function PlayerScreen({
  book,
  text,
  chapterTitle,
  paused,
  clock,
  durationClock,
  seconds,
  duration,
  onBack,
  backLabel,
  onToggle,
  onPrev,
  onNext,
  onSkip,
  onSeek,
  sheet = false,
}: {
  book: Book;
  text: Copy;
  chapterTitle: string;
  paused: boolean;
  clock: string;
  durationClock: string;
  seconds: number;
  duration: number;
  onBack: () => void;
  backLabel: string;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSkip: (delta: number) => void;
  onSeek: (seconds: number) => void;
  sheet?: boolean;
}) {
  const max = duration > 0 ? duration : Math.max(seconds, 1);
  const remainingClock = formatClock(Math.max(0, (duration > 0 ? duration : 0) - seconds));
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5" data-screen="player" data-paused={paused ? "true" : "false"}>
      {sheet ? null : (
        <Button variant="ghost" className="w-fit" onClick={onBack}>
          {backLabel}
        </Button>
      )}
      <Card tilt={false} stock="card" className="gap-4">
        <CardContent className="grid items-center gap-4 sm:grid-cols-[8rem_1fr]">
          {sheet ? (
            <div className="mx-auto w-36 max-w-full">
              <Cover book={book} photo={false} shape="square" />
            </div>
          ) : (
            <Cover book={book} photo={false} />
          )}
          <div className="min-w-0">
            <CardDescription className="break-words">{seriesLine(book)}</CardDescription>
            <CardTitle className="mt-1 break-words">{book.title}</CardTitle>
            <p className="mt-2 font-hand break-words">{chapterTitle}</p>
          </div>
        </CardContent>
        <CardContent className="flex flex-col gap-3">
          {paused ? <p className="text-sm">{text.waiting}</p> : null}
          <p className="max-w-full font-script text-4xl leading-none break-words" data-testid="playhead">
            {clock}
            <span className="px-2 font-hand text-lg text-muted-foreground">/ {sheet ? remainingClock : durationClock}</span>
          </p>
          <Slider
            aria-label={text.seek}
            min={0}
            max={max}
            step={1}
            value={[Math.min(seconds, max)]}
            onValueChange={(value) => onSeek(value[0] ?? 0)}
          />
          <div className="grid min-w-0 grid-cols-3 gap-2" data-transport="">
            <Button variant="outline" className="h-12 w-full min-w-0 px-1" aria-label={text.back30} onClick={() => onSkip(-30)}>
              <SkipMark dir="back" />
            </Button>
            <Button size="lg" className="h-12 w-full min-w-0 px-1" aria-label={paused ? text.play : text.pause} onClick={onToggle}>
              {paused ? <PlayMark /> : <PauseMark />}
            </Button>
            <Button variant="outline" className="h-12 w-full min-w-0 px-1" aria-label={text.fwd30} onClick={() => onSkip(30)}>
              <SkipMark dir="forward" />
            </Button>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2">
            <Button variant="ghost" className="h-auto min-h-10 w-full min-w-0 whitespace-normal px-2 py-2 text-center leading-tight" onClick={onPrev}>
              {text.prev}
            </Button>
            <Button variant="ghost" className="h-auto min-h-10 w-full min-w-0 whitespace-normal px-2 py-2 text-center leading-tight" onClick={onNext}>
              {text.next}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function Dock({
  text,
  title,
  chapter,
  clock,
  paused,
  onOpen,
}: {
  text: Copy;
  title: string;
  chapter: string;
  clock: string;
  paused: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="ll-dock mt-6">
      <Paper tilt={false} tape={false} shadow="card" stock="slip" className="mx-auto flex max-w-5xl flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="truncate font-script text-xl leading-none">{title}</p>
          <p className="truncate text-sm">
            {paused ? text.paused : text.pause} · {chapter} · {clock}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={onOpen}>
          {text.openPlayer}
        </Button>
      </Paper>
    </div>
  );
}

function Marquee({ text }: { text: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const box = outer.current;
    const line = inner.current;
    if (!box || !line) return;
    const measure = () => setOverflow(line.scrollWidth > box.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [text, overflow]);
  return (
    <div ref={outer} className="max-w-full overflow-hidden whitespace-nowrap">
      {overflow ? (
        <span className="ll-marquee">
          <span className="pr-8">{text}</span>
          <span className="pr-8" aria-hidden="true">
            {text}
          </span>
        </span>
      ) : (
        <span ref={inner} className="inline-block">
          {text}
        </span>
      )}
    </div>
  );
}

export function MiniPlayer({
  book,
  chapter,
  text,
  paused,
  seconds,
  duration,
  onToggle,
  onExpand,
}: {
  book: Book;
  chapter: string;
  text: Copy;
  paused: boolean;
  seconds: number;
  duration: number;
  onToggle: () => void;
  onExpand: () => void;
}) {
  const pct = duration > 0 ? Math.min(100, Math.max(0, (seconds / duration) * 100)) : 0;
  return (
    <div
      data-mini-player=""
      data-paused={paused ? "true" : "false"}
      className="fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]"
    >
      <Paper tilt={false} tape={false} shadow="card" stock="slip" className="ll-mini-bar relative w-full overflow-hidden rounded-none px-3">
        <button
          type="button"
          data-mini-expand=""
          className="absolute inset-0 z-0 cursor-pointer border-0 bg-transparent p-0"
          aria-label={text.expand}
          onClick={onExpand}
        />
        <div className="relative z-10 flex h-full items-center gap-3 pointer-events-none">
          <div className="w-11 shrink-0">
            <Cover book={book} photo={false} shape="square" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm leading-tight font-bold">
              <Marquee text={book.title} />
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              <Marquee text={chapter} />
            </div>
          </div>
          <Button
            type="button"
            size="lg"
            className="pointer-events-auto shrink-0"
            aria-label={paused ? text.play : text.pause}
            onClick={onToggle}
          >
            {paused ? text.play : text.pause}
          </Button>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-ink/15" aria-hidden="true">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </Paper>
    </div>
  );
}

export function PlayerSheet({ onClose, collapseLabel, children }: { onClose: () => void; collapseLabel: string; children: ReactNode }) {
  const [y, setY] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));
  const [ease, setEase] = useState(true);
  const drag = useRef<{ y: number; active: boolean } | null>(null);
  const closing = useRef(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setY(0));
    return () => cancelAnimationFrame(id);
  }, []);

  function close() {
    if (closing.current) return;
    closing.current = true;
    setEase(true);
    setY(window.innerHeight);
    window.setTimeout(onClose, 280);
  }

  return (
    <div
      data-player-sheet=""
      className="fixed inset-0 z-40"
      style={{ transform: `translateY(${y}px)`, transition: ease ? "transform 280ms ease" : "none" }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest("button, a, input, textarea, [data-slot='slider'], [data-slot='slider-thumb']")) return;
        drag.current = { y: event.clientY, active: true };
        setEase(false);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag.current?.active) return;
        setY(Math.max(0, event.clientY - drag.current.y));
      }}
      onPointerUp={(event) => {
        if (!drag.current?.active) return;
        const dy = Math.max(0, event.clientY - drag.current.y);
        drag.current = null;
        if (dy > 72) close();
        else {
          setEase(true);
          setY(0);
        }
      }}
      onPointerCancel={() => {
        drag.current = null;
        setEase(true);
        setY(0);
      }}
    >
      <Paper
        as="div"
        stock="paper"
        rules="ruled"
        tape="top"
        tilt={false}
        className="flex h-full flex-col overflow-y-auto px-4 py-4"
      >
        <Button variant="ghost" size="icon" className="w-fit" aria-label={collapseLabel} onClick={close}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        {children}
      </Paper>
    </div>
  );
}
