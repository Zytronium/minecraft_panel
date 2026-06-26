import { NextResponse } from "next/server"
import { minecraftManager } from "@/lib/minecraft/manager"

export async function POST() {
  const serverDir = process.env.MC_SERVER_DIR
  const jarFile   = process.env.MC_JAR_FILE
  const jvmArgs   = (process.env.MC_JVM_ARGS ?? "-Xms1G -Xmx2G").split(" ")

  if (!serverDir || !jarFile) {
    return NextResponse.json(
      { error: "MC_SERVER_DIR or MC_JAR_FILE not configured" },
      { status: 500 }
    )
  }

  try {
    minecraftManager.start(serverDir, jarFile, jvmArgs)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    )
  }
}
