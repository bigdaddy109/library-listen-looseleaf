import { useEffect, useRef, useState } from "react";
import { ensureMediaWorker, getAccessToken } from "./drive";
import {
  applyProgress,
  formatClock,
  planChapterChoice,
  planChapterFinished,
  planContinueNext,
  planPausedOpen,
  planStepChapter,
  planStopAfterChapter,
  saveProgressMap,
  type Book,
  type ProgressMap,
} from "./library";

export type Cue = {
  bookId: string;
  chapterIndex: number;
  seek: number;
  /** Changes on purpose so a second open of the same chapter still re-cues. */
  token: number;
};

/**
 * Cues audio at the saved spot.
 * Opening a book leaves it paused. Play, and tapping a chapter, start playback.
 */
export function usePlayer(books: Book[], progress: ProgressMap, onProgress: (next: ProgressMap) => void) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [cue, setCue] = useState<Cue | null>(null);
  const [paused, setPaused] = useState(true);
  const [started, setStarted] = useState(false);
  const [chapterEnded, setChapterEnded] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const armed = useRef(false);
  const wantPlayRef = useRef(false);
  const lastSaved = useRef(-1);
  const booksRef = useRef(books);
  const progressRef = useRef(progress);
  booksRef.current = books;
  progressRef.current = progress;

  const book = books.find((item) => item.id === cue?.bookId) ?? null;
  const chapter = book?.chapters[cue?.chapterIndex ?? -1] ?? null;

  function remember(bookId: string, chapterId: string, position: number, reported: number | null) {
    const next = applyProgress(progressRef.current, bookId, chapterId, position, reported);
    saveProgressMap(next);
    progressRef.current = next;
    onProgress(next);
    lastSaved.current = position;
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !cue || !chapter) return;
    let cancelled = false;
    armed.current = false;
    setSeconds(cue.seek);
    const savedDur = progressRef.current[cue.bookId]?.chapters?.[chapter.id]?.chapterDurationSeconds ?? 0;
    if (savedDur > 0) setDuration(savedDur);
    if (!wantPlayRef.current) {
      setPaused(true);
      audio.pause();
    }

    const apply = () => {
      if (cancelled) return;
      const reported = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      if (reported > 0) setDuration(reported);
      const limit = reported > 0 ? reported : cue.seek;
      const target = Math.min(cue.seek, Math.max(0, limit > 0 ? limit : cue.seek));
      try {
        if (reported > 0) audio.currentTime = Math.min(cue.seek, Math.max(0, reported - 0.05));
        else audio.currentTime = target;
      } catch {
        /* metadata not ready yet */
      }
      armed.current = true;
      setSeconds(cue.seek);
      if (wantPlayRef.current) {
        setPaused(false);
        void audio.play().then(() => {
          if (!cancelled && wantPlayRef.current) setPaused(false);
        }).catch(() => {
          if (!cancelled && audio.paused) setPaused(true);
        });
      } else {
        audio.pause();
        setPaused(true);
      }
    };

    const src = new URL(chapter.url, location.href).href;
    let onMeta: (() => void) | null = null;
    const cueMedia = async () => {
      if (chapter.url.includes("/drive-media/")) {
        const token = getAccessToken();
        if (token) await ensureMediaWorker(token);
      }
      if (cancelled) return;
      if (!wantPlayRef.current) audio.pause();
      onMeta = () => apply();
      if (audio.src !== src) audio.src = chapter.url;
      if (audio.readyState >= 1) apply();
      else audio.addEventListener("loadedmetadata", onMeta, { once: true });
    };
    void cueMedia();

    const onTime = () => {
      if (!armed.current || audio.paused) return;
      setSeconds(audio.currentTime);
      setPaused(false);
      if (Math.abs(audio.currentTime - lastSaved.current) < 1) return;
      const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null;
      remember(cue.bookId, chapter.id, audio.currentTime, dur);
    };
    const onPause = () => {
      setPaused(true);
      if (!armed.current) return;
      const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null;
      if (audio.currentTime > 0) remember(cue.bookId, chapter.id, audio.currentTime, dur);
    };
    const onPlay = () => {
      setStarted(true);
      setPaused(false);
      setChapterEnded(false);
    };
    const onEnded = () => {
      wantPlayRef.current = false;
      setPaused(true);
      const count = booksRef.current.find((item) => item.id === cue.bookId)?.chapters.length ?? 0;
      const plan = planChapterFinished(count, cue.chapterIndex);
      setChapterEnded(plan.offerNext);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("ended", onEnded);
    return () => {
      cancelled = true;
      if (onMeta) audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("ended", onEnded);
    };
    // chapter.url identity is the cue. Re-running on progress would jump backward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cue?.token, chapter?.url]);

  function arm(bookId: string, chapterIndex: number, seek: number, play = false) {
    setChapterEnded(false);
    wantPlayRef.current = play;
    lastSaved.current = seek;
    setCue({ bookId, chapterIndex, seek, token: Date.now() });
    setSeconds(seek);
    setPaused(!play);
    if (!play) audioRef.current?.pause();
  }

  function primePlayback(url: string) {
    const audio = audioRef.current;
    if (!audio || !url) return;
    wantPlayRef.current = true;
    setPaused(false);
    const start = () => {
      const el = audioRef.current;
      if (!el || !wantPlayRef.current) return;
      const src = new URL(url, location.href).href;
      if (el.src !== src) {
        armed.current = false;
        el.src = url;
      }
      void el.play().then(() => {
        if (wantPlayRef.current) setPaused(false);
      }).catch(() => {
        /* The cue effect seeks, then calls play() again once the file is ready. */
      });
    };
    if (url.includes("/drive-media/")) {
      const token = getAccessToken();
      if (token) {
        void ensureMediaWorker(token).then(start);
        return;
      }
    }
    start();
  }

  function chooseChapter(book: Book, index: number) {
    const audio = audioRef.current;
    const live =
      cue && cue.bookId === book.id
        ? {
            chapterIndex: cue.chapterIndex,
            seconds: audio && armed.current && Number.isFinite(audio.currentTime) ? audio.currentTime : seconds,
          }
        : null;
    const plan = planChapterChoice(book, progressRef.current, index, live);
    if (!plan.chapterId) return;
    if (plan.resume) {
      void play();
      return;
    }
    arm(book.id, plan.chapterIndex, plan.seekSeconds, true);
    const next = book.chapters[plan.chapterIndex];
    if (next?.url) primePlayback(next.url);
  }

  function armBook(next: Book, map: ProgressMap = progressRef.current) {
    const plan = planPausedOpen(next, map);
    arm(next.id, plan.chapterIndex, plan.seekSeconds);
    return plan;
  }

  async function play() {
    const audio = audioRef.current;
    if (!audio || !chapter?.url) return;
    wantPlayRef.current = true;
    setPaused(false);
    if (chapter.url.includes("/drive-media/")) {
      const token = getAccessToken();
      if (token) await ensureMediaWorker(token);
      if (!wantPlayRef.current) return;
    }
    const src = new URL(chapter.url, location.href).href;
    if (audio.src !== src) {
      armed.current = false;
      audio.src = chapter.url;
    }
    try {
      await audio.play();
      if (wantPlayRef.current) setPaused(false);
    } catch {
      if (wantPlayRef.current && audio.paused) setPaused(true);
    }
  }

  function pause() {
    wantPlayRef.current = false;
    audioRef.current?.pause();
    setPaused(true);
  }

  async function toggle() {
    if (!audioRef.current || audioRef.current.paused) await play();
    else pause();
  }

  function seek(nextSeconds: number) {
    setChapterEnded(false);
    const audio = audioRef.current;
    const limit = duration > 0 ? duration : nextSeconds;
    const target = Math.min(Math.max(0, nextSeconds), limit || nextSeconds);
    setSeconds(target);
    if (audio && chapter) {
      const wasPlaying = !audio.paused;
      try {
        audio.currentTime = Math.min(target, Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : target);
      } catch {
        /* ignore */
      }
      if (!wasPlaying) audio.pause();
      const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : duration || null;
      remember(cue!.bookId, chapter.id, target, dur);
    }
    setPaused(audio ? audio.paused : true);
  }

  function skip(delta: number) {
    seek(seconds + delta);
  }

  function playPlanned(bookId: string, chapterIndex: number, seekTo: number) {
    const target = booksRef.current.find((item) => item.id === bookId);
    const next = target?.chapters[chapterIndex];
    arm(bookId, chapterIndex, seekTo, true);
    if (next?.url) primePlayback(next.url);
  }

  function changeChapter(delta: number) {
    if (!book || !cue) return;
    const plan = planStepChapter(book, progressRef.current, cue.chapterIndex, delta);
    if (!plan.moved || !plan.autoplay) return;
    playPlanned(book.id, plan.chapterIndex, plan.seekSeconds);
  }

  function continueNext() {
    if (!book || !cue) return;
    const plan = planContinueNext(book, progressRef.current, cue.chapterIndex);
    if (!plan.autoplay) {
      stopAfterChapter();
      return;
    }
    playPlanned(book.id, plan.chapterIndex, plan.seekSeconds);
  }

  function stopAfterChapter() {
    const plan = planStopAfterChapter();
    if (plan.autoplay) return;
    wantPlayRef.current = false;
    audioRef.current?.pause();
    setPaused(true);
    setChapterEnded(false);
  }

  return {
    audioRef,
    cue,
    book,
    chapter,
    paused,
    started,
    chapterEnded,
    seconds,
    duration,
    clock: formatClock(seconds),
    durationClock: formatClock(duration),
    armBook,
    arm,
    chooseChapter,
    play,
    pause,
    toggle,
    seek,
    skip,
    changeChapter,
    continueNext,
    stopAfterChapter,
  };
}
