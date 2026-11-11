import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Paper } from "@/components/ui/paper";
import { seriesIconName } from "./library";

/** Main parts a reader can name. The drawing also includes ribosomes and cytoskeleton. */
export const CELL_LABELS = [
  { id: "membrane", zh: "細胞膜", en: "Membrane" },
  { id: "nucleus", zh: "細胞核", en: "Nucleus" },
  { id: "mitochondria", zh: "粒線體", en: "Mitochondria" },
  { id: "er", zh: "內質網", en: "Endoplasmic reticulum" },
  { id: "golgi", zh: "高基氏體", en: "Golgi" },
] as const;

export type CellPartId = (typeof CELL_LABELS)[number]["id"];

export function bookShowsCellModel(book: { seriesZh: string; seriesEn: string }) {
  return seriesIconName(book) === "immune";
}

function fade(active: CellPartId | null, id: CellPartId) {
  if (!active || active === id) return 1;
  return 0.32;
}

/**
 * Original frontal cutaway of an animal cell.
 * Paths are drawn here; nothing is traced from a reference picture.
 */
export function CellModel() {
  const [active, setActive] = useState<CellPartId | null>(null);
  const pick = (id: CellPartId) => setActive((current) => (current === id ? null : id));

  return (
    <figure data-cell-model="" className="flex w-full min-w-0 flex-col gap-3">
      <figcaption className="font-hand text-sm text-ink">動物細胞 · Animal cell</figcaption>
      <svg viewBox="0 0 360 250" role="img" aria-label="動物細胞 Animal cell" className="h-auto w-full">
        <defs>
          <clipPath id="immune-cell-interior">
            <ellipse cx="180" cy="128" rx="134" ry="88" />
          </clipPath>
        </defs>
        <ellipse cx="180" cy="128" rx="148" ry="100" fill="#f6edd4" />
        <g clipPath="url(#immune-cell-interior)">
        <g data-cell-part="cytoskeleton" opacity={active ? 0.4 : 0.9}>
          <path
            d="M70 168 C110 150 150 190 200 160 S270 130 300 168 M90 188 C140 170 180 210 240 176 M120 120 C150 160 190 150 230 190"
            fill="none"
            stroke="#8aa0c8"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>

        <g data-cell-part="mitochondria" opacity={fade(active, "mitochondria")}>
          <g transform="translate(248 92) rotate(-28)">
            <ellipse cx="0" cy="0" rx="30" ry="13" fill="#e07a5f" stroke="#8d3d32" strokeWidth="1.4" />
            <path d="M-18 0 H18 M-12 -6 H8 M-8 6 H14" fill="none" stroke="#f6edd4" strokeWidth="1.6" strokeLinecap="round" />
          </g>
          <g transform="translate(92 168) rotate(18)">
            <ellipse cx="0" cy="0" rx="26" ry="12" fill="#d86b58" stroke="#8d3d32" strokeWidth="1.4" />
            <path d="M-16 0 H16 M-10 -5 H6 M-6 5 H12" fill="none" stroke="#f6edd4" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        </g>

        <g data-cell-part="er" opacity={fade(active, "er")}>
          <path
            d="M196 78 C230 68 250 96 286 84 M196 92 C232 82 252 112 290 98 M196 106 C228 98 248 126 282 114"
            fill="none"
            stroke="#3d8f86"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {[
            [210, 74],
            [236, 78],
            [262, 80],
            [214, 96],
            [246, 100],
            [272, 102],
            [220, 112],
            [250, 116],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.3" fill="#b85a68" />
          ))}
        </g>

        <g data-cell-part="golgi" opacity={fade(active, "golgi")}>
          <path d="M214 150 C236 142 258 146 276 158" fill="none" stroke="#d9a441" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M210 162 C234 154 258 158 278 172" fill="none" stroke="#c48a2a" strokeWidth="4.2" strokeLinecap="round" />
          <path d="M208 174 C232 166 254 172 274 186" fill="none" stroke="#e2b85c" strokeWidth="3.6" strokeLinecap="round" />
          <circle cx="284" cy="160" r="4" fill="#e7c56e" stroke="#a86b45" strokeWidth="1" />
          <circle cx="292" cy="176" r="3.2" fill="#f0d48a" stroke="#a86b45" strokeWidth="1" />
          <circle cx="200" cy="168" r="3" fill="#e7c56e" stroke="#a86b45" strokeWidth="1" />
        </g>

        <g data-cell-part="nucleus" opacity={fade(active, "nucleus")}>
          <circle cx="156" cy="124" r="42" fill="#8ea2d6" stroke="#3c4d86" strokeWidth="3" />
          <circle cx="156" cy="124" r="36" fill="none" stroke="#d5def4" strokeWidth="1.4" />
          <path
            d="M132 112 C140 118 136 128 146 126 M150 108 C158 118 152 130 166 124 M148 140 C158 134 166 146 174 138"
            fill="none"
            stroke="#3c4d86"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="142" cy="136" r="9" fill="#3c4d86" />
        </g>
        <g data-cell-part="ribosomes" opacity={active ? 0.4 : 1}>
          {[
            [110, 86],
            [188, 168],
            [230, 186],
            [118, 176],
            [250, 78],
            [96, 112],
          ].map(([x, y]) => (
            <circle key={`free-${x}-${y}`} cx={x} cy={y} r="2.1" fill="#b85a68" />
          ))}
        </g>
        </g>

        <g data-cell-part="membrane" opacity={fade(active, "membrane")}>
          <ellipse cx="180" cy="128" rx="148" ry="100" fill="none" stroke="#e4c39a" strokeWidth="8" />
          <ellipse cx="180" cy="128" rx="136" ry="90" fill="none" stroke="#a86b45" strokeWidth="2.4" />
          <path
            d="M78 62 C40 40 28 96 58 118 C40 92 62 70 96 78"
            fill="#f3d7b4"
            stroke="#a86b45"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {active === "membrane" ? (
            <ellipse cx="180" cy="128" rx="154" ry="106" fill="none" stroke="#2a2420" strokeWidth="1.6" strokeDasharray="4 3" />
          ) : null}
        </g>
      </svg>
      <div className="flex flex-wrap gap-2">
        {CELL_LABELS.map((part) => (
          <Button
            key={part.id}
            type="button"
            variant={active === part.id ? "default" : "outline"}
            size="sm"
            className="h-auto whitespace-normal px-2 py-1 text-left text-sm leading-tight"
            aria-pressed={active === part.id}
            data-cell-label={part.id}
            onClick={() => pick(part.id)}
          >
            {part.zh} · {part.en}
          </Button>
        ))}
      </div>
    </figure>
  );
}

