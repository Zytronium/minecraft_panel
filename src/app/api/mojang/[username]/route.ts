import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function formatUUID(raw: string): string {
  return `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20)}`
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)

  try {
    const { username } = await params
    const res = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`,
      { signal: controller.signal }
    )
    if (res.status === 404) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Mojang API error: ${res.status}` }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json({ uuid: formatUUID(data.id), name: data.name })
  } catch (err) {
    const e = err as Error
    if (e.name === "AbortError") {
      return NextResponse.json({ error: "Mojang API timed out" }, { status: 504 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  } finally {
    clearTimeout(timer)
  }
}
