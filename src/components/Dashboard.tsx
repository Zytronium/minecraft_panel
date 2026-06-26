"use client"

import { useServerWebSocket, WireLogEntry } from "@/hooks/useServerWebSocket"
import { useEffect, useRef, useState, KeyboardEvent } from "react"
import type { ServerStatus } from "@/lib/minecraft/manager"

// -------- config --------
const STATUS: Record<ServerStatus, { label: string; color: string }> = {
  stopped:  { label: "Offline",  color: "var(--red)"   },
  starting: { label: "Starting", color: "var(--amber)"  },
  running:  { label: "Online",   color: "var(--green)"  },
  stopping: { label: "Stopping", color: "var(--amber)"  },
}

const SOURCE_COLOR: Record<WireLogEntry["source"], string> = {
  stdout: "var(--green)",
  stderr: "var(--amber)",
  system: "var(--muted)",
}

// -------- helpers --------
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour12: false })
}

async function post(path: string, body?: unknown) {
  return fetch(path, {
    method:  "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body:    body ? JSON.stringify(body) : undefined,
  })
}

// -------- main component --------
export default function Dashboard() {
  const { logs, status, connected } = useServerWebSocket()
  const [cmd, setCmd]               = useState("")
  const [history, setHistory]       = useState<string[]>([])
  const [histIdx, setHistIdx]       = useState(-1)
  const [busy, setBusy]             = useState<"start" | "stop" | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const s           = STATUS[status]
  const statusColor = s.color

  // -------- auto-scroll --------
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "instant" })
  }, [logs])

  // -------- server control handlers --------
  async function startServer() {
    setBusy("start")
    await post("/api/server/start")
    setBusy(null)
  }

  async function stopServer() {
    setBusy("stop")
    await post("/api/server/stop")
    setBusy(null)
  }

  // -------- command handlers --------
  async function sendCommand() {
    const c = cmd.trim()
    if (!c || status !== "running") return
    await post("/api/server/command", { command: c })
    setHistory(prev => [c, ...prev.slice(0, 49)])
    setHistIdx(-1)
    setCmd("")
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      sendCommand()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next)
      setCmd(history[next] ?? "")
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next)
      setCmd(next === -1 ? "" : history[next])
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>

      {/* -------- header -------- */}
      <header style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "0 20px", height: "52px", flexShrink: 0,
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
      }}>
        <span>⛏</span>
        <span style={{ fontWeight: 600, fontSize: "13px", letterSpacing: "0.08em" }}>
          MINECRAFT PANEL
        </span>
        <span style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted)" }}>
          <span style={{
            width: "7px", height: "7px", borderRadius: "50%", display: "inline-block",
            background: connected ? "var(--green)" : "var(--red)",
          }} />
          {connected ? "connected" : "reconnecting"}
        </div>
        <span style={{
          fontSize: "11px", padding: "3px 10px", borderRadius: "20px",
          border: `1px solid ${statusColor}`, color: statusColor,
          letterSpacing: "0.08em", transition: "color 0.3s, border-color 0.3s",
        }}>
          {s.label.toUpperCase()}
        </span>
      </header>

      {/* -------- controls -------- */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 20px", flexShrink: 0,
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
      }}>
        <ControlBtn
          label={busy === "start" ? "Starting..." : "▶ Start"}
          onClick={startServer}
          disabled={status !== "stopped" || busy !== null}
          color="var(--green)"
          filled={status === "stopped"}
        />
        <ControlBtn
          label={busy === "stop" ? "Stopping..." : "■ Stop"}
          onClick={stopServer}
          disabled={status !== "running" || busy !== null}
          color="var(--red)"
          filled={status === "running"}
        />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: "12px", color: "var(--dim)" }}>
          mc.zytronium.dev:25565
        </span>
      </div>

      {/* -------- console log -------- */}
      <div style={{
        flex: 1, overflow: "hidden", display: "flex", flexDirection: "column",
        margin: "14px 20px 0",
        borderLeft: `3px solid ${statusColor}`,
        transition: "border-color 0.4s",
      }}>
        <div style={{
          padding: "5px 14px", flexShrink: 0,
          fontSize: "10px", color: "var(--dim)", letterSpacing: "0.1em",
          background: "var(--surface)", borderBottom: "1px solid var(--border2)",
        }}>
          CONSOLE - {logs.length} lines
        </div>
        <div
          style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}
          onClick={() => inputRef.current?.focus()}
        >
          {logs.length === 0 ? (
            <span style={{ color: "var(--dim)", fontSize: "13px" }}>
              No output yet. Start the server to see logs.
            </span>
          ) : logs.map((log, i) => (
            <div
              key={i}
              style={{
                display: "flex", gap: "12px",
                fontSize: "13px", lineHeight: "1.65",
                color: SOURCE_COLOR[log.source],
              }}
            >
              <span style={{
                color: "var(--dim)", flexShrink: 0,
                fontSize: "11px", paddingTop: "3px", userSelect: "none",
              }}>
                {fmtTime(log.timestamp)}
              </span>
              <span style={{ wordBreak: "break-all" }}>{log.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* -------- command input -------- */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 14px 14px",
        margin: "0 20px 16px",
        borderTop: "1px solid var(--border2)",
        borderLeft: `3px solid ${statusColor}`,
        transition: "border-color 0.4s",
      }}>
        <span style={{ color: "var(--dim)", fontSize: "13px", userSelect: "none" }}>$</span>
        <input
          ref={inputRef}
          value={cmd}
          onChange={e => { setCmd(e.target.value); setHistIdx(-1) }}
          onKeyDown={onKeyDown}
          disabled={status !== "running"}
          placeholder={status === "running" ? "Enter command..." : "Server offline"}
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "var(--text)", fontFamily: "inherit", fontSize: "13px",
            opacity: status !== "running" ? 0.35 : 1,
          }}
        />
        <button
          onClick={sendCommand}
          disabled={status !== "running" || !cmd.trim()}
          style={{
            padding: "4px 12px", background: "transparent", cursor: "pointer",
            border: "1px solid var(--border)", borderRadius: "4px",
            color: "var(--muted)", fontFamily: "inherit", fontSize: "12px",
            opacity: status !== "running" || !cmd.trim() ? 0.3 : 1,
          }}
        >
          Send
        </button>
      </div>

    </div>
  )
}

// -------- control button --------
interface ControlBtnProps {
  label:    string
  onClick:  () => void
  disabled: boolean
  color:    string
  filled:   boolean
}

function ControlBtn({ label, onClick, disabled, color, filled }: ControlBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "5px 16px", borderRadius: "5px",
        border: `1px solid ${color}`,
        background: filled ? color : "transparent",
        color:      filled ? "#fff" : color,
        fontFamily: "inherit", fontSize: "12px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "opacity 0.2s",
        letterSpacing: "0.03em",
      }}
    >
      {label}
    </button>
  )
}
