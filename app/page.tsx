import Link from "next/link"
import {
  ArrowRight,
  FlameIcon,
  GitPullRequestIcon,
  RotateCcwIcon,
  ScrollTextIcon,
  ShieldAlertIcon,
  SparklesIcon,
  TerminalIcon,
} from "lucide-react"
import { CandyButton } from "@/components/candy-button"
import { PopCard, PopCardEyebrow } from "@/components/pop-card"
import {
  BlobCircle,
  Confetti,
  DashedConnector,
  Dot,
  HeadlineSquiggle,
  PlusMark,
  StarBurst,
  Triangle,
} from "@/components/decorations"

export const dynamic = "force-static"

const FEATURES = [
  {
    icon: ShieldAlertIcon,
    title: "Detect",
    body: "HMAC-validated webhook receivers for Vercel, Sentry, and UptimeRobot. Deduped, normalized, never doubled-up.",
    tone: "violet" as const,
    eyebrow: "step 01",
  },
  {
    icon: GitPullRequestIcon,
    title: "Explain",
    body: "Pulls the offending commit, files, and PR from GitHub. Surfaces the three most similar past incidents.",
    tone: "pink" as const,
    eyebrow: "step 02",
  },
  {
    icon: SparklesIcon,
    title: "Triage",
    body: "AI writes a tight report — root cause, blast radius, recommended action — and pages the right human.",
    tone: "amber" as const,
    eyebrow: "step 03",
  },
  {
    icon: RotateCcwIcon,
    title: "Act",
    body: "One reply in Slack runs the rollback via the Vercel API. Or let autopilot do it for you.",
    tone: "mint" as const,
    eyebrow: "step 04",
  },
]

