import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { parseProperties, serializeProperties } from "@/lib/minecraft/properties"
import { z } from "zod"

function propsPath() {
  const dir = process.env.MC_SERVER_DIR
  if (!dir) throw new Error("MC_SERVER_DIR not configured")
  return path.join(dir, "server.properties")
}

export async function GET() {
  try {
    const lines = parseProperties(fs.readFileSync(propsPath(), "utf8"))
    return NextResponse.json({ lines })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

const lineSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("comment"), content: z.string() }),
  z.object({ type: z.literal("blank") }),
  z.object({ type: z.literal("entry"), key: z.string(), value: z.string() }),
])

export async function POST(req: Request) {
  try {
    const { lines } = z.object({ lines: z.array(lineSchema) }).parse(await req.json())
    fs.writeFileSync(propsPath(), serializeProperties(lines), "utf8")
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
