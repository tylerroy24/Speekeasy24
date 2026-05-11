import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { createServer } from 'http'
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

// Capture raw body during JSON parsing so webhook signature verifiers can
// hash the exact bytes the sender signed.
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8') },
}))
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
  keyGenerator: (req) => req.user?.id || req.ip,
})

const smsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  store: rateLimitStore,
  message: { error: 'SMS rate limit exceeded.' },
  keyGenerator: (req) => req.user?.id || req.ip,
})

app.use(standardLimiter)

// ── Idempotency ────────────────────────────────────────────────
const idempotencyStore = new Map()
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of idempotencyStore) {
    if (now - val.ts > IDEMPOTENCY_TTL) idempotencyStore.delete(key)
  }
}, 60 * 60 * 1000)
function idempotent(req, res, next) {
  const key = req.headers['idempotency-key']
  if (!key) return next()
  if (idempotencyStore.has(key)) {
    const cached = idempotencyStore.get(key)
    log('Idempotency hit: ' + key.slice(0, 16) + '...')
    res.setHeader('X-Idempotency-Replayed', 'true')
    return res.status(cached.status).json(cached.body)
  }
  const originalJson = res.json.bind(res)
  res.json = (body) => {
    if (res.statusCode < 500) idempotencyStore.set(key, { status: res.statusCode, body, ts: Date.now() })
    return originalJson(body)
  }
  next()
}



// ── Auth middleware ────────────────────────────────────────────
// SEC-007: Auth bypass is an explicit opt-in, not a side effect of
// NODE_ENV. Set SKEAUTH_DEV_BYPASS=1 in local development to skip
// Supabase entirely; any other environment requires a valid JWT.
function isDevAuthBypass() {
  return process.env.SKEAUTH_DEV_BYPASS === '1'
}

async function requireAuth(req, res, next) {
  if (isDevAuthBypass()) {
    req.user = { id: 'dev-bypass', email: 'dev@localhost' }
    return next()
  }
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return res.status(401).json({ error: 'Invalid token' })
    req.user = data.user
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Auth error' })
  }
}

// ── Ownership helpers ──────────────────────────────────────────
// SEC-002/003/005: Verify a request's user actually owns the agent or call
// it is acting on. Prefers a service role key when available so RLS does
// not block server-side reads; falls back to the anon key.
async function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL) return null
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  if (!key) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(process.env.SUPABASE_URL, key)
}

async function userOwnsAgent(userId, agentId) {
  if (isDevAuthBypass()) return true
  if (!userId || !agentId) return false
  try {
    const supabase = await getSupabaseAdmin()
    if (!supabase) return false
    const { data } = await supabase
      .from('user_agents')
      .select('agent_id')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .maybeSingle()
    return !!data
  } catch (e) {
    log('userOwnsAgent error: ' + e.message)
    return false
  }
}

async function userOwnsCallSid(userId, callSid) {
  if (isDevAuthBypass()) return true
  if (!userId || !callSid) return false
  try {
    const supabase = await getSupabaseAdmin()
    if (!supabase) return false
    // Match either the stored conversation/call id or the call_sid we stash
    // in metadata when an outbound call is first initiated.
    const { data } = await supabase
      .from('calls')
      .select('id')
      .eq('user_id', userId)
      .or('call_id.eq.' + callSid + ',metadata->>call_sid.eq.' + callSid)
      .maybeSingle()
    return !!data
  } catch (e) {
    log('userOwnsCallSid error: ' + e.message)
    return false
  }
}

async function persistOutboundCall(userId, { agentId, toNumber, agentName, elResponse }) {
  if (isDevAuthBypass()) return
  if (!userId) return
  try {
    const supabase = await getSupabaseAdmin()
    if (!supabase) return
    const callSid = elResponse?.callSid || elResponse?.call_sid || null
    const conversationId = elResponse?.conversation_id || elResponse?.conversationId || null
    const { error } = await supabase.from('calls').insert({
      user_id: userId,
      call_id: conversationId,
      to_number: toNumber || null,
      agent_id: agentId || null,
      agent_name: agentName || null,
      status: 'initiated',
      direction: 'outbound',
      timestamp: new Date().toISOString(),
      metadata: { call_sid: callSid, conversation_id: conversationId },
    })
    if (error) log('persistOutboundCall: ' + error.message)
  } catch (e) {
    log('persistOutboundCall error: ' + e.message)
  }
}

const E164 = /^\+[1-9]\d{6,14}$/

// Upgrade handler -- verify Supabase JWT before accepting WS


// ── In-memory event queue (for polling-based live monitor) ─────
// Stores recent call events so the frontend can poll /api/events
const eventQueue = []
const MAX_EVENTS = 100

