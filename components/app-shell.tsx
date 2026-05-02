"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  ActivityIcon,
  AlertOctagonIcon,
  BarChart3Icon,
  FlameIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  ShieldAlertIcon,
  XIcon,
} from "lucide-react"
import { Triangle, Dot, PlusMark } from "@/components/decorations"

const NAV = [
  { href: "/dashboard", label: "Overview", icon: ActivityIcon, accent: "violet" as const },
  { href: "/incidents", label: "Incidents", icon: AlertOctagonIcon, accent: "pink" as const },
  { href: "/analytics", label: "Analytics", icon: BarChart3Icon, accent: "amber" as const },
  { href: "/config", label: "Config", icon: SettingsIcon, accent: "mint" as const },
]

const ACCENT_BG: Record<string, string> = {
  violet: "bg-primary text-primary-foreground",
  pink: "bg-destructive text-foreground",
  amber: "bg-accent text-accent-foreground",
  mint: "bg-success text-foreground",
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  const Sidebar = (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r-2 border-foreground bg-sidebar overflow-y-auto">
      <div className="flex items-center justify-between gap-2 border-b-2 border-foreground px-5 py-4">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-destructive text-foreground pop-shadow-static group-hover:rotate-3 transition-transform">
            <FlameIcon className="h-5 w-5" strokeWidth={2.75} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-extrabold tracking-tight">BlameBot</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">on-call agent</span>
          </span>
        </Link>
        <button
          onClick={() => setOpen(false)}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-foreground bg-card hover:bg-accent transition-colors"
          aria-label="Close menu"
        >
          <XIcon className="h-4 w-4" strokeWidth={2.75} />
        </button>
      </div>

      <nav className="flex flex-col gap-2 p-3">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
                "transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                active
                  ? "bg-card border-2 border-foreground pop-shadow-static"
                  : "border-2 border-transparent hover:border-foreground hover:bg-accent",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-foreground",
                  active ? ACCENT_BG[item.accent] : "bg-card",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.75} />
              </span>
              <span className="font-display">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto p-3">
        <div className="relative overflow-hidden rounded-2xl border-2 border-foreground bg-card p-4 pop-shadow-static">
          <Dot tone="amber" size={28} className="absolute -right-2 -top-2 wiggle-on-hover" />
          <Triangle tone="pink" size={18} rotate={-18} className="absolute right-3 bottom-3 float-slow" />
          <PlusMark tone="mint" size={16} className="absolute left-2 bottom-2" />
          <div className="relative flex items-center gap-2">
            <ShieldAlertIcon className="h-4 w-4 text-primary" strokeWidth={2.75} />
            <span className="font-display text-sm font-bold">Live</span>
          </div>
          <p className="relative mt-1 text-xs leading-relaxed text-muted-foreground">
            Receivers armed. AI on. Auto-rollback gated to non-prod by default.
          </p>
        </div>

        <button
          onClick={logout}
          className="mt-3 flex w-full items-center gap-2 rounded-full border-2 border-foreground bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-destructive hover:text-foreground transition-colors"
        >
          <LogOutIcon className="h-3.5 w-3.5" strokeWidth={2.75} />
          Sign out admin
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground dot-grid">
      {/* Desktop sidebar — fixed height, never scrolls */}
      <div className="hidden md:flex h-screen">{Sidebar}</div>

      {/* Mobile drawer */}
      {open ? (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative h-full">{Sidebar}</div>
        </div>
      ) : null}

      {/* Main area is the only thing that scrolls */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between border-b-2 border-foreground bg-card px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-foreground bg-destructive">
              <FlameIcon className="h-4 w-4" strokeWidth={2.75} />
            </span>
            <span className="font-display font-extrabold">BlameBot</span>
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-foreground bg-card hover:bg-accent transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon className="h-4 w-4" strokeWidth={2.75} />
          </button>
        </div>
        {children}
      </main>
    </div>
  )
}
