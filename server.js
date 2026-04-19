import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 3001
const IS_PROD = process.env.NODE_ENV === 'production'

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' })
const clients = new Set()

wss.on('connection', (ws) => {
  clients.add(ws)
  log('WS client connected (' + clients.size + ' total)')
  ws.send(JSON.stringify({ event: 'connected', data: { ts: Date.now() } }))
  ws.on('close', () => { clients.delete(ws); log('WS client disconnected') })
  ws.on('error', () => clients.delete(ws))
})

function broadcast(event, data) {
  const msg = JSON.stringify({ event, data, ts: Date.now() })
  let sent = 0
  clients.forEach(ws => { if (ws.readyState === 1) { ws.send(msg); sent++ } })
  log('Broadcast [' + event + '] to ' + sent + ' client(s)')
}

function log(msg) {
  console.log('[' + new Date().toLocaleTimeString() + '] ' + msg)
}

// Middleware
app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use((req, _res, next) => {
  if (!req.path.startsWith('/health')) log(req.method + ' ' + req.path)
  next()
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), clients: clients.size })
})

// Claude API proxy for chatbot
// Keeps the Anthropic API key server-side
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
  }
  try {
    const { messages } = req.body
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: `You are Speakeasy's friendly AI assistant. Speakeasy is an AI-powered voice agent platform that lets businesses create and deploy AI phone agents for inbound and outbound calls.

Key facts about Speakeasy:
- Outbound calling: Automatically call leads, customers, or contacts using AI agents
- Inbound calling: AI agents answer incoming calls 24/7
- Bulk calling: Upload a CSV/Excel list and call hundreds of contacts automatically
- Agent builder: Create custom AI voice agents with unique personalities and goals
- Real-time monitoring: Watch live calls, read transcripts, and track outcomes
- Twilio integration for reliable telephony
- Pricing: Starter $49/mo (200 min), Growth $199/mo (1000 min), Enterprise custom
- Use cases: lead qualification, appointment reminders, sales outreach, customer surveys, payment collection

Keep answers concise, friendly, and focused on Speakeasy. Never mention specific third-party provider names like ElevenLabs. Just say "our voice AI" or "our telephony provider".`,
        messages,
      }),
    })
    const data = await response.json()
    res.json(data)
  } catch (err) {
    log('Chat API error: ' + err.message)
    res.status(500).json({ error: err.message })
  }
})

// Contact form submission
// Emails are sent via nodemailer using SMTP credentials from env vars
// Set these env vars:
//   SMTP_HOST     e.g. smtp.gmail.com
//   SMTP_PORT     e.g. 587
//   SMTP_USER     your sending email address
//   SMTP_PASS     your app password or SMTP password
//   CONTACT_EMAILS  comma-separated list of recipient emails e.g. sales@co.com,support@co.com
app.post('/api/contact', async (req, res) => {
  const { firstName, lastName, email, message } = req.body

  if (!firstName || !lastName || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' })
  }
  if (message.length > 1000) {
    return res.status(400).json({ error: 'Message must be 1000 characters or less.' })
  }
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address.' })
  }

  const recipients = (process.env.CONTACT_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)

  if (!recipients.length) {
    log('Contact form: no CONTACT_EMAILS configured, logging submission only')
    log('From: ' + firstName + ' ' + lastName + ' <' + email + '>')
    log('Message: ' + message)
    return res.json({ ok: true, note: 'Logged (no email configured)' })
  }

  try {
    // Dynamically import nodemailer so server starts even if not installed
    const nodemailer = await import('nodemailer').catch(() => null)
    if (!nodemailer) {
      log('nodemailer not installed - run: npm install nodemailer')
      return res.status(500).json({ error: 'Email service not configured. Run: npm install nodemailer' })
    }

    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: '"Speekeasy Contact" <' + process.env.SMTP_USER + '>',
      to: recipients.join(', '),
      replyTo: email,
      subject: 'New contact form submission from ' + firstName + ' ' + lastName,
      text: [
        'Name: ' + firstName + ' ' + lastName,
        'Email: ' + email,
        '',
        'Message:',
        message,
      ].join('\n'),
      html: [
        '<h2>New Contact Form Submission</h2>',
        '<p><strong>Name:</strong> ' + firstName + ' ' + lastName + '</p>',
        '<p><strong>Email:</strong> <a href="mailto:' + email + '">' + email + '</a></p>',
        '<hr/>',
        '<p><strong>Message:</strong></p>',
        '<p>' + message.replace(/\n/g, '<br/>') + '</p>',
        '<hr/>',
        '<p style="color:#999;font-size:12px">Sent from Speekeasy contact form</p>',
      ].join('\n'),
    })

    log('Contact form email sent to: ' + recipients.join(', '))
    res.json({ ok: true })
  } catch (err) {
    log('Contact form email error: ' + err.message)
    res.status(500).json({ error: 'Failed to send email. Please check your SMTP configuration.' })
  }
})
// Set in: ElevenLabs -> Agents -> [agent] -> Advanced -> Post-call webhook
app.post('/webhooks/elevenlabs', (req, res) => {
  try {
    const p = req.body
    log('ElevenLabs webhook: conversation=' + p.conversation_id + ' status=' + p.status)
    const callEvent = {
      conversationId: p.conversation_id,
      agentId: p.agent_id,
      status: p.status || 'completed',
      duration: p.metadata && p.metadata.call_duration_secs,
      direction: (p.metadata && p.metadata.direction) || 'outbound',
      from: p.metadata && p.metadata.from_number,
      to: p.metadata && p.metadata.to_number,
      transcript: p.transcript || [],
      summary: (p.analysis && p.analysis.transcript_summary) || '',
      sentiment: (p.analysis && p.analysis.user_sentiment) || null,
      successEval: (p.analysis && p.analysis.call_successful) || null,
      timestamp: new Date().toISOString(),
    }
    broadcast('call.completed', callEvent)
    res.json({ received: true })
  } catch (err) {
    console.error('[Webhook Error]', err)
    res.status(500).json({ error: err.message })
  }
})

// Twilio status callback
// Set in: Twilio -> Phone Numbers -> [number] -> Voice -> Status callback
app.post('/webhooks/twilio/status', (req, res) => {
  const { CallSid, CallStatus, To, From, Duration } = req.body
  log('Twilio: ' + CallSid + ' -> ' + CallStatus)
  const statusMap = {
    'initiated': 'initiated', 'ringing': 'calling', 'in-progress': 'calling',
    'completed': 'completed', 'busy': 'failed', 'no-answer': 'failed',
    'failed': 'failed', 'canceled': 'failed',
  }
  broadcast('twilio.status', {
    callSid: CallSid,
    status: statusMap[CallStatus] || CallStatus,
    rawStatus: CallStatus,
    to: To,
    from: From,
    duration: Duration ? parseInt(Duration) : null,
  })
  res.sendStatus(204)
})

// Serve built frontend in production
if (IS_PROD) {
  const distPath = path.join(__dirname, 'dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

// Start
server.listen(PORT, () => {
  console.log('\n  Speekeasy Backend running')
  console.log('  http://localhost:' + PORT)
  console.log('  WebSocket: ws://localhost:' + PORT + '/ws')
  console.log('\n  Webhooks:')
  console.log('  POST /webhooks/elevenlabs')
  console.log('  POST /webhooks/twilio/status')
  console.log('\n  Expose with: ngrok http ' + PORT + '\n')
})
