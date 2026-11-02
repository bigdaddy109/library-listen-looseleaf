"use client"

import * as React from "react"
import { Direction, Slider as SliderPrimitive } from "radix-ui"

import { useInk, useInkSeed, useMergedRef } from "@/lib/ink/react"
import { sliderRangeRecipe, sliderThumbRecipe, sliderTrackRecipe, type SliderTone } from "@/lib/ink/recipes/slider-ink"
import { cn } from "@/lib/utils"

const THUMB = 20

function tickIntervals(ticks: boolean | number | undefined, min: number, max: number, step: number): number {
  if (!ticks) return 0
  if (typeof ticks === "number") return Math.max(0, Math.min(200, Math.round(ticks)))
  const n = Math.round((max - min) / step)
  return n >= 1 && n <= 20 ? n : 10
}

function fillWindow(from: number, to: number, thumbAtFrom: boolean, o: { vertical: boolean; startsLow: boolean }): React.CSSProperties {
  const at = (pct: number, thumb: boolean) => `calc(${thumb ? THUMB / 2 : 0}px + (100% - ${thumb ? THUMB : 0}px) * ${pct / 100})`
  const a = at(from, thumbAtFrom)
  const b = at(to, true)
  const inset = o.vertical
    ? o.startsLow
      ? `calc(100% - ${b}) -12px ${a} -12px`
      : `${a} -12px calc(100% - ${b}) -12px`
    : o.startsLow
      ? `-12px calc(100% - ${b}) -12px ${a}`
      : `-12px ${a} -12px calc(100% - ${b})`
  return { clipPath: `inset(${inset})` }
}

function SliderThumb({ seed, disabled, invalid, className, ref, ...props }: React.ComponentProps<typeof SliderPrimitive.Thumb> & { seed: string; disabled: boolean; invalid: boolean }) {
  const { hostRef, hostProps, node } = useInk({ recipe: sliderThumbRecipe, params: { disabled, invalid }, kind: "thumb", seed, still: true })
  return (
    <SliderPrimitive.Thumb
      data-slot="slider-thumb"
      ref={useMergedRef<HTMLSpanElement>(hostRef, ref)}
      {...hostProps}
      className={cn(
        "relative isolate block size-5 shrink-0 rounded-full outline-hidden transition-transform duration-(--ll-dur-press) ease-out after:absolute after:-inset-1.5 hover:scale-105 active:scale-95 disabled:pointer-events-none",
        "bg-slip data-ink-ready:bg-transparent forced-colors:rounded-full forced-colors:bg-[ButtonText]",
        className
      )}
      {...props}
    >
      {node}
    </SliderPrimitive.Thumb>
  )
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  ticks,
  tone = "marker",
  getValueText,
  seed: seedProp,
  onValueChange,
  orientation = "horizontal",
  inverted = false,
  disabled,
  dir,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  ticks?: boolean | number
  tone?: SliderTone
  getValueText?: (value: number, index: number) => string
  seed?: string | number
}) {
  const vertical = orientation === "vertical"
  const seed = useInkSeed(seedProp)
  const direction = Direction.useDirection(dir)
  const [uncontrolled, setUncontrolled] = React.useState<number[]>(() => (Array.isArray(defaultValue) ? defaultValue : [min]))
  const safeValue = Array.isArray(value) && value.some((v) => !Number.isFinite(v)) ? value.map((v) => (Number.isFinite(v) ? v : min)) : value
  const values = Array.isArray(safeValue) ? safeValue : uncontrolled
  const intervals = tickIntervals(ticks, min, max, step)
  const isOff = !!disabled
  const invalid = ariaInvalid === true || ariaInvalid === "true"

  const track = useInk({ recipe: sliderTrackRecipe, params: { vertical, ticks: intervals, disabled: isOff, invalid }, kind: "slider", seed: `${seed}:track`, still: true })
  const range = useInk({ recipe: sliderRangeRecipe, params: { vertical, tone, disabled: isOff }, kind: "slider", seed: `${seed}:range`, still: true })

  const span = max - min || 1
  const pct = values.map((v) => Math.min(100, Math.max(0, ((v - min) / span) * 100)))
  const multi = pct.length > 1
  const from = multi ? Math.min(...pct) : 0
  const to = pct.length ? Math.max(...pct) : 0
  const startsLow = vertical ? !inverted : (direction === "ltr") !== inverted
  const window = fillWindow(from, to, multi, { vertical, startsLow })

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={safeValue}
      min={min}
      max={max}
      step={step}
      orientation={orientation}
      inverted={inverted}
      disabled={disabled}
      dir={dir}
      {...(multi ? { role: "group", "aria-label": ariaLabel, "aria-labelledby": ariaLabelledby, "aria-describedby": ariaDescribedby } : {})}
      onValueChange={(v) => {
        if (!Array.isArray(value)) setUncontrolled(v)
        onValueChange?.(v)
      }}
      style={style}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[orientation=horizontal]:min-h-6 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:min-w-6 data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        ref={track.hostRef}
        {...track.hostProps}
        className="relative isolate grow bg-paper-shade outline-hidden data-ink-ready:bg-transparent forced-colors:border forced-colors:border-[ButtonText] data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2"
      >
        {track.node}
        <SliderPrimitive.Range
          data-slot="slider-range"
          ref={range.hostRef}
          {...range.hostProps}
          style={window}
          className="absolute isolate bg-marker/70 outline-hidden data-ink-ready:bg-transparent forced-colors:bg-[Highlight] data-[orientation=horizontal]:inset-x-0! data-[orientation=horizontal]:inset-y-0 data-[orientation=vertical]:inset-x-0 data-[orientation=vertical]:inset-y-0!"
        >
          {range.node}
        </SliderPrimitive.Range>
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderThumb
          key={index}
          seed={`${seed}:thumb${index}`}
          disabled={isOff}
          invalid={invalid}
          aria-invalid={ariaInvalid}
          aria-valuetext={getValueText?.(values[index], index)}
          {...(multi ? {} : { "aria-label": ariaLabel, "aria-labelledby": ariaLabelledby, "aria-describedby": ariaDescribedby })}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
