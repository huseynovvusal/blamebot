/**
 * "Sticker" card with hard offset shadow.
 * Use instead of <Card> when you want the playful pop. Lives alongside shadcn Card so dense
 * data tables (incident detail) can keep using the soft variant.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

type ShadowTone = "ink" | "pink" | "amber" | "mint" | "violet" | "none"

const SHADOW_CLASS: Record<ShadowTone, string> = {
  ink: "pop-shadow-static",
  pink: "pop-shadow-pink",
  amber: "pop-shadow-amber",
  mint: "pop-shadow-mint",
  violet: "pop-shadow-violet",
  none: "",
}

export interface PopCardProps extends React.HTMLAttributes<HTMLDivElement> {
  shadow?: ShadowTone
  /** When true, lifts on hover with bouncy transition. */
  interactive?: boolean
  /** Tilts card slightly for that "stuck-on" feel. */
  tilt?: number
  /** Pads the card. Set false if you want full bleed (e.g. table). */
  padded?: boolean
}

export const PopCard = React.forwardRef<HTMLDivElement, PopCardProps>(function PopCard(
  { className, shadow = "ink", interactive = false, tilt, padded = true, style, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border-2 border-foreground bg-card text-card-foreground",
        SHADOW_CLASS[shadow],
        interactive && "pop-shadow",
        padded && "p-4",
        className,
      )}
      style={{ ...(tilt ? { transform: `rotate(${tilt}deg)` } : null), ...style }}
      {...props}
    >
      {children}
    </div>
  )
})

export function PopCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-3 flex items-start justify-between gap-3", className)}
      {...props}
    />
  )
}

export function PopCardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-lg font-bold tracking-tight", className)} {...props} />
}

export function PopCardEyebrow({
  tone = "violet",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "violet" | "pink" | "amber" | "mint" }) {
  const TONE: Record<string, string> = {
    violet: "bg-primary text-primary-foreground",
    pink: "bg-destructive text-destructive-foreground",
    amber: "bg-accent text-accent-foreground",
    mint: "bg-success text-foreground",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-foreground px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest",
        TONE[tone],
        className,
      )}
      {...props}
    />
  )
}
