
import express from "express"
import cors from "cors"
import { createServer } from "http"
import { WebSocketServer } from "ws"

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: "/ws" })
const clients = new Set()

wss.on("connection", (ws) => {
  clients.add(ws)
  ws.on("close", () => clients.delete(ws))
})

function broadcast(event, data) {
  const msg = JSON.stringify({ event, data })
  clients.forEach(ws => { if (ws.readyState === 1) ws.send(msg) })
}

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get("/health", (_req, res) => res.json({ ok: true }))

app.post("/webhooks/elevenlabs", (req, res) => {
  const p = req.body
  console.log("[Webhook] ElevenLabs event:", p.conversation_id)
  broadcast("call.completed", {
    conversationId: p.conversation_id,
    agentId: p.agent_id,
    status: "completed",
    duration: p.metadata?.call_duration_secs,
    direction: p.metadata?.direction || "outbound",
    from: p.metadata?.from_number,
    to: p.metadata?.to_number,
    transcript: p.transcript || [],
    summary: p.analysis?.transcript_summary || "",
    sentiment: p.analysis?.user_sentiment || null,
    successEval: p.analysis?.call_successful || null,
    timestamp: new Date().toISOString(),
  })
  res.json({ received: true })
})

app.post("/webhooks/twilio/status", (req, res) => {
  const { CallSid, CallStatus, To, From, Duration } = req.body
  console.log("[Twilio]", CallSid, "->", CallStatus)
  broadcast("twilio.status", { callSid: CallSid, status: CallStatus, to: To, from: From, duration: Duration })
  res.sendStatus(204)
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log("Speekeasy backend running at http://localhost:" + PORT)
  console.log("WebSocket: ws://localhost:" + PORT + "/ws")
})
