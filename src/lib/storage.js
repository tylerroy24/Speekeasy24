// storage.js — user-scoped data layer
// In dev (no Supabase), falls back to localStorage keyed by user ID.
// In production, all calls and agents are stored in Supabase per user.

import { supabase } from './supabase'

const IS_SUPABASE = !!( 
  import.meta.env.VITE_SUPABASE_URL &&
  !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')
)

// ── Settings (always localStorage, not sensitive) ───────────
const SETTINGS_KEY = 'speekeasy_settings'

// ── Calls ───────────────────────────────────────────────────

async function getCallsSupabase() {
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(200)
  if (error) { console.warn('[storage] getCallsSupabase:', error.message); return [] }
  return (data || []).map(normalizeCallFromDB)
}

async function addCallSupabase(call) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const row = {
    user_id:    user.id,
    call_id:    call.callId || null,
    to_number:  call.to || null,
    agent_id:   call.agentId || null,
    agent_name: call.agentName || null,
    status:     call.status || 'initiated',
    direction:  call.direction || 'outbound',
    duration:   call.duration || null,
    timestamp:  call.timestamp || new Date().toISOString(),
    metadata:   call.metadata || {},
  }
  const { data, error } = await supabase.from('calls').insert(row).select().single()
  if (error) { console.warn('[storage] addCallSupabase:', error.message); return null }
  return normalizeCallFromDB(data)
}

async function updateCallSupabase(id, updates) {
  const mapped = {}
  if (updates.status   !== undefined) mapped.status    = updates.status
  if (updates.duration !== undefined) mapped.duration  = updates.duration
  if (updates.agentName !== undefined) mapped.agent_name = updates.agentName
  if (Object.keys(mapped).length === 0) return
  const { error } = await supabase.from('calls').update(mapped).eq('id', id)
  if (error) console.warn('[storage] updateCallSupabase:', error.message)
}

async function saveCallsSupabase(calls) {
  // Used for clear — delete all calls for this user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('calls').delete().eq('user_id', user.id)
}

function normalizeCallFromDB(row) {
  return {
    id:        row.id,
    callId:    row.call_id,
    to:        row.to_number,
    agentId:   row.agent_id,
    agentName: row.agent_name,
    status:    row.status,
    direction: row.direction,
    duration:  row.duration,
    timestamp: row.timestamp,
    metadata:  row.metadata || {},
  }
}

// ── localStorage fallback helpers ────────────────────────────
function userKey(base) {
  try {
    const u = JSON.parse(localStorage.getItem('speekeasy_user') || '{}')
    return base + (u.id ? '_' + u.id : '')
  } catch { return base }
}

function lsGetCalls() {
  try { return JSON.parse(localStorage.getItem(userKey('speekeasy_calls')) || '[]') } catch { return [] }
}

function lsSaveCalls(calls) {
  localStorage.setItem(userKey('speekeasy_calls'), JSON.stringify(calls))
}

function lsAddCall(call) {
  const calls = lsGetCalls()
  const isDuplicate = calls.some(e =>
    e.to === call.to && e.agentId === call.agentId &&
    (e.status === 'calling' || e.status === 'initiated') &&
    Date.now() - new Date(e.timestamp).getTime() < 60 * 1000
  )
  if (isDuplicate) return calls.find(e => e.to === call.to && e.agentId === call.agentId)
  const newCall = { ...call, id: Date.now(), timestamp: new Date().toISOString() }
  lsSaveCalls([newCall, ...calls].slice(0, 200))
  return newCall
}

function lsUpdateCall(id, updates) {
  const calls = lsGetCalls()
  const idx = calls.findIndex(c => c.id === id)
  if (idx !== -1) { calls[idx] = { ...calls[idx], ...updates }; lsSaveCalls(calls) }
}

// ── Agents (localStorage only — ElevenLabs is source of truth) 
function lsGetAgents() {
  try { return JSON.parse(localStorage.getItem(userKey('speekeasy_agents')) || '[]') } catch { return [] }
}
function lsSaveAgents(agents) {
  localStorage.setItem(userKey('speekeasy_agents'), JSON.stringify(agents))
}

// ── Public API ───────────────────────────────────────────────
export const storage = {
  // Settings
  getSettings: () => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') } catch { return {} } },
  saveSettings: (data) => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(data)) },

  // Calls — async when Supabase, sync-compatible otherwise
  getCalls:    () => IS_SUPABASE ? getCallsSupabase()      : lsGetCalls(),
  saveCalls:   (c) => IS_SUPABASE ? saveCallsSupabase(c)   : lsSaveCalls(c),
  addCall:     (c) => IS_SUPABASE ? addCallSupabase(c)     : lsAddCall(c),
  updateCall:  (id, u) => IS_SUPABASE ? updateCallSupabase(id, u) : lsUpdateCall(id, u),

  // Agents (local cache only)
  getAgents:   () => lsGetAgents(),
  saveAgents:  (a) => lsSaveAgents(a),
}
