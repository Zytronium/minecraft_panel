"use client"

import { useEffect, useRef, useState } from "react"
import type { KeyboardEvent } from "react"
import type { WireLogEntry } from "@/hooks/useServerWebSocket"
import type { ServerStatus } from "@/lib/minecraft/manager"

// -------- config --------
const SOURCE_COLOR: Record<WireLogEntry["source"], string> = {
  stdout: "var(--green)",
  stderr: "var(--amber)",
  system: "var(--muted)",
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour12: false })
}

// -------- component --------
interface ConsolePanelProps {
  logs:   WireLogEntry[]
  status: ServerStatus
}

export default function ConsolePanel({ logs, status }: ConsolePanelProps) {
  const [cmd, setCmd]         = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const logEndRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // -------- auto-scroll --------
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "instant" })
  }, [logs])

  // -------- handlers --------
  async function sendCommand() {
    const c = cmd.trim()
    if (!c || status !== "running") return
    await fetch("/api/server/command", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ command: c }),
    })
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
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* -------- log lines -------- */}
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

      {/* -------- command input -------- */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 14px",
        borderTop: "1px solid var(--border2)",
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
            padding: "4px 12px", background: "transparent",
            border: "1px solid var(--border)", borderRadius: "4px",
            color: "var(--muted)", fontFamily: "inherit", fontSize: "12px",
            cursor: "pointer", opacity: status !== "running" || !cmd.trim() ? 0.3 : 1,
          }}
        >
          Send
        </button>
      </div>

    </div>
  )
}