function broadcast(type, data) {
  eventQueue.unshift({ type, data, ts: Date.now() })
  if (eventQueue.length > MAX_EVENTS) eventQueue.pop()
}

// Polling endpoint for Live Monitor
app.get('/api/events', (_req, res) => {
  const since = parseInt(_req.query.since || '0')
  const events = since ? eventQueue.filter(e => e.ts > since) : eventQueue.slice(0, 20)
  res.json({ events, serverTime: Date.now() })
})

// ── CRM webhooks store ─────────────────────────────────────────
const crmWebhooks = new Map()

app.get('/api/crm/webhooks', requireAuth, (req, res) => {
  const userId = req.user.id
  res.json({ webhooks: crmWebhooks.get(userId) || [] })
})

app.post('/api/crm/webhooks', requireAuth, (req, res) => {
  const userId = req.user.id
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
  const userId = req.user.id
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

// ── ElevenLabs Proxy Routes ────────────────────────────────────
const EL_BASE = 'https://api.elevenlabs.io/v1'
const EL_KEY = process.env.ELEVENLABS_API_KEY

async function elFetch(path, opts = {}) {
  const res = await fetch(EL_BASE + path, {
    ...opts,
    headers: {
      'xi-api-key': EL_KEY,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { error: text } }
  return { ok: res.ok, status: res.status, data }
}

// SEC-005: The public GET /api/el/agents route is removed. It used to
// list every agent across every tenant. Clients must use /api/el/agents/mine.

// Create agent (auth required; ownership is recorded atomically on success)
app.post('/api/el/agents', requireAuth, idempotent, async (req, res) => {
  const { name, voiceId, prompt, firstMessage } = req.body
  const body = {
    name,
    conversation_config: {
      agent: {
        prompt: { prompt },
        first_message: firstMessage || '',
        language: 'en',
      },
      tts: { voice_id: voiceId },
    },
  }
  const { ok, status, data } = await elFetch('/convai/agents/create', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!ok) return res.status(status).json({ error: data.detail || data.error || 'Failed to create agent' })
  // Record ownership so this user (and only this user) sees the new agent.
  if (data?.agent_id && !isDevAuthBypass()) {
    try {
      const supabase = await getSupabaseAdmin()
      if (supabase) {
        await supabase.from('user_agents').upsert(
          { user_id: req.user.id, agent_id: data.agent_id, agent_name: name || data.agent_id },
          { onConflict: 'user_id,agent_id' }
        )
      }
    } catch (e) {
      log('user_agents upsert on create failed: ' + e.message)
    }
  }
  res.json(data)
})

// Delete agent (auth + ownership)
app.delete('/api/el/agents/:id', requireAuth, async (req, res) => {
  const agentId = req.params.id
  if (!(await userOwnsAgent(req.user.id, agentId))) {
    return res.status(403).json({ error: 'Agent not owned by this user' })
  }
  const { ok, status, data } = await elFetch('/convai/agents/' + agentId, { method: 'DELETE' })
  if (!ok) return res.status(status).json({ error: data.error || 'Failed to delete agent' })
  if (!isDevAuthBypass()) {
    try {
      const supabase = await getSupabaseAdmin()
      if (supabase) {
        await supabase.from('user_agents')
          .delete()
          .eq('user_id', req.user.id)
          .eq('agent_id', agentId)
      }
    } catch (e) {
      log('user_agents delete failed: ' + e.message)
    }
  }
  res.json({ ok: true })
})

// Register agent ownership for a user
app.post('/api/el/agents/:id/register', requireAuth, async (req, res) => {
  const userId = req.user.id
  const { name } = req.body
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    await supabase.from('user_agents').upsert({
      user_id: userId, agent_id: req.params.id, agent_name: name || req.params.id
    }, { onConflict: 'user_id,agent_id' })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get only this user's agents
app.get('/api/el/agents/mine', requireAuth, async (req, res) => {
  const userId = req.user.id
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    const { data } = await supabase.from('user_agents').select('agent_id').eq('user_id', userId)
    const agentIds = new Set((data || []).map(r => r.agent_id))
    const { ok, status, data: elData } = await elFetch('/convai/agents?page_size=100')
    if (!ok) return res.status(status).json({ error: 'ElevenLabs error' })
    const agents = (elData.agents || []).filter(a => agentIds.has(a.agent_id))
    res.json({ agents })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get voices (auth-gated; no per-tenant filter needed but not public)
app.get('/api/el/voices', requireAuth, async (_req, res) => {
  const { ok, status, data } = await elFetch('/voices')
  if (!ok) return res.status(status).json({ error: data.error || 'Failed to get voices' })
  res.json(data)
})

// Get phone numbers (auth-gated; cross-tenant filtering will require a
// per-user phone-number ownership table -- tracked as a separate item)
app.get('/api/el/phone-numbers', requireAuth, async (_req, res) => {
  const { ok, status, data } = await elFetch('/convai/phone-numbers')
  if (!ok) return res.status(status).json({ error: data.error || 'Failed to get phone numbers' })
  res.json(data)
})

// Assign inbound agent to phone number (auth + agent ownership)
app.patch('/api/el/phone-numbers/:id', requireAuth, async (req, res) => {
  const { agentId } = req.body
  if (agentId && !(await userOwnsAgent(req.user.id, agentId))) {
    return res.status(403).json({ error: 'Agent not owned by this user' })
  }
  const body = agentId ? { agent_id: agentId } : { agent_id: null }
  const { ok, status, data } = await elFetch('/convai/phone-numbers/' + req.params.id, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  if (!ok) return res.status(status).json({ error: data.error || 'Failed to update phone number' })
  res.json(data)
})

// Initiate outbound call
// SEC-002: requireAuth + agent-ownership check before dialing on the
// platform Twilio number. Persist the call so /api/transfer can verify
// ownership of the resulting CallSid.
app.post('/api/el/call', requireAuth, idempotent, async (req, res) => {
  const { agentId, toNumber, fromNumberId } = req.body
  if (!agentId || !toNumber) return res.status(400).json({ error: 'agentId and toNumber required' })
  if (!E164.test(toNumber)) {
    return res.status(400).json({ error: 'toNumber must be E.164 (e.g. +15551234567)' })
  }
  if (!(await userOwnsAgent(req.user.id, agentId))) {
    return res.status(403).json({ error: 'Agent not owned by this user' })
  }
  const body = {
    agent_id: agentId,
    to: toNumber,
    ...(fromNumberId && { from_number_id: fromNumberId }),
  }
  const { ok, status, data } = await elFetch('/convai/twilio/outbound-call', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!ok) return res.status(status).json({ error: data.detail || data.error || 'Call failed' })
  persistOutboundCall(req.user.id, { agentId, toNumber, elResponse: data })
  res.json(data)
})

// Get conversations (auth-gated; cross-tenant filtering tracked separately)
app.get('/api/el/conversations', requireAuth, async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days || '7')))
  const { ok, status, data } = await elFetch('/convai/conversations?page_size=100')
  if (!ok) return res.status(status).json({ error: data.error || 'Failed to get conversations' })
  res.json(data)
})

// Get analytics — filtered to the authenticated user's calls via Supabase
app.get('/api/analytics', requireAuth, async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days || '7')))
  const userId = req.user.id

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: calls, error } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', cutoff)
      .order('timestamp', { ascending: false })

    if (error) throw new Error(error.message)

    const recent = calls || []
    const sentiments = { positive: 0, neutral: 0, negative: 0, unknown: 0 }
    const dailyCounts = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      dailyCounts[d] = 0
    }

    recent.forEach(call => {
      const sentiment = call.metadata?.sentiment?.toLowerCase() || 'unknown'
      if (sentiments[sentiment] !== undefined) sentiments[sentiment]++
      else sentiments.unknown++
      const day = new Date(call.timestamp).toISOString().slice(0, 10)
      if (dailyCounts[day] !== undefined) dailyCounts[day]++
    })

    const completed = recent.filter(c => c.status === 'completed').length
    res.json({
      summary: {
        total: recent.length,
        completed,
        successRate: recent.length > 0 ? Math.round((completed / recent.length) * 100) : 0,
        avgDuration: recent.length > 0
          ? Math.round(recent.reduce((a, c) => a + (c.duration || 0), 0) / recent.length)
          : 0,
      },
      sentiments,
      dailyCounts,
    })
  } catch (e) {
    log('Analytics error: ' + e.message)
    res.status(500).json({ error: 'Failed to get analytics' })
  }
})

