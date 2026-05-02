import { cn } from "@/lib/utils"

/**
 * Severity gets the loudest color in the palette so P1 reads instantly.
 *  P1 → hot pink (with optional pulse)  P2 → amber  P3 → muted slate
 */
const STYLES: Record<string, string> = {
  P1: "bg-destructive text-foreground",
  P2: "bg-accent text-accent-foreground",
  P3: "bg-secondary text-foreground",
}

export function SeverityPill({
  severity,
  className,
  pulse = false,
}: {
  severity: string
  className?: string
  pulse?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-2 border-foreground px-2.5 py-0.5",
        "font-mono text-[10px] font-bold tracking-widest uppercase",
        STYLES[severity] ?? STYLES.P3,
        pulse && severity === "P1" && "pulse-dot",
        className,
      )}
    >
      {severity}
    </span>
  )
}
