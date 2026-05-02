import type { Metadata } from "next"
import { Outfit, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const display = Outfit({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
})

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "BlameBot — find the blame, fix the outage",
  description:
    "AI on-call agent. Vercel deploy failures, Sentry errors, and uptime alerts become explained incidents, paged owners, and one-tap rollbacks.",
  generator: "v0.app",
  applicationName: "BlameBot",
  keywords: ["incident response", "Vercel", "Slack bot", "AI", "DevOps", "postmortem"],
}

export const viewport = {
  themeColor: "#FFFDF5",
  colorScheme: "light",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster theme="light" position="bottom-right" />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