/** The diagram stays off the page until this button opens a sheet. Audio is left alone. */
export function CellFigure({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const [sheetTop, setSheetTop] = useState(160);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!present) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setSheetTop(Math.max(8, Math.round(rect.bottom + 8)));
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [present, open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    buttonRef.current?.scrollIntoView({ block: "start", inline: "nearest" });
    setPresent(true);
    setOpen(true);
  }

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        size="lg"
        variant={open ? "default" : "outline"}
        data-cell-figure=""
        aria-expanded={open}
        onClick={toggle}
      >
        {label}
      </Button>
      {present ? (
        <FigureSheet
          open={open}
          top={sheetTop}
          onClosed={() => {
            setPresent(false);
            setOpen(false);
          }}
        >
          <CellModel />
        </FigureSheet>
      ) : null}
    </>
  );
}

function FigureSheet({
  open,
  top,
  onClosed,
  children,
}: {
  open: boolean;
  top: number;
  onClosed: () => void;
  children: ReactNode;
}) {
  const [y, setY] = useState(720);
  const [ease, setEase] = useState(true);
  const drag = useRef<{ y: number; active: boolean } | null>(null);
  const closed = useRef(false);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  useEffect(() => {
    const id = requestAnimationFrame(() => setY(0));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (open || closed.current) return;
    setEase(true);
    setY(720);
    const timer = window.setTimeout(() => {
      if (closed.current) return;
      closed.current = true;
      onClosedRef.current();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open]);

  function finishClose() {
    if (closed.current) return;
    closed.current = true;
    setEase(true);
    setY(720);
    window.setTimeout(() => onClosedRef.current(), 280);
  }

  const sheet = (
    <div
      data-cell-sheet=""
      data-open={open ? "true" : "false"}
      className="fixed inset-x-0 z-[34]"
      style={{
        top,
        bottom: "var(--ll-mini-offset, 0px)",
        transform: `translateY(${y}px)`,
        transition: ease ? "transform 280ms ease" : "none",
      }}
      onPointerDown={(event) => {
        if (event.button !== 0 || !open) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest("button, a, input, textarea")) return;
        drag.current = { y: event.clientY, active: true };
        setEase(false);
        const move = (ev: PointerEvent) => {
          if (!drag.current?.active) return;
          setY(Math.max(0, ev.clientY - drag.current.y));
        };
        const up = (ev: PointerEvent) => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
          if (!drag.current?.active) return;
          const dy = Math.max(0, ev.clientY - drag.current.y);
          drag.current = null;
          if (dy > 72) finishClose();
          else {
            setEase(true);
            setY(0);
          }
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* The window listeners still see the swipe. */
        }
      }}
    >
      <Paper stock="paper" rules="none" tilt={false} tape={false} shadow="card" className="h-full overflow-y-auto px-4 pt-3 pb-4">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink/25" aria-hidden="true" />
        {children}
      </Paper>
    </div>
  );

  if (typeof document === "undefined") return sheet;
  return createPortal(sheet, document.body);
}