const SHADOW_BY_TONE: Record<"violet" | "pink" | "amber" | "mint", "violet" | "pink" | "amber" | "mint"> = {
  violet: "violet",
  pink: "pink",
  amber: "amber",
  mint: "mint",
}

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ───────── Header ───────── */}
      <header className="px-6 py-5 border-b-2 border-foreground bg-background">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-destructive pop-shadow-static group-hover:rotate-6 transition-transform">
              <FlameIcon className="h-5 w-5" strokeWidth={2.75} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-lg font-extrabold tracking-tight">BlameBot</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">on-call agent</span>
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-2">
            <Link
              href="/incidents"
              className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-accent transition-colors"
            >
              Incidents
            </Link>
            <Link
              href="/analytics"
              className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-accent transition-colors"
            >
              Analytics
            </Link>
            <CandyButton asChild size="sm" tone="violet">
              <Link href="/dashboard">
                Open dashboard <ArrowRight className="h-4 w-4" strokeWidth={2.75} />
              </Link>
            </CandyButton>
          </nav>
          <div className="sm:hidden">
            <CandyButton asChild size="sm" tone="violet">
              <Link href="/dashboard">Dashboard</Link>
            </CandyButton>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ───────── Hero ───────── */}
        <section className="relative px-6 pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
          {/* Background decoration */}
          <BlobCircle
            tone="amber"
            size={520}
            className="absolute -left-32 -top-24 -z-0 opacity-90 float-slow"
          />
          <Triangle tone="pink" size={64} rotate={18} className="absolute right-12 top-16 -z-0 float-slow" />
          <PlusMark tone="mint" size={48} className="absolute left-1/2 top-12 -z-0 spin-slow" />
          <Dot tone="violet" size={28} className="absolute right-1/4 bottom-32 -z-0" />

          <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 flex flex-col gap-6">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-foreground bg-card px-3 py-1.5 text-xs font-mono font-semibold pop-shadow-static">
                <span className="h-2 w-2 rounded-full bg-destructive pulse-dot" />
                LIVE during the demo
              </span>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight text-balance">
                Find the blame.
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10">Fix the outage.</span>
                  <HeadlineSquiggle tone="violet" className="absolute -bottom-3 left-0 w-full" />
                </span>
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground leading-relaxed text-pretty">
                BlameBot is the on-call agent that turns every Vercel deploy failure, Sentry error, and uptime
                alert into an explained incident, a paged owner, and{" "}
                <span className="font-semibold text-foreground">(if you let it)</span> an automatic rollback.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <CandyButton asChild tone="violet" size="lg">
                  <Link href="/dashboard">
                    See live dashboard <ArrowRight className="h-4 w-4" strokeWidth={2.75} />
                  </Link>
                </CandyButton>
                <CandyButton asChild tone="cream" size="lg">
                  <Link href="/incidents">
                    Browse incidents
                  </Link>
                </CandyButton>
              </div>
              <div className="flex items-center gap-4 pt-4 text-sm text-muted-foreground">
                <span className="font-mono uppercase tracking-widest text-[10px]">listening on</span>
                <span className="flex flex-wrap gap-2">
                  {["Vercel", "Sentry", "UptimeRobot", "Slack"].map((s) => (
                    <span
                      key={s}
                      className="rounded-full border-2 border-foreground bg-card px-2.5 py-0.5 text-xs font-mono font-semibold"
                    >
                      {s}
                    </span>
                  ))}
                </span>
              </div>
            </div>

            {/* Hero "Slack post" preview */}
            <div className="lg:col-span-5 relative">
              <Confetti />
              <PopCard
                shadow="pink"
                className="relative bg-card -rotate-2 hover:-rotate-1 transition-transform duration-500"
              >
                <PopCardEyebrow tone="pink">
                  <FlameIcon className="h-3 w-3" strokeWidth={3} /> P1 / new
                </PopCardEyebrow>
                <h3 className="mt-3 font-display text-xl font-extrabold leading-tight">
                  Production deploy failed: <span className="font-mono text-base bg-secondary border-2 border-foreground rounded px-1.5 py-0.5">checkout/api</span>
                </h3>
                <div className="mt-4 rounded-xl border-2 border-foreground bg-secondary p-3 font-mono text-xs leading-relaxed">
                  <span className="text-muted-foreground">{"// "}AI report</span>
                  <br />
                  TypeError: Cannot read properties of undefined (reading 'currency')
                  <br />
                  <span className="text-primary font-semibold">root cause:</span> commit <span className="underline">f3a1c</span>
                  {" "}removed currency fallback in cart adapter
                  <br />
                  <span className="text-primary font-semibold">blast radius:</span> all checkouts since 14:32 UTC
                  <br />
                  <span className="text-primary font-semibold">recommend:</span> rollback to previous deploy
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded-full bg-destructive border-2 border-foreground px-3 py-1 text-xs font-display font-bold">
                    rollback
                  </span>
                  <span className="rounded-full bg-card border-2 border-foreground px-3 py-1 text-xs font-display font-bold">
                    hotfix
                  </span>
                  <span className="rounded-full bg-card border-2 border-foreground px-3 py-1 text-xs font-display font-bold">
                    autopilot
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">@sarah</span>
                  <span>·</span>
                  <span>billing pod · primary on-call</span>
                </div>
              </PopCard>
              <Dot tone="amber" size={42} className="absolute -bottom-6 -left-6 wiggle-on-hover" />
              <Triangle tone="violet" size={28} rotate={32} className="absolute -top-3 -right-3 float-slow" />
            </div>
          </div>
        </section>

        {/* ───────── Features ───────── */}
        <section className="relative px-6 py-20 border-y-2 border-foreground bg-card">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center gap-3 mb-14">
              <PopCardEyebrow tone="amber">how it works</PopCardEyebrow>
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-balance">
                Four steps from alert to all-clear.
              </h2>
              <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">
                The whole loop runs in seconds. You stay in Slack. The bot does the digging.
              </p>
            </div>
            <div className="relative">
              <DashedConnector />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {FEATURES.map((c, idx) => {
                  const Icon = c.icon
                  return (
                    <PopCard
                      key={c.title}
                      shadow={SHADOW_BY_TONE[c.tone]}
                      className="relative flex flex-col gap-3 hover:-rotate-1 transition-transform duration-300"
                      style={{ transform: `rotate(${idx % 2 === 0 ? -0.5 : 0.5}deg)` }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={
                            "inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground " +
                            (c.tone === "violet"
                              ? "bg-primary text-primary-foreground"
                              : c.tone === "pink"
                                ? "bg-destructive text-foreground"
                                : c.tone === "amber"
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-success text-foreground")
                          }
                        >
                          <Icon className="h-5 w-5" strokeWidth={2.75} />
                        </span>
                        <PopCardEyebrow tone={c.tone}>{c.eyebrow}</PopCardEyebrow>
                      </div>
                      <h3 className="font-display text-2xl font-extrabold">{c.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                    </PopCard>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ───────── Postmortem section ───────── */}
        <section className="relative px-6 py-20">
          <BlobCircle tone="mint" size={380} className="absolute -right-24 top-12 -z-0 float-slow" />
          <Triangle tone="violet" size={48} rotate={-22} className="absolute left-12 bottom-12 -z-0" />
          <div className="relative max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            <div className="lg:col-span-3 flex flex-col gap-5">
              <PopCardEyebrow tone="mint">
                <ScrollTextIcon className="h-3 w-3" strokeWidth={3} /> after every incident
              </PopCardEyebrow>
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-balance">
                Postmortems write themselves.
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
                Once an incident is resolved, BlameBot writes a blameless postmortem from the timeline —
                summary, root cause, what went well, what went wrong, action items with owners and due dates.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <CandyButton asChild tone="mint">
                  <Link href="/dashboard">
                    Try the loop <ArrowRight className="h-4 w-4" strokeWidth={2.75} />
                  </Link>
                </CandyButton>
                <span className="text-xs text-muted-foreground">
                  Click{" "}
                  <span className="rounded border-2 border-foreground bg-card px-1.5 py-0.5 font-mono font-semibold">
                    Load demo data
                  </span>{" "}
                  on the dashboard.
                </span>
              </div>
            </div>
            <div className="lg:col-span-2 relative">
              <PopCard shadow="violet" className="bg-card rotate-2">
                <div className="flex items-center gap-2 mb-3">
                  <TerminalIcon className="h-4 w-4 text-primary" strokeWidth={2.75} />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    postmortem.md
                  </span>
                </div>
                <ul className="space-y-2 font-mono text-xs">
                  <li>
                    <span className="font-display font-bold text-base">## Summary</span>
                  </li>
                  <li className="text-muted-foreground">Checkout failed for 14m after a commit removed a fallback…</li>
                  <li>
                    <span className="font-display font-bold text-base">## Root cause</span>
                  </li>
                  <li className="text-muted-foreground">currency adapter stopped guarding undefined cart…</li>
                  <li>
                    <span className="font-display font-bold text-base">## Action items</span>
                  </li>
                  <li className="text-muted-foreground">[ ] add adapter unit tests · @sarah · 2d</li>
                  <li className="text-muted-foreground">[ ] gate cart adapter on canary · @priya · 5d</li>
                </ul>
              </PopCard>
              <StarBurst tone="amber" className="absolute -top-6 -right-4 w-16 h-16 rotate-12 wiggle-on-hover" />
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 py-8 border-t-2 border-foreground bg-card">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="font-mono">BlameBot · built for the Vercel hackathon</span>
          <Link
            href="/admin/login"
            className="rounded-full border-2 border-foreground bg-card px-3 py-1 font-mono font-semibold hover:bg-accent transition-colors"
          >
            Admin
          </Link>
        </div>
      </footer>
    </div>
  )
}
