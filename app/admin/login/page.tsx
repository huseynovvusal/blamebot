import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function AdminLoginPage() {
  // Demo mode: no login required, redirect directly to dashboard
  redirect("/dashboard")
}
