const fs = require('fs')

let c = fs.readFileSync('server.js', 'utf8')

const elRoutes = `
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

// Get all agents
app.get('/api/el/agents', async (req, res) => {
  const { ok, status, data } = await elFetch('/convai/agents?page_size=100')
  if (!ok) return res.status(status).json({ error: data.error || 'ElevenLabs error' })
  res.json(data)
})

// Create agent
app.post('/api/el/agents', idempotent, async (req, res) => {
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
  res.json(data)
})

// Delete agent
app.delete('/api/el/agents/:id', async (req, res) => {
  const { ok, status, data } = await elFetch('/convai/agents/' + req.params.id, { method: 'DELETE' })
  if (!ok) return res.status(status).json({ error: data.error || 'Failed to delete agent' })
  res.json({ ok: true })
})

// Get voices
app.get('/api/el/voices', async (_req, res) => {
  const { ok, status, data } = await elFetch('/voices')
  if (!ok) return res.status(status).json({ error: data.error || 'Failed to get voices' })
  res.json(data)
})

// Get phone numbers
app.get('/api/el/phone-numbers', async (_req, res) => {
  const { ok, status, data } = await elFetch('/convai/phone-numbers')
  if (!ok) return res.status(status).json({ error: data.error || 'Failed to get phone numbers' })
  res.json(data)
})

// Assign inbound agent to phone number
app.patch('/api/el/phone-numbers/:id', async (req, res) => {
  const { agentId } = req.body
  const body = agentId ? { agent_id: agentId } : { agent_id: null }
  const { ok, status, data } = await elFetch('/convai/phone-numbers/' + req.params.id, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  if (!ok) return res.status(status).json({ error: data.error || 'Failed to update phone number' })
  res.json(data)
})

// Initiate outbound call
app.post('/api/el/call', idempotent, async (req, res) => {
  const { agentId, toNumber, fromNumberId } = req.body
  if (!agentId || !toNumber) return res.status(400).json({ error: 'agentId and toNumber required' })
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
  res.json(data)
})

// Get conversations
app.get('/api/el/conversations', async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days || '7')))
  const { ok, status, data } = await elFetch('/convai/conversations?page_size=100')
  if (!ok) return res.status(status).json({ error: data.error || 'Failed to get conversations' })
  res.json(data)
})

// Get analytics
app.get('/api/analytics', async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days || '7')))
  const { ok, status, data } = await elFetch('/convai/conversations?page_size=100')
  if (!ok) return res.status(status).json({ error: data.error || 'Failed to get analytics' })

  const conversations = data.conversations || []
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const recent = conversations.filter(c => new Date(c.start_time_unix_secs * 1000).getTime() > cutoff)

  const sentiments = { positive: 0, neutral: 0, negative: 0, unknown: 0 }
  const dailyCounts = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    dailyCounts[d] = 0
  }

  recent.forEach(conv => {
    const sentiment = conv.analysis?.user_sentiment?.toLowerCase() || 'unknown'
    if (sentiments[sentiment] !== undefined) sentiments[sentiment]++
    else sentiments.unknown++
    const day = new Date(conv.start_time_unix_secs * 1000).toISOString().slice(0, 10)
    if (dailyCounts[day] !== undefined) dailyCounts[day]++
  })

  const completed = recent.filter(c => c.status === 'done').length
  res.json({
    summary: {
      total: recent.length,
      completed,
      successRate: recent.length > 0 ? Math.round((completed / recent.length) * 100) : 0,
      avgDuration: recent.length > 0
        ? Math.round(recent.reduce((a, c) => a + (c.metadata?.call_duration_secs || 0), 0) / recent.length)
        : 0,
    },
    sentiments,
    dailyCounts,
  })
})

// Live call transfer
app.post('/api/transfer', idempotent, async (req, res) => {
  const { callSid, transferTo } = req.body
  if (!callSid || !transferTo) return res.status(400).json({ error: 'callSid and transferTo required' })
  try {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    if (!twilioSid || !twilioToken) return res.status(500).json({ error: 'Twilio not configured' })
    const twiml = \`<?xml version="1.0" encoding="UTF-8"?><Response><Dial>\${transferTo}</Dial></Response>\`
    const r = await fetch(\`https://api.twilio.com/2010-04-01/Accounts/\${twilioSid}/Calls/\${callSid}.json\`, {
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
app.post('/api/sms/send', async (req, res) => {
  const { to, message } = req.body
  if (!to || !message) return res.status(400).json({ error: 'to and message required' })
  try {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER
    if (!twilioSid || !twilioToken) return res.status(500).json({ error: 'Twilio not configured' })
    const r = await fetch(\`https://api.twilio.com/2010-04-01/Accounts/\${twilioSid}/Messages.json\`, {
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

`

// Insert before the health routes
c = c.replace(
  "app.get('/health',",
  elRoutes + "app.get('/health',"
)

fs.writeFileSync('server.js', c)
console.log('done')

// Verify
const updated = fs.readFileSync('server.js', 'utf8')
console.log('has /api/el/agents:', updated.includes("'/api/el/agents'"))
console.log('has /api/el/voices:', updated.includes("'/api/el/voices'"))
console.log('has /api/el/call:', updated.includes("'/api/el/call'"))
console.log('has /api/analytics:', updated.includes("'/api/analytics'"))
