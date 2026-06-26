import { NextResponse } from "next/server"
import { minecraftManager } from "@/lib/minecraft/manager"

export async function POST() {
  try {
    minecraftManager.stop()
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    )
  }
}
