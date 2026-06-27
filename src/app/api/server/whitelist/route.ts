import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { z } from "zod"
import { parseProperties } from "@/lib/minecraft/properties"
import { minecraftManager } from "@/lib/minecraft/manager"
import { readQueue, addToQueue, removeFromQueue } from "@/lib/minecraft/whitelist"

interface WhitelistEntry {
  uuid: string
  name: string
}

function serverDir() {
  const dir = process.env.MC_SERVER_DIR
  if (!dir) throw new Error("MC_SERVER_DIR not configured")
  return dir
}

function isWhitelistEnabled(): boolean {
  try {
    const raw   = fs.readFileSync(path.join(serverDir(), "server.properties"), "utf8")
    const lines = parseProperties(raw)
    const entry = lines.find(l => l.type === "entry" && l.key === "white-list")
    return entry?.type === "entry" && entry.value === "true"
  } catch {
    return false
  }
}

function readWhitelist(): WhitelistEntry[] {
  try {
    return JSON.parse(fs.readFileSync(path.join(serverDir(), "whitelist.json"), "utf8"))
  } catch {
    return []
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      enabled: isWhitelistEnabled(),
      entries: readWhitelist(),
      queue:   readQueue(),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

const entrySchema = z.object({ uuid: z.string(), name: z.string() })

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"),     name:    z.string().min(1) }),
  z.object({ action: z.literal("save"),    entries: z.array(entrySchema) }),
  z.object({ action: z.literal("dequeue"), name:    z.string().min(1) }),
])

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json())

    if (body.action === "add") {
      const { name } = body
      if (minecraftManager.status === "running") {
        minecraftManager.sendCommand(`whitelist add ${name}`)
      } else {
        if (!addToQueue(name)) {
          return NextResponse.json({ error: "Already queued" }, { status: 409 })
        }
      }
      return NextResponse.json({ ok: true })
    }

    if (body.action === "dequeue") {
      removeFromQueue(body.name)
      return NextResponse.json({ ok: true })
    }

    // -------- action: save - write full whitelist for removes --------
    fs.writeFileSync(
      path.join(serverDir(), "whitelist.json"),
      JSON.stringify(body.entries, null, 2),
      "utf8"
    )
    if (minecraftManager.status === "running") {
      minecraftManager.sendCommand("whitelist reload")
    }
    return NextResponse.json({ ok: true })

  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