// Live call transfer
// SEC-003: requireAuth + ownership check on callSid. Without this an
// attacker who guessed or observed a Twilio CallSid could splice
// themselves into any in-progress call.
app.post('/api/transfer', requireAuth, idempotent, async (req, res) => {
  const { callSid, transferTo } = req.body
  if (!callSid || !transferTo) return res.status(400).json({ error: 'callSid and transferTo required' })
  if (!E164.test(transferTo)) {
    return res.status(400).json({ error: 'transferTo must be E.164 (e.g. +15551234567)' })
  }
  if (!(await userOwnsCallSid(req.user.id, callSid))) {
    return res.status(403).json({ error: 'Call not owned by this user' })
  }
  try {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    if (!twilioSid || !twilioToken) return res.status(500).json({ error: 'Twilio not configured' })
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial>${transferTo}</Dial></Response>`
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls/${callSid}.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(twilioSid + ':' + twilioToken).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'Twiml=' + encodeURIComponent(twiml),
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data.message || 'Transfer failed' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// SMS send
// SEC-004: requireAuth + smsLimiter prevent anonymous SMS blasts on the
// platform Twilio number. Phone numbers must be E.164; message length is
// capped at Twilio's segmented-message ceiling.
app.post('/api/sms/send', requireAuth, smsLimiter, async (req, res) => {
  const { to, message } = req.body
  if (!to || !message) return res.status(400).json({ error: 'to and message required' })
  if (!E164.test(to)) return res.status(400).json({ error: 'to must be E.164 (e.g. +15551234567)' })
  if (typeof message !== 'string' || message.length > 1600) {
    return res.status(400).json({ error: 'message must be a string of 1600 chars or fewer' })
  }
  try {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER
    if (!twilioSid || !twilioToken) return res.status(500).json({ error: 'Twilio not configured' })
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(twilioSid + ':' + twilioToken).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: twilioFrom, Body: message }).toString(),
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data.message || 'SMS failed' })
    res.json({ ok: true, sid: data.sid })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

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

// ── Webhook signature verifiers ────────────────────────────────
// SEC-001: Verify HMAC signatures on incoming webhooks before trusting
// the payload. Fail closed in production; in dev, accept unsigned only
// when the relevant secret is unset (so a fresh dev box still works).

function verifyElevenLabsSignature(req) {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET
  if (!secret) {
    if (IS_PROD) {
      log('ElevenLabs webhook: ELEVENLABS_WEBHOOK_SECRET unset in production -- rejecting')
      return false
    }
    log('ElevenLabs webhook: ELEVENLABS_WEBHOOK_SECRET unset in dev -- accepting unsigned (dev only)')
    return true
  }
  const header = req.headers['elevenlabs-signature'] || ''
  // Header format: "t=<unix_seconds>,v0=<hex_hmac_sha256>"
  const parts = Object.fromEntries(
    header.split(',').map(p => p.trim().split('=')).filter(p => p.length === 2)
  )
  const ts = parts.t
  const sig = parts.v0
  if (!ts || !sig) return false
  // Reject anything older than 30 minutes to defeat replay attacks
  const tsNum = parseInt(ts, 10)
  if (!Number.isFinite(tsNum)) return false
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - tsNum)
  if (ageSeconds > 30 * 60) {
    log('ElevenLabs webhook: signature timestamp out of range (' + ageSeconds + 's)')
    return false
  }
  const body = req.rawBody || (req.body ? JSON.stringify(req.body) : '')
  const expected = createHmac('sha256', secret).update(ts + '.' + body).digest('hex')
  try {
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function verifyTwilioSignature(req) {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) {
    if (IS_PROD) {
      log('Twilio webhook: TWILIO_AUTH_TOKEN unset in production -- rejecting')
      return false
    }
    log('Twilio webhook: TWILIO_AUTH_TOKEN unset in dev -- accepting unsigned (dev only)')
    return true
  }
  const sig = req.headers['x-twilio-signature']
  if (!sig) return false
  // Canonical URL: scheme + host + originalUrl (must match what Twilio used
  // to compute the signature on its side; honor x-forwarded-* from the proxy).
  const proto = req.headers['x-forwarded-proto'] || req.protocol
  const host = req.headers['x-forwarded-host'] || req.get('host')
  const url = proto + '://' + host + req.originalUrl
  // Append form params, sorted alphabetically by key, as key+value with no separator.
  const params = req.body || {}
  const sorted = Object.keys(params).sort()
  let data = url
  for (const k of sorted) data += k + String(params[k] ?? '')
  const expected = createHmac('sha1', token).update(data).digest('base64')
  try {
    const a = Buffer.from(sig, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// ── Webhooks ───────────────────────────────────────────────────
// SEC-001: Signature verification on both webhooks.

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
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'DENY')
      if (/\/assets\//.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      } else {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      }
    },
  }))
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.sendFile(path.join(distPath, 'index.html'))
  })
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
// Only start listening when running directly (not on Vercel)
if (process.env.VERCEL !== '1') {
  server.listen(PORT, () => {
    console.log('  Speekeasy backend running on port ' + PORT)
    console.log('  Mode: ' + (IS_PROD ? 'production' : 'development'))
    console.log('  Worker: ' + WORKER_ID + '\n')
  })
}

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

export default app
