"use client"

import { useEffect, useRef, useState } from "react"
import type { ServerStatus, OnlinePlayer } from "@/lib/minecraft/manager"

export interface WireLogEntry {
  message:   string
  source:    "stdout" | "stderr" | "system"
  timestamp: string
}

export function useServerWebSocket() {
  const [logs, setLogs]         = useState<WireLogEntry[]>([])
  const [status, setStatus]     = useState<ServerStatus>("stopped")
  const [players, setPlayers]   = useState<OnlinePlayer[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let cancelled = false

    function connect() {
      if (cancelled) return
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:"
      const ws    = new WebSocket(`${proto}//${window.location.host}/ws`)
      wsRef.current = ws

      ws.onopen  = () => { if (!cancelled) setConnected(true) }
      ws.onerror = () => ws.close()
      ws.onclose = () => {
        if (cancelled) return
        setConnected(false)
        setTimeout(connect, 2000)
      }
      ws.onmessage = (e) => {
        if (cancelled) return
        const msg = JSON.parse(e.data as string)
        if      (msg.type === "history") setLogs(msg.data)
        else if (msg.type === "log")     setLogs(prev => [...prev.slice(-499), msg.data])
        else if (msg.type === "status")  setStatus(msg.data)
        else if (msg.type === "players") setPlayers(msg.data)
      }
    }

    connect()
    return () => { cancelled = true; wsRef.current?.close() }
  }, [])

  return { logs, status, players, connected }
}
