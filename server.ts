import { createServer } from "http"
import next from "next"
import { WebSocketServer } from "ws"
import { attachWebSocketServer } from "./src/lib/ws/broadcast"
import { initWhitelistQueue } from "./src/lib/minecraft/whitelist"

const dev      = process.env.NODE_ENV !== "production"
const hostname = "127.0.0.1"
const port     = 3000

const app    = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  initWhitelistQueue()

  const httpServer = createServer((req, res) => {
    handle(req, res)
  })

  // -------- websocket server (noServer = we handle upgrade manually) --------
  const wss = new WebSocketServer({ noServer: true })
  attachWebSocketServer(wss)

  httpServer.on("upgrade", (req, socket, head) => {
    // only handle our /ws path - let Next.js HMR handle everything else
    if (req.url === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req)
      })
    }
  })

  httpServer.listen(port, hostname, () => {
    console.log(`> Panel ready on http://${hostname}:${port}`)
  })
})
