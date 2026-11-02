import type { ReactNode } from "react";
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

export function Cover({ book, photo = true }: { book: Book; photo?: boolean }) {
  const kind = coverKind(book);
  const stock = kind === "woods" ? "kraft" : kind === "school" ? "pad" : "card";
  const showPhoto = photo && !!book.coverUrl;
  return (
    <Paper
      stock={stock}
      rules="none"
      tilt={false}
      tape={false}
      shadow="card"
      seed={book.id}
      data-cover={showPhoto ? "photo" : "designed"}
      className={`flex aspect-[3/4] w-24 shrink-0 flex-col justify-between p-2 text-ink${showPhoto ? " overflow-hidden" : ""}`}
    >
      <CoverMark kind={kind} />
      {showPhoto ? (
        <img src={book.coverUrl} alt="" className="h-10 w-full max-w-full object-cover" />
      ) : (
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
  children,
}: {
  text: Copy;
  lang: Lang;
  setLang: (lang: Lang) => void;
  mode: "demo" | "drive";
  heading: string;
  onSignOut: () => void;
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
            <p className="font-hand text-sm">{text.appName}</p>
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
          <p className="text-sm text-muted-foreground">{text.waiting}</p>
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
        {resumed ? ` · ${text.paused} ${clock}` : ""}
      </p>
      <Dock
        text={text}
        title={book.title}
        chapter={book.chapters.find((chapter) => chapter.id === activeChapterId)?.title || plan.chapterTitle}
        clock={clock || formatClock(plan.seekSeconds)}
        paused
        onOpen={onOpenPlayer}
      />
    </div>
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
}) {
  const max = duration > 0 ? duration : Math.max(seconds, 1);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5" data-screen="player" data-paused={paused ? "true" : "false"}>
      <Button variant="ghost" className="w-fit" onClick={onBack}>
        {backLabel}
      </Button>
      <Card tilt={false} stock="card" className="gap-4">
        <CardContent className="grid items-center gap-4 sm:grid-cols-[8rem_1fr]">
          <Cover book={book} />
          <div className="min-w-0">
            <CardDescription>{seriesLine(book)}</CardDescription>
            <CardTitle className="mt-1">{book.title}</CardTitle>
            <p className="mt-2 font-hand">{chapterTitle}</p>
            <Badge className="mt-3" variant={paused ? "secondary" : "default"}>
              {paused ? text.paused : text.pause}
            </Badge>
          </div>
        </CardContent>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm">{text.waiting}</p>
          <p className="font-script text-4xl leading-none" data-testid="playhead">
            {clock}
            <span className="px-2 font-hand text-lg text-muted-foreground">/ {durationClock}</span>
          </p>
          <Slider
            aria-label={text.seek}
            min={0}
            max={max}
            step={1}
            value={[Math.min(seconds, max)]}
            onValueChange={(value) => onSeek(value[0] ?? 0)}
          />
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => onSkip(-30)}>
              {text.back30}
            </Button>
            <Button size="lg" onClick={onToggle} aria-label={paused ? text.play : text.pause}>
              {paused ? text.play : text.pause}
            </Button>
            <Button variant="outline" onClick={() => onSkip(30)}>
              {text.fwd30}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={onPrev}>
              {text.prev}
            </Button>
            <Button variant="ghost" onClick={onNext}>
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
