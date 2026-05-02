/**
 * Pure-SVG decorative primitives for the Playful Geometric system.
 * Use absolutely positioned behind content, marked aria-hidden.
 */

import { cn } from "@/lib/utils"

type Tone = "violet" | "pink" | "amber" | "mint" | "sky" | "ink"

const TONE_VAR: Record<Tone, string> = {
  violet: "var(--primary)",
  pink: "var(--destructive)",
  amber: "var(--accent)",
  mint: "var(--success)",
  sky: "var(--info)",
  ink: "var(--foreground)",
}

export function Squiggle({
  className,
  tone = "ink",
  width = 120,
  strokeWidth = 3,
}: {
  className?: string
  tone?: Tone
  width?: number
  strokeWidth?: number
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 12"
      width={width}
      height={(12 * width) / 120}
      className={className}
      fill="none"
    >
      <path
        d="M2 6 C 12 0, 22 12, 32 6 S 52 0, 62 6 S 82 12, 92 6 S 112 0, 118 6"
        stroke={TONE_VAR[tone]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function StarBurst({ className, tone = "amber" }: { className?: string; tone?: Tone }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className}>
      <path
        d="M50 4 L57 38 L92 32 L66 56 L86 88 L50 70 L14 88 L34 56 L8 32 L43 38 Z"
        fill={TONE_VAR[tone]}
        stroke={TONE_VAR.ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function BlobCircle({
  className,
  tone = "amber",
  size = 280,
}: {
  className?: string
  tone?: Tone
  size?: number
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
    >
      <path
        d="M40 4 C70 -2 96 18 96 48 C96 76 78 96 50 96 C22 96 4 78 4 50 C4 28 14 8 40 4 Z"
        fill={TONE_VAR[tone]}
      />
    </svg>
  )
}

export function Triangle({
  className,
  tone = "pink",
  size = 32,
  rotate = 0,
}: {
  className?: string
  tone?: Tone
  size?: number
  rotate?: number
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <path
        d="M16 2 L30 28 L2 28 Z"
        fill={TONE_VAR[tone]}
        stroke={TONE_VAR.ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Dot({
  className,
  tone = "violet",
  size = 16,
}: {
  className?: string
  tone?: Tone
  size?: number
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      width={size}
      height={size}
      className={className}
    >
      <circle cx="8" cy="8" r="7" fill={TONE_VAR[tone]} stroke={TONE_VAR.ink} strokeWidth="2" />
    </svg>
  )
}

export function PlusMark({
  className,
  tone = "mint",
  size = 24,
}: {
  className?: string
  tone?: Tone
  size?: number
}) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} className={className}>
      <path
        d="M12 3 V21 M3 12 H21"
        stroke={TONE_VAR[tone]}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Tiny scattered confetti — drop inside any relative container. */
export function Confetti({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <Triangle className="absolute top-6 left-8 float-slow" tone="pink" size={20} rotate={-12} />
      <Dot className="absolute top-12 right-10" tone="amber" size={14} />
      <PlusMark className="absolute bottom-10 left-12 spin-slow" tone="mint" size={22} />
      <Dot className="absolute bottom-8 right-16 float-slow" tone="violet" size={18} />
      <Triangle className="absolute top-1/2 right-6" tone="amber" size={14} rotate={20} />
    </div>
  )
}

/** Dashed SVG connector between feature cards — desktop only. */
export function DashedConnector({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 80"
      preserveAspectRatio="none"
      className={cn("hidden lg:block absolute inset-x-0 -top-10 h-20 w-full", className)}
    >
      <path
        d="M40 40 C 160 0, 280 80, 400 40 S 560 0, 600 40"
        fill="none"
        stroke={TONE_VAR.ink}
        strokeWidth="2"
        strokeDasharray="6 8"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Underline-style squiggle, full width, used under H1s. */
export function HeadlineSquiggle({
  className,
  tone = "violet",
}: {
  className?: string
  tone?: Tone
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 12"
      preserveAspectRatio="none"
      className={cn("h-3 w-full", className)}
      fill="none"
    >
      <path
        d="M2 6 C 30 0, 60 12, 90 6 S 150 0, 180 6 S 220 12, 238 6"
        stroke={TONE_VAR[tone]}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}
