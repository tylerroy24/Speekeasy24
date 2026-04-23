import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { createHmac, timingSafeEqual } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 3001
const IS_PROD = process.env.NODE_ENV === 'production'
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || (IS_PROD ? null : 'http://localhost:5173')
const ALLOWED_ORIGINS = ALLOWED_ORIGIN
  ? [ALLOWED_ORIGIN, ALLOWED_ORIGIN.replace('app.', ''), ALLOWED_ORIGIN.replace('://', '://app.')]
  : []
const WORKER_ID = process.env.WORKER_ID || process.pid

// ── Trust proxy (required for load balancers) ──────────────────
// Tells Express to trust X-Forwarded-For, X-Forwarded-Proto headers
// from Railway, Render, AWS ALB, Nginx, Cloudflare, etc.
// The number '1' means trust one level of proxy
app.set('trust proxy', 1)

// ── Logging ────────────────────────────────────────────────────
function log(msg) {
  console.log('[' + new Date().toLocaleTimeString() + '][w:' + WORKER_ID + '] ' + msg)
}

// ── Security middleware ────────────────────────────────────────

// Helmet sets secure HTTP headers (CSP, HSTS, XSS protection, etc.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
      connectSrc: ["'self'", 'https://api.elevenlabs.io', 'https://*.supabase.co', 'wss:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}))

// CORS -- locked to your domain in production
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl)
    if (!origin) return callback(null, true)
    if (!IS_PROD) return callback(null, true) // Open in dev
    if (ALLOWED_ORIGINS.length && (ALLOWED_ORIGINS.includes(origin) || !ALLOWED_ORIGIN)) return callback(null, true)
    log('CORS blocked: ' + origin)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

app.use(express.json({ limit: '1mb' })) // Limit body size
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// ── Compression ────────────────────────────────────────────────
// Gzip/Brotli compress all responses -- critical for performance
// behind a load balancer where bandwidth costs money
import('compression').then(({ default: compression }) => {
  app.use(compression())
}).catch(() => log('compression not installed -- run npm install'))

// ── Load balancer response headers ─────────────────────────────
// Tells clients and monitoring tools which worker/instance served the request
app.use((_req, res, next) => {
  res.setHeader('X-Worker-ID', WORKER_ID)
  res.setHeader('X-Response-Time-Start', Date.now())
  next()
})

// Request logger -- logs real client IP (from X-Forwarded-For via trust proxy)
app.use((req, _res, next) => {
  if (!req.path.startsWith('/health')) {
    log(req.method + ' ' + req.path + ' [' + (req.ip || 'unknown') + ']')
  }
  next()
})

// ── Rate limiters ──────────────────────────────────────────────
// When Redis is configured (REDIS_URL env var), rate limit state is
// shared across all workers/instances -- essential for load balancing.
// Falls back to in-memory store when Redis is not available.

let rateLimitStore = undefined // undefined = default memory store

if (process.env.REDIS_URL) {
  try {
    const { default: RedisStore } = await import('rate-limit-redis').catch(() => ({ default: null }))
    const { default: Redis } = await import('ioredis').catch(() => ({ default: null }))
    if (RedisStore && Redis) {
      const redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
      })
      redis.on('error', (e) => log('Redis error: ' + e.message))
      redis.on('connect', () => log('Redis connected -- rate limits shared across instances'))
      rateLimitStore = new RedisStore({ sendCommand: (...args) => redis.call(...args) })
    }
  } catch (e) {
    log('Redis rate limit store unavailable, using memory: ' + e.message)
  }
}

const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: (req) => req.ip, // Uses real IP via trust proxy
})

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  store: rateLimitStore,
  message: { error: 'Chat rate limit exceeded. Please wait a moment.' },
  keyGenerator: (req) => req.ip,
})

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  store: rateLimitStore,
  message: { error: 'Too many contact form submissions. Please try again later.' },
  keyGenerator: (req) => req.ip,
})

const callLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  store: rateLimitStore,
  message: { error: 'Call rate limit exceeded.' },
  keyGenerator: (req) => req.ip,
})

app.use(standardLimiter)

// ── WebSocket server with auth ─────────────────────────────────
const wss = new WebSocketServer({ noServer: true })
const clients = new Set()

// Upgrade handler -- verify Supabase JWT before accepting WS
server.on('upgrade', async (request, socket, head) => {
  try {
    // Extract token from query string: ws://host/ws?token=JWT
    const url = new URL(request.url, 'http://localhost')
    const token = url.searchParams.get('token')

    if (IS_PROD && !token) {
      log('WS rejected: no token')
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    // In production, verify the Supabase JWT
    if (IS_PROD && token && process.env.VITE_SUPABASE_URL) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)
        const { data: { user }, error } = await sb.auth.getUser(token)
        if (error || !user) {
          log('WS rejected: invalid token')
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
          socket.destroy()
          return
        }
      } catch (e) {
        log('WS token verification failed: ' + e.message)
      }
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  } catch (e) {
    log('WS upgrade error: ' + e.message)
    socket.destroy()
  }
})

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
  if (sent > 0) log('Broadcast [' + event + '] to ' + sent + ' client(s)')
}

// ── Webhook signature verification ────────────────────────────

// Verify Twilio webhook signature
function verifyTwilioSignature(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken || !IS_PROD) return true // Skip in dev

  const twilioSignature = req.headers['x-twilio-signature']
  if (!twilioSignature) return false

  const url = process.env.WEBHOOK_BASE_URL + req.originalUrl
  const params = req.body

  // Build the string to sign
  let toSign = url
  if (params) {
    Object.keys(params).sort().forEach(key => { toSign += key + params[key] })
  }

  const expected = createHmac('sha1', authToken).update(toSign).digest('base64')
  try {
    return timingSafeEqual(Buffer.from(twilioSignature), Buffer.from(expected))
  } catch {
    return false
  }
}

// Verify ElevenLabs webhook secret
function verifyElevenLabsSignature(req) {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET
  if (!secret || !IS_PROD) return true // Skip in dev

  const signature = req.headers['x-elevenlabs-signature']
  if (!signature) return false

  const expected = createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex')

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from('sha256=' + expected))
  } catch {
    return false
  }
}

// ── ElevenLabs API proxy ───────────────────────────────────────
// FIX #1: All ElevenLabs calls go through here -- key never exposed to browser
const EL_BASE = 'https://api.elevenlabs.io/v1'

async function elProxy(path, opts = {}, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured on server' })
  }
  try {
    const response = await fetch(EL_BASE + path, {
      ...opts,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    })
    if (response.status === 204) return res.sendStatus(204)
    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({ error: data.detail?.message || 'ElevenLabs error' })
    }
    res.json(data)
  } catch (err) {
    log('ElevenLabs proxy error: ' + err.message)
    res.status(500).json({ error: err.message })
  }
}

// Middleware to verify user is authenticated for EL proxy routes
async function requireAuth(req, res, next) {
  if (!IS_PROD) return next() // Skip auth in dev

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.slice(7)
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    )
    const { data: { user }, error } = await sb.auth.getUser(token)
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' })
    req.user = user
    next()
  } catch (e) {
    res.status(401).json({ error: 'Auth verification failed' })
  }
}

// ElevenLabs proxy routes (authenticated)
app.get('/api/el/voices', requireAuth, (req, res) => elProxy('/voices', {}, res))
app.get('/api/el/agents', requireAuth, (req, res) => elProxy('/convai/agents', {}, res))
app.get('/api/el/phone-numbers', requireAuth, (req, res) => elProxy('/convai/phone-numbers', {}, res))

app.post('/api/el/agents', requireAuth, (req, res) =>
  elProxy('/convai/agents/create', { method: 'POST', body: JSON.stringify(req.body) }, res)
)

