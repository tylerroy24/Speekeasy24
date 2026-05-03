const fs = require('fs')
let c = fs.readFileSync('server.js', 'utf8')

const requireAuthFn = `
// ── Auth middleware ────────────────────────────────────────────
async function requireAuth(req, res, next) {
  // In dev, skip auth so local testing works without Supabase
  if (process.env.NODE_ENV !== 'production') return next()
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

`

// Insert before the CRM webhook routes
c = c.replace(
  '// ── WebSocket server with auth ─────────────────────────────────\n\n\n',
  requireAuthFn
)

// Handle case where comment has different spacing
if (!c.includes('function requireAuth')) {
  c = c.replace(
    "app.post('/api/crm/webhooks'",
    requireAuthFn + "app.post('/api/crm/webhooks'"
  )
}

fs.writeFileSync('server.js', c)
console.log('done')
console.log('has requireAuth:', c.includes('function requireAuth'))
