import { cn } from "@/lib/utils"

// "light" variant = white logo, for use on colored backgrounds
// "default" variant = brand-colored logo, for use on light backgrounds

export function VercelLogo({ className, variant = "default" }: { className?: string; variant?: "default" | "light" }) {
  return (
    <svg viewBox="0 0 75 65" className={cn("inline-block", className)} aria-label="Vercel">
      <path d="M37.59.25l36.95 64H.64l36.95-64z" fill={variant === "light" ? "#fff" : "#000"} />
    </svg>
  )
}

export function SentryLogo({ className, variant = "default" }: { className?: string; variant?: "default" | "light" }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("inline-block", className)} aria-label="Sentry">
      <path
        d="M13.91 2.505c-.873-1.448-2.972-1.448-3.844 0L6.904 7.92a15.478 15.478 0 0 1 8.53 12.811h-2.221A13.301 13.301 0 0 0 5.784 9.814l-2.926 5.06a7.65 7.65 0 0 1 4.435 5.848H2.194a.365.365 0 0 1-.298-.534l1.413-2.402a5.16 5.16 0 0 0-1.614-.913L.296 19.275a2.182 2.182 0 0 0 .812 2.999 2.24 2.24 0 0 0 1.086.288h6.983a9.322 9.322 0 0 0-3.845-8.318l1.11-1.922a11.47 11.47 0 0 1 4.95 10.24h5.915a17.242 17.242 0 0 0-7.885-15.28l2.244-3.845a.37.37 0 0 1 .504-.13c.255.14 9.75 16.708 9.928 16.9a.365.365 0 0 1-.327.543h-2.287c.029.612.029 1.223 0 1.831h2.297a2.206 2.206 0 0 0 1.922-3.31z"
        fill={variant === "light" ? "#fff" : "#5D4FE0"}
      />
    </svg>
  )
}

export function SlackLogo({ className }: { className?: string }) {
  // Always multicolor — use on a light/white background
  return (
    <svg viewBox="0 0 127 127" className={cn("inline-block", className)} aria-label="Slack">
      <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A"/>
      <path d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z" fill="#36C5F0"/>
      <path d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.9 6.5 72.8.6 80.1.6c7.3 0 13.2 5.9 13.2 13.2v33.1z" fill="#2EB67D"/>
      <path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z" fill="#ECB22E"/>
    </svg>
  )
}

export function UptimeRobotLogo({ className, variant = "default" }: { className?: string; variant?: "default" | "light" }) {
  const fill = variant === "light" ? "#fff" : "#3BD671"
  const fillOuter = variant === "light" ? "rgba(255,255,255,0.35)" : "rgba(59,214,113,0.35)"
  return (
    <svg viewBox="0 0 100 100" className={cn("inline-block", className)} aria-label="UptimeRobot">
      <circle cx="50" cy="50" r="49" fill={fillOuter} />
      <circle cx="50" cy="50" r="33" fill={fill} />
    </svg>
  )
}

const BRAND: Record<string, {
  Logo: React.ComponentType<{ className?: string; variant?: "default" | "light" }>
  bg: string
  variant: "default" | "light"
}> = {
  Vercel:      { Logo: VercelLogo,      bg: "bg-[#111]",      variant: "light" },
  Sentry:      { Logo: SentryLogo,      bg: "bg-[#5D4FE0]",   variant: "light" },
  UptimeRobot: { Logo: UptimeRobotLogo, bg: "bg-[#1a7a40]",   variant: "light" },
  Slack:       { Logo: SlackLogo,       bg: "bg-white",       variant: "default" },
}

export function BrandIcon({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const cfg = BRAND[name]
  if (!cfg) return null
  const { Logo, bg, variant } = cfg
  const containerCls = size === "lg" ? "h-16 w-16 rounded-2xl" : size === "sm" ? "h-10 w-10 rounded-xl" : "h-14 w-14 rounded-2xl"
  const logoCls = size === "lg" ? "h-9 w-9" : size === "sm" ? "h-5 w-5" : "h-8 w-8"
  return (
    <span className={cn("inline-flex items-center justify-center", containerCls, bg)}>
      <Logo className={logoCls} variant={variant} />
    </span>
  )
}

export function BrandLogo({ name, className }: { name: string; className?: string }) {
  const cfg = BRAND[name]
  if (!cfg) return null
  return <cfg.Logo className={className} />
}
