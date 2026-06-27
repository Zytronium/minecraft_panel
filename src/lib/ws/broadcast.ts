import { WebSocket, WebSocketServer } from "ws"
import { minecraftManager, LogEntry, ServerStatus, OnlinePlayer } from "../minecraft/manager"

export type WsMessage =
  | { type: "log";     data: LogEntry }
  | { type: "status";  data: ServerStatus }
  | { type: "history"; data: LogEntry[] }
  | { type: "players"; data: OnlinePlayer[] }

function safeSend(ws: WebSocket, payload: string) {
  try {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload)
  } catch (err) {
    console.error("[ws] send error:", (err as Error).message)
  }
}

function broadcast(wss: WebSocketServer, message: WsMessage) {
  const payload = JSON.stringify(message)
  for (const client of wss.clients) safeSend(client, payload)
}

export function attachWebSocketServer(wss: WebSocketServer) {
  wss.on("error", (err) => console.error("[wss] server error:", err.message))

  minecraftManager.on("log", (entry: LogEntry) => {
    broadcast(wss, { type: "log", data: entry })
  })

  minecraftManager.on("status", (status: ServerStatus) => {
    broadcast(wss, { type: "status", data: status })
  })

  minecraftManager.on("players", (players: OnlinePlayer[]) => {
    broadcast(wss, { type: "players", data: players })
  })

  wss.on("connection", (ws) => {
    safeSend(ws, JSON.stringify({ type: "history", data: minecraftManager.logBuffer }))
    safeSend(ws, JSON.stringify({ type: "status",  data: minecraftManager.status }))
    safeSend(ws, JSON.stringify({ type: "players", data: minecraftManager.players }))
    ws.on("error", (err) => console.error("[ws] client error:", err.message))
  })
}
