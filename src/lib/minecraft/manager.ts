import { spawn, ChildProcessWithoutNullStreams } from "child_process"
import { EventEmitter } from "events"
import path from "path"

// -------- types --------
export type ServerStatus = "stopped" | "starting" | "running" | "stopping"

export interface LogEntry {
  message: string
  source:  "stdout" | "stderr" | "system"
  timestamp: Date
}

// -------- manager --------
class MinecraftManager extends EventEmitter {
  private process:  ChildProcessWithoutNullStreams | null = null
  private _status:  ServerStatus = "stopped"
  private _logBuffer: LogEntry[] = []
  private readonly maxBufferSize = 500

  get status(): ServerStatus {
    return this._status
  }

  get logBuffer(): LogEntry[] {
    return [...this._logBuffer]
  }

  // -------- start --------
  start(serverDir: string, jarFile: string, jvmArgs: string[] = []) {
    if (this._status !== "stopped") {
      throw new Error(`Cannot start - server is ${this._status}`)
    }

    const args = [
      ...jvmArgs,
      "-jar",
      path.resolve(serverDir, jarFile),
      "--nogui",
    ]

    this.process = spawn("java", args, {
      cwd: path.resolve(serverDir),
    })

    this.setStatus("starting")
    this.emitLog("system", `Starting server: java ${args.join(" ")}`)

    this.process.stdout.setEncoding("utf8")
    this.process.stderr.setEncoding("utf8")

    this.process.stdout.on("data", (data: string) => {
      for (const line of data.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed) continue
        this.emitLog("stdout", trimmed)

        // -------- detect running state --------
        if (trimmed.includes("Done (") && trimmed.includes("For help, type")) {
          this.setStatus("running")
        }
      }
    })

    this.process.stderr.on("data", (data: string) => {
      for (const line of data.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed) continue
        this.emitLog("stderr", trimmed)
      }
    })

    this.process.on("exit", (code) => {
      this.emitLog("system", `Server process exited with code ${code}`)
      this.process = null
      this.setStatus("stopped")
    })

    this.process.on("error", (err) => {
      this.emitLog("system", `Process error: ${err.message}`)
      this.process = null
      this.setStatus("stopped")
    })
  }

  // -------- stop --------
  stop() {
    if (!this.process || this._status === "stopped") {
      throw new Error("Server is not running")
    }
    this.setStatus("stopping")
    this.emitLog("system", "Sending stop command...")
    this.process.stdin.write("stop\n")
  }

  // -------- send console command --------
  sendCommand(command: string) {
    if (!this.process || this._status !== "running") {
      throw new Error("Server is not running")
    }
    this.process.stdin.write(command + "\n")
    this.emitLog("system", `> ${command}`)
  }

  // -------- internal helpers --------
  private setStatus(status: ServerStatus) {
    this._status = status
    this.emit("status", status)
  }

  private emitLog(source: LogEntry["source"], message: string) {
    const entry: LogEntry = { message, source, timestamp: new Date() }
    this._logBuffer.push(entry)
    if (this._logBuffer.length > this.maxBufferSize) {
      this._logBuffer.shift()
    }
    this.emit("log", entry)
  }
}

// -------- singleton / dev hot-reload guard --------
const g = global as typeof globalThis & { _mcManager?: MinecraftManager }
export const minecraftManager: MinecraftManager = g._mcManager ?? (g._mcManager = new MinecraftManager())
