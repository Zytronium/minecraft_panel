import { createServer } from "http"
import { parse } from "url"
import next from "next"

const dev = process.env.NODE_ENV !== "production"
const hostname = "127.0.0.1"
const port = 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  // -------- websocket server attaches here later --------

  httpServer.listen(port, hostname, () => {
    console.log(`> Panel ready on http://${hostname}:${port}`)
  })
})
