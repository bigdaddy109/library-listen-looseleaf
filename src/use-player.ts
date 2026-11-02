import { useEffect, useRef, useState } from "react";
import { ensureMediaWorker, getAccessToken } from "./drive";
import {
  applyProgress,
  formatClock,
  planPausedOpen,
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
 * Cues audio at the saved spot and leaves it paused.
 * `play()` is the only path that calls `audio.play()`.
 */
export function usePlayer(books: Book[], progress: ProgressMap, onProgress: (next: ProgressMap) => void) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [cue, setCue] = useState<Cue | null>(null);
  const [paused, setPaused] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const armed = useRef(false);
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
    setPaused(true);
    setSeconds(cue.seek);
    const savedDur = progressRef.current[cue.bookId]?.chapters?.[chapter.id]?.chapterDurationSeconds ?? 0;
    if (savedDur > 0) setDuration(savedDur);
    audio.pause();

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
      audio.pause();
      armed.current = true;
      setPaused(true);
      setSeconds(cue.seek);
    };

    const src = new URL(chapter.url, location.href).href;
    let onMeta: (() => void) | null = null;
    const cueMedia = async () => {
      if (chapter.url.includes("/drive-media/")) {
        const token = getAccessToken();
        if (token) await ensureMediaWorker(token);
      }
      if (cancelled) return;
      audio.pause();
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
    const onPlay = () => setPaused(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      cancelled = true;
      if (onMeta) audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
    // chapter.url identity is the cue. Re-running on progress would jump backward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cue?.token, chapter?.url]);

  function arm(bookId: string, chapterIndex: number, seek: number) {
    lastSaved.current = seek;
    setCue({ bookId, chapterIndex, seek, token: Date.now() });
    setSeconds(seek);
    setPaused(true);
    audioRef.current?.pause();
  }

  function armBook(next: Book, map: ProgressMap = progressRef.current) {
    const plan = planPausedOpen(next, map);
    arm(next.id, plan.chapterIndex, plan.seekSeconds);
    return plan;
  }

  async function play() {
    const audio = audioRef.current;
    if (!audio || !chapter?.url) return;
    if (chapter.url.includes("/drive-media/")) {
      const token = getAccessToken();
      if (token) await ensureMediaWorker(token);
    }
    armed.current = true;
    audio.pause();
    await audio.play();
    setPaused(false);
  }

  function pause() {
    audioRef.current?.pause();
    setPaused(true);
  }

  async function toggle() {
    if (!audioRef.current || audioRef.current.paused) await play();
    else pause();
  }

  function seek(nextSeconds: number) {
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

  function changeChapter(delta: number) {
    if (!book || !cue) return;
    const index = Math.min(book.chapters.length - 1, Math.max(0, cue.chapterIndex + delta));
    const next = book.chapters[index];
    if (!next) return;
    const saved = progressRef.current[book.id]?.chapters?.[next.id];
    const spot = saved && Number.isFinite(saved.positionSeconds) ? saved.positionSeconds : 0;
    arm(book.id, index, spot);
  }

  return {
    audioRef,
    cue,
    book,
    chapter,
    paused,
    seconds,
    duration,
    clock: formatClock(seconds),
    durationClock: formatClock(duration),
    armBook,
    arm,
    play,
    pause,
    toggle,
    seek,
    skip,
    changeChapter,
  };
}
