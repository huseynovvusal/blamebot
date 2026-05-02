"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { CandyButton } from "@/components/candy-button"
import { cn } from "@/lib/utils"

export function AdminLoginForm() {
  const sp = useSearchParams()
  const next = sp.get("next") || "/config"
  const [token, setToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
        credentials: "same-origin",
      })
      if (!res.ok) {
        let msg = "That token didn't match. Try again."
        try {
          const data = (await res.json()) as { error?: string }
          if (data?.error) msg = data.error
        } catch {}
        console.log("[v0] login failed status=", res.status, "msg=", msg)
        setError(msg)
        setBusy(false)
        return
      }
      console.log("[v0] login ok, hard-navigating to", next)
      // Hard navigation so the form unmounts even if middleware redirects back here.
      window.location.href = next
      // Safety: if the redirect somehow doesn't happen, clear the spinner.
      setTimeout(() => setBusy(false), 4000)
    } catch (err) {
      console.log("[v0] login threw:", err)
      setError("Login failed. Check the network tab.")
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="token"
          className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          Admin token
        </label>
        <input
          id="token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoFocus
          autoComplete="off"
          placeholder="••••••••••"
          required
          className={cn(
            "h-12 w-full rounded-xl border-2 px-4 font-mono text-base bg-card",
            "transition-shadow duration-200",
            "focus:outline-none focus:border-primary focus:shadow-[4px_4px_0_0_var(--primary)]",
            error ? "border-destructive shadow-[4px_4px_0_0_var(--destructive)]" : "border-foreground",
          )}
        />
        {error ? (
          <p className="text-xs font-semibold text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Matches the ADMIN_TOKEN env var.</p>
        )}
      </div>
      <CandyButton type="submit" tone="violet" disabled={busy || !token} className="w-full">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.75} /> Verifying…
          </>
        ) : (
          "Sign in"
        )}
      </CandyButton>
    </form>
  )
}