app.delete('/api/el/agents/:id', requireAuth, (req, res) =>
  elProxy('/convai/agents/' + req.params.id, { method: 'DELETE' }, res)
)

app.patch('/api/el/phone-numbers/:id', requireAuth, (req, res) =>
  elProxy('/convai/phone-numbers/' + req.params.id, { method: 'PATCH', body: JSON.stringify(req.body) }, res)
)

app.post('/api/el/call', requireAuth, callLimiter, (req, res) =>
  elProxy('/convai/twilio/outbound_call', { method: 'POST', body: JSON.stringify(req.body) }, res)
)

app.get('/api/el/conversations', requireAuth, (req, res) => {
  const params = new URLSearchParams(req.query)
  elProxy('/convai/conversations?' + params, {}, res)
})

app.get('/api/el/conversations/:id', requireAuth, (req, res) =>
  elProxy('/convai/conversations/' + req.params.id, {}, res)
)

// ── Feature 1: Voicemail detection ────────────────────────────
// Twilio detects AMD (Answering Machine Detection) and posts here
// Set in Twilio: MachineDetection=Enable on your outbound calls
app.post('/webhooks/twilio/amd', (req, res) => {
  if (!verifyTwilioSignature(req)) return res.status(401).json({ error: 'Invalid signature' })
  const { CallSid, AnsweredBy, MachineDetectionDuration } = req.body
  log('AMD: ' + CallSid + ' -> ' + AnsweredBy)
  broadcast('twilio.amd', {
    callSid: CallSid,
    answeredBy: AnsweredBy, // 'human', 'machine_start', 'machine_end_beep', 'fax', 'unknown'
    isVoicemail: AnsweredBy && AnsweredBy.startsWith('machine'),
    duration: MachineDetectionDuration,
  })
  res.sendStatus(204)
})

