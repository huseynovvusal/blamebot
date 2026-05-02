export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin" })
  if (!res.ok) {
    const err = new Error(`Request failed: ${res.status}`)
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

export const postJSON = async <T = unknown>(url: string, body: unknown): Promise<T> => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Request failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<T>
}
