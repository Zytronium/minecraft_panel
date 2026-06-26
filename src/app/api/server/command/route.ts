import { NextResponse } from "next/server"
import { minecraftManager } from "@/lib/minecraft/manager"
import { z } from "zod"

const schema = z.object({ command: z.string().min(1).max(256) })

export async function POST(req: Request) {
  try {
    const { command } = schema.parse(await req.json())
    minecraftManager.sendCommand(command)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
