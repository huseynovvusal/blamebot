import { cn } from "@/lib/utils"

const STYLES: Record<string, string> = {
  active: "bg-destructive text-foreground",
  acknowledged: "bg-info text-foreground",
  resolved: "bg-success text-foreground",
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-foreground px-2.5 py-0.5",
        "font-display text-[10px] font-bold uppercase tracking-widest",
        STYLES[status] ?? STYLES.active,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full bg-foreground", status === "active" && "pulse-dot")} />
      {status}
    </span>
  )
}
