import { WebSocket, WebSocketServer } from "ws"
import { minecraftManager, LogEntry, ServerStatus } from "../minecraft/manager"

export type WsMessage =
  | { type: "log";     data: LogEntry }
  | { type: "status";  data: ServerStatus }
  | { type: "history"; data: LogEntry[] }

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

  wss.on("connection", (ws) => {
    safeSend(ws, JSON.stringify({ type: "history", data: minecraftManager.logBuffer }))
    safeSend(ws, JSON.stringify({ type: "status", data: minecraftManager.status }))
    ws.on("error", (err) => console.error("[ws] client error:", err.message))
  })
}
