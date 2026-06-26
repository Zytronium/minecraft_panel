import { NextResponse } from "next/server"
import { minecraftManager } from "@/lib/minecraft/manager"

export async function GET() {
  return NextResponse.json({
    status: minecraftManager.status,
  })
}
