import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

function serverDir(): string {
  const dir = process.env.MC_SERVER_DIR
  if (!dir) throw new Error("MC_SERVER_DIR not configured")
  return path.resolve(dir)
}

// returns null if path escapes the server directory
function resolveSafe(relative: string): string | null {
  const base     = serverDir()
  const resolved = path.resolve(base, relative.replace(/^\/+/, ""))
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null
  return resolved
}

const TEXT_EXTENSIONS = new Set([
  ".txt", ".log", ".json", ".properties", ".yml", ".yaml",
  ".toml", ".cfg", ".conf", ".sh", ".bat", ".md", ".xml",
  ".csv", ".ini", ".env", ".js", ".ts", ".css", ".html",
])

function isText(filePath: string): boolean {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

export async function GET(req: Request) {
  try {
    const url    = new URL(req.url)
    const rel    = url.searchParams.get("path") ?? ""
    const action = url.searchParams.get("action") ?? "auto"

    const abs = resolveSafe(rel)
    if (!abs) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const stat = fs.statSync(abs)

    if (stat.isDirectory()) {
      const entries = fs.readdirSync(abs).map(name => {
        const s = fs.statSync(path.join(abs, name))
        return { name, isDir: s.isDirectory(), size: s.size, modified: s.mtime.toISOString() }
      }).sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      return NextResponse.json({ type: "dir", entries })
    }

    if (action === "download") {
      const content = fs.readFileSync(abs)
      return new Response(content, {
        headers: {
          "Content-Type":        "application/octet-stream",
          "Content-Disposition": `attachment; filename="${path.basename(abs)}"`,
        },
      })
    }

    if (isText(abs)) {
      return NextResponse.json({ type: "file", text: true, content: fs.readFileSync(abs, "utf8") })
    }

    return NextResponse.json({ type: "file", text: false, size: stat.size })

  } catch (err) {
    const e = err as NodeJS.ErrnoException
    if (e.code === "ENOENT") return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? ""

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData()
      const file = form.get("file") as File | null
      const rel  = form.get("path") as string | null
      if (!file || !rel) return NextResponse.json({ error: "Missing file or path" }, { status: 400 })

      const abs = resolveSafe(rel)
      if (!abs) return NextResponse.json({ error: "Access denied" }, { status: 403 })

      fs.mkdirSync(path.dirname(abs), { recursive: true })
      fs.writeFileSync(abs, Buffer.from(await file.arrayBuffer()))
      return NextResponse.json({ ok: true })
    }

    // -------- save text file --------
    const body = await req.json()
    const abs  = resolveSafe(body.path ?? "")
    if (!abs) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    fs.writeFileSync(abs, body.content, "utf8")
    return NextResponse.json({ ok: true })

  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const abs = resolveSafe(url.searchParams.get("path") ?? "")
    if (!abs) return NextResponse.json({ error: "Access denied" }, { status: 403 })
    if (abs === serverDir()) return NextResponse.json({ error: "Cannot delete server root" }, { status: 400 })

    const stat = fs.statSync(abs)
    if (stat.isDirectory()) fs.rmSync(abs, { recursive: true })
    else fs.unlinkSync(abs)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const e = err as NodeJS.ErrnoException
    if (e.code === "ENOENT") return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
