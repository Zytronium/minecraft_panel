import fs from "fs"
import path from "path"
import { minecraftManager } from "./manager"

const QUEUE_FILE = path.resolve(process.cwd(), "data/whitelist-queue.json")

export function readQueue(): string[] {
  try {
    return JSON.parse(fs.readFileSync(QUEUE_FILE, "utf8"))
  } catch {
    return []
  }
}

function writeQueue(queue: string[]) {
  fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true })
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8")
}

// returns false if already queued
export function addToQueue(name: string): boolean {
  const queue = readQueue()
  if (queue.some(n => n.toLowerCase() === name.toLowerCase())) return false
  writeQueue([...queue, name])
  return true
}

export function removeFromQueue(name: string) {
  writeQueue(readQueue().filter(n => n.toLowerCase() !== name.toLowerCase()))
}

async function processQueue() {
  const queue = readQueue()
  if (queue.length === 0) return
  for (const name of queue) {
    try {
      minecraftManager.sendCommand(`whitelist add ${name}`)
      await new Promise(r => setTimeout(r, 500))
    } catch {
      return // server stopped mid-queue, leave remaining entries for next boot
    }
  }
  writeQueue([])
}

export function initWhitelistQueue() {
  minecraftManager.on("status", (status) => {
    if (status === "running") {
      // give the server a moment to finish initializing before sending commands
      setTimeout(() => processQueue(), 2000)
    }
  })
}