// Drop voicemail for a call
app.post('/api/voicemail/drop', requireAuth, callLimiter, async (req, res) => {
  const { callSid, message } = req.body
  if (!callSid) return res.status(400).json({ error: 'callSid required' })

  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
  if (!twilioAccountSid || !twilioAuthToken) {
    return res.status(500).json({ error: 'Twilio credentials not configured' })
  }

  try {
    // Use Twilio to redirect the call to a TwiML that reads the voicemail message
    const voicemailMsg = message || process.env.DEFAULT_VOICEMAIL_MESSAGE || 'Hi, this is a message from our team. Please call us back at your earliest convenience. Thank you.'
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">${voicemailMsg}</Say><Hangup/></Response>`

    const authHeader = 'Basic ' + Buffer.from(twilioAccountSid + ':' + twilioAuthToken).toString('base64')
    const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + twilioAccountSid + '/Calls/' + callSid + '.json', {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'Twiml=' + encodeURIComponent(twiml),
    })
    const data = await response.json()
    if (!response.ok) return res.status(400).json({ error: data.message || 'Twilio error' })
    log('Voicemail dropped for: ' + callSid)
    res.json({ ok: true })
  } catch (err) {
    log('Voicemail drop error: ' + err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Feature 2: Live call transfer ─────────────────────────────
// Transfer an active AI call to a human agent
app.post('/api/transfer', requireAuth, async (req, res) => {
  const { callSid, toNumber, agentName } = req.body
  if (!callSid || !toNumber) return res.status(400).json({ error: 'callSid and toNumber required' })

  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
  if (!twilioAccountSid || !twilioAuthToken) {
    return res.status(500).json({ error: 'Twilio credentials not configured' })
  }

  try {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Please hold while I transfer you to ${agentName || 'a team member'}.</Say><Dial timeout="30" action="/webhooks/twilio/transfer-complete"><Number>${toNumber}</Number></Dial></Response>`
    const authHeader = 'Basic ' + Buffer.from(twilioAccountSid + ':' + twilioAuthToken).toString('base64')
    const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + twilioAccountSid + '/Calls/' + callSid + '.json', {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'Twiml=' + encodeURIComponent(twiml),
    })
    const data = await response.json()
    if (!response.ok) return res.status(400).json({ error: data.message || 'Twilio error' })
    log('Call transferred: ' + callSid + ' -> ' + toNumber)
    broadcast('call.transferred', { callSid, toNumber, agentName })
    res.json({ ok: true })
  } catch (err) {
    log('Transfer error: ' + err.message)
    res.status(500).json({ error: err.message })
  }
})

// Transfer completion webhook
app.post('/webhooks/twilio/transfer-complete', (req, res) => {
  const { CallSid, DialCallStatus } = req.body
  log('Transfer complete: ' + CallSid + ' -> ' + DialCallStatus)
  broadcast('call.transfer-complete', { callSid: CallSid, dialStatus: DialCallStatus })
  res.set('Content-Type', 'text/xml')
  res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>')
})

// ── Feature 3: SMS ─────────────────────────────────────────────
const smsLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: 'SMS rate limit exceeded' } })

app.post('/api/sms/send', requireAuth, smsLimiter, async (req, res) => {
  const { to, message, from } = req.body
  if (!to || !message) return res.status(400).json({ error: 'to and message required' })
  if (message.length > 1600) return res.status(400).json({ error: 'Message too long (max 1600 chars)' })

  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
  const twilioFromNumber = from || process.env.TWILIO_PHONE_NUMBER
  if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
    return res.status(500).json({ error: 'Twilio SMS credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.' })
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(twilioAccountSid + ':' + twilioAuthToken).toString('base64')
    const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + twilioAccountSid + '/Messages.json', {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: twilioFromNumber, Body: message }).toString(),
    })
    const data = await response.json()
    if (!response.ok) return res.status(400).json({ error: data.message || 'SMS failed' })
    log('SMS sent to: ' + to)
    res.json({ ok: true, sid: data.sid })
  } catch (err) {
    log('SMS error: ' + err.message)
    res.status(500).json({ error: err.message })
  }
})

// Inbound SMS webhook
app.post('/webhooks/twilio/sms', (req, res) => {
  if (!verifyTwilioSignature(req)) return res.status(401).json({ error: 'Invalid signature' })
  const { From, To, Body, MessageSid } = req.body
  log('Inbound SMS from: ' + From)
  broadcast('sms.received', { from: From, to: To, body: Body, sid: MessageSid, ts: new Date().toISOString() })
  res.set('Content-Type', 'text/xml')
  res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
})

// ── Feature 4: Analytics ───────────────────────────────────────
app.get('/api/analytics', requireAuth, async (req, res) => {
  const { days = 30 } = req.query
  // Analytics are computed from call data stored in Supabase or returned from EL
  // For now we return aggregate data from ElevenLabs conversations
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'ElevenLabs not configured' })

    const response = await fetch('https://api.elevenlabs.io/v1/convai/conversations?page_size=100', {
      headers: { 'xi-api-key': apiKey },
    })
    const data = await response.json()
    const convs = data.conversations || []

    // Compute analytics
    const total = convs.length
    const completed = convs.filter(c => c.status === 'done').length
    const avgDuration = total > 0
      ? Math.round(convs.reduce((sum, c) => sum + (c.metadata?.call_duration_secs || 0), 0) / total)
      : 0

    // Sentiment breakdown
    const sentiments = { positive: 0, neutral: 0, negative: 0, unknown: 0 }
    convs.forEach(c => {
      const s = c.analysis?.user_sentiment?.toLowerCase()
      if (s === 'positive') sentiments.positive++
      else if (s === 'negative') sentiments.negative++
      else if (s === 'neutral') sentiments.neutral++
      else sentiments.unknown++
    })

    // Calls per day (last 7 days)
    const dailyCounts = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      dailyCounts[d.toISOString().slice(0, 10)] = 0
    }
    convs.forEach(c => {
      const day = (c.start_time_unix_secs
        ? new Date(c.start_time_unix_secs * 1000)
        : new Date()).toISOString().slice(0, 10)
      if (dailyCounts[day] !== undefined) dailyCounts[day]++
    })

    // Success rate
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0

    // Top agents by call count
    const agentCounts = {}
    convs.forEach(c => {
      const id = c.agent_id || 'unknown'
      agentCounts[id] = (agentCounts[id] || 0) + 1
    })

    res.json({
      summary: { total, completed, successRate, avgDuration },
      sentiments,
      dailyCounts,
      agentCounts,
      period: days,
    })
  } catch (err) {
    log('Analytics error: ' + err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Feature 5: CRM Webhooks ────────────────────────────────────
// Store user-configured CRM webhook destinations
const crmWebhooks = new Map() // In production use DB

app.get('/api/crm/webhooks', requireAuth, (req, res) => {
  const userId = req.user?.id || 'dev'
  const hooks = crmWebhooks.get(userId) || []
  res.json({ webhooks: hooks })
})

app.post('/api/crm/webhooks', requireAuth, (req, res) => {
  const userId = req.user?.id || 'dev'
  const { name, url, events, headers: customHeaders } = req.body
  if (!name || !url) return res.status(400).json({ error: 'name and url required' })

  const hooks = crmWebhooks.get(userId) || []
  const hook = {
    id: Date.now().toString(),
    name, url,
    events: events || ['call.completed'],
    headers: customHeaders || {},
    createdAt: new Date().toISOString(),
    active: true,
  }
  hooks.push(hook)
  crmWebhooks.set(userId, hooks)
  log('CRM webhook added: ' + name + ' -> ' + url)
  res.json({ ok: true, webhook: hook })
})

app.delete('/api/crm/webhooks/:id', requireAuth, (req, res) => {
  const userId = req.user?.id || 'dev'
  const hooks = (crmWebhooks.get(userId) || []).filter(h => h.id !== req.params.id)
  crmWebhooks.set(userId, hooks)
  res.json({ ok: true })
})

// Fire CRM webhooks when call events happen
async function fireCRMWebhooks(event, data) {
  for (const [userId, hooks] of crmWebhooks.entries()) {
    for (const hook of hooks) {
      if (!hook.active || !hook.events.includes(event)) continue
      try {
        await fetch(hook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...hook.headers },
          body: JSON.stringify({ event, data, ts: new Date().toISOString() }),
          signal: AbortSignal.timeout(5000),
        })
        log('CRM webhook fired: ' + hook.name + ' [' + event + ']')
      } catch (err) {
        log('CRM webhook failed: ' + hook.name + ' -> ' + err.message)
      }
    }
  }
}

// ── Health check ───────────────────────────────────────────────
// Load balancers (Railway, AWS ALB, Nginx) poll this endpoint.
// Must return 200 quickly or the instance is marked unhealthy and removed.
app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

// Liveness check -- is the process alive?
app.get('/health/live', (_req, res) => {
  res.json({ ok: true, pid: process.pid, uptime: Math.floor(process.uptime()) })
})

// Readiness check -- is the instance ready to serve traffic?
// Load balancers use this to decide whether to route requests here.
app.get('/health/ready', (_req, res) => {
  const memUsage = process.memoryUsage()
  const memMB = Math.round(memUsage.rss / 1024 / 1024)
  const isReady = memMB < 512 // Not ready if using more than 512MB RAM

  res.status(isReady ? 200 : 503).json({
    ok: isReady,
    worker: WORKER_ID,
    uptime: Math.floor(process.uptime()),
    memory_mb: memMB,
    ws_clients: clients.size,
  })
})

// Internal health (requires secret header)
app.get('/health/internal', (req, res) => {
  const secret = req.headers['x-internal-secret']
  if (IS_PROD && secret !== process.env.INTERNAL_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const memUsage = process.memoryUsage()
  res.json({
    ok: true,
    worker: WORKER_ID,
    pid: process.pid,
    uptime: Math.floor(process.uptime()),
    memory_mb: Math.round(memUsage.rss / 1024 / 1024),
    heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
    ws_clients: clients.size,
    ts: Date.now(),
  })
})

// ── Claude chatbot proxy ───────────────────────────────────────
// FIX #2: Rate limited, input validated, key server-side
app.post('/api/chat', chatLimiter, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Chat not configured' })
  }

  const { messages } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid messages' })
  }
  if (messages.length > 20) {
    return res.status(400).json({ error: 'Too many messages in conversation' })
  }

  // Validate each message
  for (const msg of messages) {
    if (!['user', 'assistant'].includes(msg.role)) {
      return res.status(400).json({ error: 'Invalid message role' })
    }
    if (typeof msg.content !== 'string' || msg.content.length > 2000) {
      return res.status(400).json({ error: 'Message content too long' })
    }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: 'You are Speakeasy\'s friendly AI assistant. Speakeasy is an AI-powered voice agent platform for inbound and outbound calls. Keep answers concise and focused on Speakeasy. Pricing: Starter $49/mo, Growth $199/mo, Enterprise custom. Features: outbound calling, inbound routing, bulk campaigns, agent builder, live monitoring.',
        messages,
      }),
    })
    const data = await response.json()
    res.json(data)
  } catch (err) {
    log('Chat error: ' + err.message)
    res.status(500).json({ error: 'Chat temporarily unavailable' })
  }
})

// ── Contact form ───────────────────────────────────────────────
// FIX #6: HTML sanitized, rate limited, input validated
app.post('/api/contact', contactLimiter, async (req, res) => {
  const { firstName, lastName, email, message } = req.body

  // Input validation
  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'All fields are required.' })
  }
  if (firstName.length > 100 || lastName.length > 100) {
    return res.status(400).json({ error: 'Name too long.' })
  }
  if (message.length > 1000) {
    return res.status(400).json({ error: 'Message must be 1000 characters or less.' })
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' })
  }

  const recipients = (process.env.CONTACT_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)

  if (!recipients.length) {
    log('Contact form submission (no email configured): ' + email)
    return res.json({ ok: true })
  }

  try {
    const nodemailer = await import('nodemailer').catch(() => null)
    if (!nodemailer) {
      return res.status(500).json({ error: 'Email service not configured.' })
    }

    // FIX #6: Sanitize HTML to prevent injection in email
    const escHtml = (str) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br/>')

    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    await transporter.sendMail({
      from: '"Speekeasy Contact" <' + process.env.SMTP_USER + '>',
      to: recipients.join(', '),
      replyTo: email,
      subject: 'Contact form: ' + firstName.trim() + ' ' + lastName.trim(),
      text: 'Name: ' + firstName + ' ' + lastName + '\nEmail: ' + email + '\n\nMessage:\n' + message,
      html: '<h2>New Contact Form Submission</h2>' +
        '<p><strong>Name:</strong> ' + escHtml(firstName + ' ' + lastName) + '</p>' +
        '<p><strong>Email:</strong> ' + escHtml(email) + '</p>' +
        '<hr/><p><strong>Message:</strong></p>' +
        '<p>' + escHtml(message) + '</p>',
    })

    log('Contact form sent to: ' + recipients.join(', '))
    res.json({ ok: true })
  } catch (err) {
    log('Contact form error: ' + err.message)
    res.status(500).json({ error: 'Failed to send. Please try again later.' })
  }
})

// ── Webhooks ───────────────────────────────────────────────────
// FIX #2: Signature verification on both webhooks

app.post('/webhooks/elevenlabs', (req, res) => {
  // FIX: Verify ElevenLabs signature
  if (!verifyElevenLabsSignature(req)) {
    log('ElevenLabs webhook: invalid signature')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  try {
    const p = req.body
    log('ElevenLabs webhook: conversation=' + p.conversation_id)
    broadcast('call.completed', {
      conversationId: p.conversation_id,
      agentId: p.agent_id,
      status: p.status || 'completed',
      duration: p.metadata?.call_duration_secs,
      direction: p.metadata?.direction || 'outbound',
      from: p.metadata?.from_number,
      to: p.metadata?.to_number,
      transcript: p.transcript || [],
      summary: p.analysis?.transcript_summary || '',
      sentiment: p.analysis?.user_sentiment || null,
      successEval: p.analysis?.call_successful || null,
      timestamp: new Date().toISOString(),
    })

    // Fire CRM webhooks
    fireCRMWebhooks('call.completed', {
      conversationId: p.conversation_id,
      agentId: p.agent_id,
      duration: p.metadata?.call_duration_secs,
      from: p.metadata?.from_number,
      to: p.metadata?.to_number,
      summary: p.analysis?.transcript_summary || '',
      sentiment: p.analysis?.user_sentiment || null,
      success: p.analysis?.call_successful || null,
      timestamp: new Date().toISOString(),
    })
    res.json({ received: true })
  } catch (err) {
    log('ElevenLabs webhook error: ' + err.message)
    res.status(500).json({ error: err.message })
  }
})

app.post('/webhooks/twilio/status', (req, res) => {
  // FIX: Verify Twilio signature
  if (!verifyTwilioSignature(req)) {
    log('Twilio webhook: invalid signature')
    return res.status(401).json({ error: 'Invalid signature' })
  }

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
    to: To,
    from: From,
    duration: Duration ? parseInt(Duration) : null,
  })

  res.sendStatus(204)
})

// ── Production frontend serving ────────────────────────────────
if (IS_PROD) {
  const distPath = path.join(__dirname, 'dist')
  app.use(express.static(distPath, {
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'DENY')
    },
  }))
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

// ── Global error handler ───────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS error' })
  }
  log('Unhandled error: ' + err.message)
  res.status(500).json({ error: IS_PROD ? 'Internal server error' : err.message })
})

// ── Start ──────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log('\n  Speekeasy Backend')
  console.log('  http://localhost:' + PORT)
  console.log('  Worker: ' + WORKER_ID)
  console.log('  Mode: ' + (IS_PROD ? 'PRODUCTION' : 'development'))
  console.log('\n  Security:')
  console.log('  CORS: ' + (IS_PROD ? ALLOWED_ORIGIN : 'open (dev)'))
  console.log('  WS auth: ' + (IS_PROD ? 'enabled' : 'disabled (dev)'))
  console.log('  Rate limiting: ' + (rateLimitStore ? 'Redis (shared)' : 'memory (per-instance)'))
  console.log('\n  Health checks:')
  console.log('  GET /health       -- basic (load balancer)')
  console.log('  GET /health/live  -- liveness probe')
  console.log('  GET /health/ready -- readiness probe\n')
})

// ── Graceful shutdown ──────────────────────────────────────────
// Critical for load balancers: finish in-flight requests before exiting.
// Without this, a rolling deploy drops active requests.
let isShuttingDown = false

function gracefulShutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true
  log('Graceful shutdown initiated (' + signal + ')')

  // Stop accepting new connections
  server.close(() => {
    log('HTTP server closed')

    // Close all WebSocket connections
    clients.forEach(ws => {
      ws.send(JSON.stringify({ event: 'server_shutdown', data: { message: 'Server restarting' } }))
      ws.close()
    })

    log('All connections closed -- exiting')
    process.exit(0)
  })

  // Force exit after 15 seconds if graceful shutdown stalls
  setTimeout(() => {
    log('Forced shutdown after timeout')
    process.exit(1)
  }, 15000)
}

// Handle shutdown signals from cluster manager, OS, and Railway/Render
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('message', (msg) => { if (msg === 'shutdown') gracefulShutdown('cluster') })

// Return 503 to load balancer while shutting down so it stops routing here
app.use((_req, res, next) => {
  if (isShuttingDown) {
    res.setHeader('Connection', 'close')
    return res.status(503).json({ error: 'Server is shutting down' })
  }
  next()
})
