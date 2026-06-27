"use client"

import { useServerWebSocket } from "@/hooks/useServerWebSocket"
import { useState } from "react"
import type { ServerStatus } from "@/lib/minecraft/manager"
import ConsolePanel    from "./ConsolePanel"
import PropertiesEditor from "./PropertiesEditor"
import WhitelistEditor from "./WhitelistEditor"

// -------- config --------
const STATUS: Record<ServerStatus, { label: string; color: string }> = {
  stopped:  { label: "Offline",  color: "var(--red)"   },
  starting: { label: "Starting", color: "var(--amber)"  },
  running:  { label: "Online",   color: "var(--green)"  },
  stopping: { label: "Stopping", color: "var(--amber)"  },
}

type Tab = "console" | "properties" | "whitelist"

const TABS: { id: Tab; label: string }[] = [
  { id: "console",    label: "Console"    },
  { id: "properties", label: "Properties" },
  { id: "whitelist",  label: "Whitelist"  },
]

async function post(path: string) {
  return fetch(path, { method: "POST" })
}

// -------- component --------
export default function Dashboard() {
  const { logs, status, players, connected } = useServerWebSocket()
  const [busy, setBusy]             = useState<"start" | "stop" | null>(null)
  const [activeTab, setActiveTab]   = useState<Tab>("console")

  const s           = STATUS[status]
  const statusColor = s.color
  const isRunning   = status === "running"

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

      {/* -------- tab bar -------- */}
      <div style={{
        display: "flex", flexShrink: 0, padding: "0 20px",
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "9px 16px", background: "transparent", border: "none",
                borderBottom: `2px solid ${active ? statusColor : "transparent"}`,
                color: active ? "var(--text)" : "var(--muted)",
                fontFamily: "inherit", fontSize: "12px", cursor: "pointer",
                letterSpacing: "0.04em", marginBottom: "-1px",
                transition: "color 0.2s, border-color 0.2s",
              }}
            >
              {tab.label.toUpperCase()}
            </button>
          )
        })}
      </div>

      {/* -------- content + sidebar -------- */}
      <div style={{
        flex: 1, overflow: "hidden", display: "flex", flexDirection: "row",
        gap: "14px", padding: "14px 20px 16px",
      }}>

        {/* -------- main content -------- */}
      <div style={{
        flex: 1, overflow: "hidden", display: "flex", flexDirection: "column",
        borderLeft: `3px solid ${statusColor}`,
        transition: "border-color 0.4s",
      }}>
        {activeTab === "console"    && <ConsolePanel logs={logs} status={status} />}
        {activeTab === "properties" && <PropertiesEditor />}
        {activeTab === "whitelist"  && <WhitelistEditor />}
      </div>

        {/* -------- players sidebar -------- */}
        <div style={{
          width: "180px", flexShrink: 0, display: "flex", flexDirection: "column",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "4px", overflow: "hidden",
        }}>
          {/* sidebar header */}
          <div style={{
            padding: "7px 10px", borderBottom: "1px solid var(--border2)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: "11px", letterSpacing: "0.07em", color: "var(--muted)" }}>
              PLAYERS
            </span>
            <span style={{
              fontSize: "11px", color: isRunning ? "var(--green)" : "var(--dim)",
              transition: "color 0.3s",
            }}>
              {isRunning ? `${players.length} online` : "-"}
            </span>
          </div>

          {/* sidebar body */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {!isRunning ? (
              <div style={{
                padding: "16px 10px", fontSize: "11px",
                color: "var(--dim)", textAlign: "center", lineHeight: "1.6",
              }}>
                Server offline
              </div>
            ) : players.length === 0 ? (
              <div style={{
                padding: "16px 10px", fontSize: "11px",
                color: "var(--dim)", textAlign: "center", lineHeight: "1.6",
              }}>
                No players online
              </div>
            ) : players.map(p => (
              <div
                key={p.name}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "6px 10px", borderBottom: "1px solid var(--border2)",
                }}
              >
                {p.uuid ? (
                  <img
                    src={`https://mc-heads.net/avatar/${p.uuid}/20`}
                    alt={p.name}
                    width={20} height={20}
                    style={{ borderRadius: "2px", imageRendering: "pixelated", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 20, height: 20, flexShrink: 0, borderRadius: "2px",
                    background: "var(--border)", opacity: 0.5,
                  }} />
                )}
                <span style={{
                  fontSize: "12px", color: "var(--text)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>

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
        opacity: disabled ? 0.4 : 1, transition: "opacity 0.2s",
        letterSpacing: "0.03em",
      }}
    >
      {label}
    </button>
  )
}
