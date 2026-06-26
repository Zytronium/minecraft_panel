import { WebSocket, WebSocketServer } from "ws"
import { minecraftManager, LogEntry, ServerStatus } from "../minecraft/manager"

// -------- types --------
export type WsMessage =
  | { type: "log";    data: LogEntry }
  | { type: "status"; data: ServerStatus }
  | { type: "history"; data: LogEntry[] }

// -------- broadcast to all connected clients --------
function broadcast(wss: WebSocketServer, message: WsMessage) {
  const payload = JSON.stringify(message)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  }
}

// -------- attach wss to the minecraft manager --------
export function attachWebSocketServer(wss: WebSocketServer) {

  // -------- forward live events to all clients --------
  minecraftManager.on("log", (entry: LogEntry) => {
    broadcast(wss, { type: "log", data: entry })
  })

  minecraftManager.on("status", (status: ServerStatus) => {
    broadcast(wss, { type: "status", data: status })
  })

  // -------- send history + current status on new connection --------
  wss.on("connection", (ws) => {
    const history = minecraftManager.logBuffer
    ws.send(JSON.stringify({ type: "history", data: history } satisfies WsMessage))
    ws.send(JSON.stringify({ type: "status", data: minecraftManager.status } satisfies WsMessage))

    ws.on("error", (err) => {
      console.error("[ws] client error:", err.message)
    })
  })
}
