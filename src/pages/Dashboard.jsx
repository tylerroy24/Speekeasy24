import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import { Button, Card, Badge, Waveform, Spinner } from '../components/UI'
import { useElevenLabs } from '../lib/elevenlabs'
import { getCached, setCached } from '../hooks/useCache'
import { storage } from '../lib/storage'
import { useCallEvents } from '../hooks/useCallEvents'
import {
  Phone, PhoneCall, PhoneIncoming, PhoneOff, CheckCircle,
  Clock, Activity, Bot, Zap, TrendingUp, X, ArrowUpRight,
  FileSpreadsheet, Upload, Play, Pause,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Helpers ────────────────────────────────────────────────
function formatPhone(val) {
  const digits = val.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 1) return digits.startsWith('1') ? '+1 ' : digits
  if (digits.length <= 4) return `+1 (${digits.slice(1)}`
  if (digits.length <= 7) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4)}`
  if (digits.length <= 11) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return val
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(secs) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Stat Card ──────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent = 'lime' }) {
  const a = {
    lime:   { text: 'text-lime',   bg: 'bg-lime/10',   border: 'border-lime/20' },
    violet: { text: 'text-violet', bg: 'bg-violet/10', border: 'border-violet/20' },
    coral:  { text: 'text-coral',  bg: 'bg-coral/10',  border: 'border-coral/20' },
    ghost:  { text: 'text-ghost',  bg: 'bg-muted',     border: 'border-border' },
  }[accent] || { text: 'text-lime', bg: 'bg-lime/10', border: 'border-lime/20' }

  return (
    <Card className="flex flex-col gap-4">
      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center border', a.bg, a.border)}>
        <Icon size={16} className={a.text} />
      </div>
      <div>
        <p className="font-display font-bold text-3xl text-cream">{value}</p>
        <p className="text-xs text-subtle mt-1">{label}</p>
      </div>
      {sub && <p className="text-xs text-ghost border-t border-border pt-3">{sub}</p>}
    </Card>
  )
}

// ── Activity Feed Item ─────────────────────────────────────
function FeedItem({ call }) {
  const isInbound = call.direction === 'inbound'
  const isLive = call.status === 'calling' || call.status === 'initiated'

  const statusStyles = {
    calling:   { color: 'text-lime',   bg: 'bg-lime/10' },
    initiated: { color: 'text-lime',   bg: 'bg-lime/10' },
    completed: { color: 'text-violet', bg: 'bg-violet/10' },
    failed:    { color: 'text-coral',  bg: 'bg-coral/10' },
  }
  const s = statusStyles[call.status] || statusStyles.initiated

  const StatusIcon = {
    calling: PhoneCall, initiated: Clock, completed: CheckCircle, failed: PhoneOff,
  }[call.status] || Clock

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', s.bg)}>
        {isLive
          ? <span className={clsx('w-2 h-2 rounded-full status-pulse', isInbound ? 'bg-violet' : 'bg-lime')} />
          : <StatusIcon size={13} className={s.color} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-cream truncate">{call.to || call.from || 'Unknown'}</span>
          <span className={clsx(
            'text-xs font-mono px-1.5 py-0.5 rounded border flex-shrink-0',
            isInbound ? 'text-violet bg-violet/10 border-violet/20' : 'text-lime bg-lime/10 border-lime/20'
          )}>
            {isInbound ? 'in' : 'out'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-subtle truncate">{call.agentName || 'Agent'}</span>
          {call.duration && (
            <span className="text-xs font-mono text-subtle">{fmtDuration(call.duration)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-mono text-subtle">{fmtTime(call.timestamp)}</span>
        {isLive && <Waveform active />}
      </div>
    </div>
  )
}

// ── Combined Outbound Panel ────────────────────────────────
async function loadXLSX() {
  if (window.XLSX) return window.XLSX
  await new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
  return window.XLSX
}

async function parseContactFile(file) {
  const XLSX = await loadXLSX()
  const isExcel = /\.(xlsx|xls|xlsm|ods)$/i.test(file.name)
  let rows = []
  if (isExcel) {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
  } else {
    const text = await file.text()
    const delim = text.includes('\t') ? '\t' : ','
    rows = text.trim().split(/\r?\n/).map(l => l.split(delim).map(c => c.trim().replace(/^"|"$/g, '')))
  }
  if (!rows.length) return []
  const first = rows[0].map(c => String(c).trim())
  const hasHeader = first.some(c => /phone|number|mobile|cell|tel/i.test(c))
  const dataRows = hasHeader ? rows.slice(1) : rows
  const phoneCol = hasHeader ? first.findIndex(c => /phone|number|mobile|cell|tel/i.test(c)) : 0
  const nameCol = hasHeader ? first.findIndex(c => /name|first|contact/i.test(c)) : -1
  const results = []
  const seen = new Set()
  dataRows.forEach((cols, i) => {
    if (!cols?.length) return
    const raw = String(cols[phoneCol >= 0 ? phoneCol : 0] || '').trim()
    const name = nameCol >= 0 ? String(cols[nameCol] || '').trim() : ''
    const digits = raw.replace(/\D/g, '')
    if (digits.length >= 10) {
      const e164 = digits.startsWith('1') ? '+' + digits : '+1' + digits
      if (!seen.has(e164)) { seen.add(e164); results.push({ id: Date.now() + i, name, phone: e164, status: 'pending' }) }
    }
  })
  return results
}

// ── Campaign Scheduler ─────────────────────────────────────
function CampaignScheduler({ contacts, delayMs, setDelayMs }) {
  const totalCalls = contacts.filter(c => c.status === 'pending').length
  const [days, setDays] = React.useState(0)
  const [hours, setHours] = React.useState(0)
  const [minutes, setMinutes] = React.useState(5)
  const [mode, setMode] = React.useState('spread')

  React.useEffect(() => {
    if (mode === 'spread' && totalCalls > 1) {
      const totalMs = ((days * 24 * 60) + (hours * 60) + minutes) * 60 * 1000
      const computed = Math.max(1000, Math.floor(totalMs / totalCalls))
      setDelayMs(computed)
    }
  }, [days, hours, minutes, totalCalls, mode])

  const totalWindowMs = ((days * 24 * 60) + (hours * 60) + minutes) * 60 * 1000
  const perCallSecs = totalCalls > 1 ? Math.round(delayMs / 1000) : 0
  const estimatedEnd = totalCalls > 0 && totalWindowMs > 0
    ? new Date(Date.now() + totalWindowMs).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  const inputCls = "w-full bg-ink/80 border border-border text-cream px-3 py-2 rounded-lg text-sm font-mono text-center focus:outline-none focus:border-lime appearance-none"

  return (
    <div className="space-y-3 p-4 rounded-xl border border-border bg-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-lime" />
          <span className="text-xs font-mono text-ghost uppercase tracking-widest">Campaign Schedule</span>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {[['spread', 'Auto-spread'], ['manual', 'Manual']].map(([val, label]) => (
            <button key={val} onClick={() => setMode(val)}
              className={clsx('text-xs font-mono px-2.5 py-1 rounded-md transition-all',
                mode === val ? 'bg-ink text-lime border border-lime/20' : 'text-subtle hover:text-ghost')}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {mode === 'spread' ? (
        <>
          <p className="text-xs text-subtle">Set a total window — calls will be spread evenly across it.</p>
          <div className="grid grid-cols-3 gap-2">
            {[['Days', days, setDays, 30], ['Hours', hours, setHours, 23], ['Minutes', minutes, setMinutes, 59]].map(([label, value, set, max]) => (
              <div key={label}>
                <label className="text-xs font-mono text-ghost block text-center mb-1">{label}</label>
                <input type="number" min={0} max={max} value={value}
                  onChange={e => set(Math.max(0, Math.min(max, Number(e.target.value))))}
                  className={inputCls} />
              </div>
            ))}
          </div>
          {totalCalls > 0 && totalWindowMs > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-lime/5 border border-lime/10">
              <div className="text-xs text-ghost"><span className="text-cream font-mono">{totalCalls}</span> calls · <span className="text-cream font-mono">{perCallSecs}s</span> apart</div>
              {estimatedEnd && <div className="text-xs font-mono text-subtle">ends ~{estimatedEnd}</div>}
            </div>
          )}
          {totalWindowMs === 0 && <p className="text-xs text-coral">Set a time window greater than 0.</p>}
        </>
      ) : (
        <>
          <p className="text-xs text-subtle">Set a fixed delay between each call.</p>
          <select value={delayMs} onChange={e => setDelayMs(Number(e.target.value))}
            className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime appearance-none">
            <option value={1000}>1 second</option>
            <option value={3000}>3 seconds</option>
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
          </select>
        </>
      )}
    </div>
  )
}

function QuickDial({ agents, phoneNumbers, onCall, calling, hasKey }) {
  const [tab, setTab] = useState('single')
  const [toNumber, setToNumber] = useState('+1 ')
  const [agentId, setAgentId] = useState('')
  const [fromId, setFromId] = useState('')
  const [msg, setMsg] = useState(null)
  const [contacts, setContacts] = useState([])
  const [fileName, setFileName] = useState('')
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkPaused, setBulkPaused] = useState(false)
  const [tcpa, setTcpa] = useState(false)
  const [delayMs, setDelayMs] = useState(3000)
  const pausedRef = React.useRef(false)
  const fileInputRef = React.useRef(null)

  useEffect(() => { if (agents.length && !agentId) setAgentId(agents[0].agent_id) }, [agents])
  useEffect(() => { if (phoneNumbers.length && !fromId) setFromId(phoneNumbers[0].phone_number_id) }, [phoneNumbers])

  const handleCall = async () => {
    if (!toNumber) { setMsg({ type: 'error', text: 'Enter a phone number.' }); return }
    if (!agentId) { setMsg({ type: 'error', text: 'Select an agent.' }); return }
    setMsg(null)
    const result = await onCall({ toNumber, agentId, fromId })
    if (result.ok) { setMsg({ type: 'success', text: 'Calling ' + toNumber + '...' }); setToNumber(''); setTimeout(() => setMsg(null), 4000) }
    else { setMsg({ type: 'error', text: result.error }) }
  }

  const handleFile = async (file) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setMsg({ type: 'error', text: 'File too large (max 10MB)' }); return }
    setFileName(file.name); setMsg(null)
    try {
      const parsed = await parseContactFile(file)
      if (!parsed.length) { setMsg({ type: 'error', text: 'No valid phone numbers found.' }); return }
      setContacts(parsed)
    } catch (e) { setMsg({ type: 'error', text: 'Could not parse: ' + e.message }) }
  }

  const updateContact = (id, updates) => setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))

  const startBulk = async () => {
    if (!tcpa) { setMsg({ type: 'error', text: 'Please confirm TCPA consent.' }); return }
    if (!agentId) { setMsg({ type: 'error', text: 'Select an agent.' }); return }
    setBulkRunning(true); setBulkPaused(false); pausedRef.current = false; setMsg(null)
    for (const contact of contacts.filter(c => c.status === 'pending')) {
      while (pausedRef.current) await new Promise(r => setTimeout(r, 300))
      updateContact(contact.id, { status: 'calling' })
      const result = await onCall({ toNumber: contact.phone, agentId, fromId })
      updateContact(contact.id, { status: result.ok ? 'completed' : 'failed' })
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs))
    }
    setBulkRunning(false)
  }

  const pending = contacts.filter(c => c.status === 'pending').length
  const completed = contacts.filter(c => c.status === 'completed').length
  const failed = contacts.filter(c => c.status === 'failed').length
  const AgentSelect = () => agents.length === 0 ? (
    <div className="p-3 rounded-lg bg-muted border border-border text-xs text-subtle">No agents. <a href="/dashboard/agents" className="text-lime hover:underline">Create one</a></div>
  ) : (
    <div>
      <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Agent</label>
      <select value={agentId} onChange={e => setAgentId(e.target.value)} className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime appearance-none">
        {agents.map(a => <option key={a.agent_id} value={a.agent_id}>{a.name}</option>)}
      </select>
    </div>
  )

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex border-b border-border">
        {[{ id: 'single', label: 'Quick Dial', Icon: PhoneCall }, { id: 'bulk', label: 'Bulk Caller', Icon: FileSpreadsheet }].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => { setTab(id); setMsg(null) }}
            className={clsx('flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-mono uppercase tracking-widest transition-colors',
              tab === id ? 'text-lime border-b-2 border-lime bg-lime/5' : 'text-subtle hover:text-ghost')}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      <div className="p-5 space-y-3">
        <AgentSelect />
        {phoneNumbers.length > 0 && (
          <div>
            <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Caller ID</label>
            <select value={fromId} onChange={e => setFromId(e.target.value)} className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime appearance-none">
              {phoneNumbers.map(n => <option key={n.phone_number_id} value={n.phone_number_id}>{n.phone_number}</option>)}
            </select>
          </div>
        )}
        {tab === 'single' && (
          <>
            <div>
              <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Phone number</label>
              <input type="tel" placeholder="(555) 000-0000" value={toNumber}
                onChange={e => setToNumber(formatPhone(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && handleCall()}
                className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/10" />
            </div>
            {msg && <div className={clsx('flex items-start gap-2 p-3 rounded-lg text-xs', msg.type === 'error' ? 'bg-coral/10 border border-coral/20 text-coral' : 'bg-lime/10 border border-lime/20 text-lime')}><X size={12} className="mt-0.5 flex-shrink-0" />{msg.text}</div>}
            <Button onClick={handleCall} loading={calling} disabled={!hasKey || !toNumber || agents.length === 0} className="w-full" size="md">
              <PhoneCall size={14} /> {calling ? 'Dialing...' : 'Call now'}
            </Button>
          </>
        )}
        {tab === 'bulk' && (
          <>
            {contacts.length === 0 ? (
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-lime/30 hover:bg-muted/10 transition-all">
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.tsv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                <Upload size={20} className="text-subtle mx-auto mb-2" />
                <p className="text-xs text-ghost">Drop CSV or Excel file</p>
                <p className="text-xs text-subtle mt-1">.csv .xlsx .xls .tsv</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-panel border border-border">
                  <div>
                    <p className="text-xs font-medium text-cream">{fileName}</p>
                    <p className="text-xs text-subtle">{contacts.length} contacts · {pending} pending · {completed} done · {failed} failed</p>
                  </div>
                  <button onClick={() => { setContacts([]); setFileName('') }} className="text-subtle hover:text-coral transition-colors"><X size={13} /></button>
                </div>
                {contacts.length > 0 && <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-lime rounded-full transition-all" style={{ width: Math.round(((completed + failed) / contacts.length) * 100) + '%' }} /></div>}
                <CampaignScheduler contacts={contacts} delayMs={delayMs} setDelayMs={setDelayMs} />
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-panel">
                  <input type="checkbox" id="tcpa-dash" checked={tcpa} onChange={e => setTcpa(e.target.checked)} className="mt-0.5 accent-lime" />
                  <label htmlFor="tcpa-dash" className="text-xs text-ghost leading-relaxed cursor-pointer">I confirm I have consent to contact these individuals (TCPA)</label>
                </div>
                {msg && <div className={clsx('flex items-start gap-2 p-3 rounded-lg text-xs', msg.type === 'error' ? 'bg-coral/10 border border-coral/20 text-coral' : 'bg-lime/10 border border-lime/20 text-lime')}><X size={12} className="mt-0.5 flex-shrink-0" />{msg.text}</div>}
                {!bulkRunning ? (
                  <Button onClick={startBulk} disabled={!hasKey || pending === 0 || !tcpa || agents.length === 0} className="w-full" size="md"><Play size={14} /> Start ({pending} calls)</Button>
                ) : bulkPaused ? (
                  <Button onClick={() => { pausedRef.current = false; setBulkPaused(false) }} className="w-full" size="md"><Play size={14} /> Resume</Button>
                ) : (
                  <Button onClick={() => { pausedRef.current = true; setBulkPaused(true) }} variant="secondary" className="w-full" size="md"><Pause size={14} /> Pause</Button>
                )}
                <button onClick={() => fileInputRef.current?.click()} className="w-full text-xs font-mono text-subtle hover:text-lime transition-colors text-center">Upload different file</button>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.tsv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

// ── Inbound Lines Panel ────────────────────────────────────
function InboundPanel({ phoneNumbers, agents }) {
  if (!phoneNumbers.length) return null
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center">
            <PhoneIncoming size={15} className="text-violet" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm text-cream">Inbound Lines</h3>
            <p className="text-xs text-subtle">{phoneNumbers.length} active number{phoneNumbers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <a href="/dashboard/inbound" className="text-xs font-mono text-lime hover:text-lime-dim transition-colors">
          Manage
        </a>
      </div>
      <div className="space-y-2">
        {phoneNumbers.map(n => {
          const assigned = agents.find(a => a.agent_id === n.agent_id)
          return (
            <div key={n.phone_number_id} className="flex items-center justify-between p-3 rounded-xl bg-panel border border-border">
              <div>
                <p className="text-sm font-mono text-cream">{n.phone_number}</p>
                <p className="text-xs text-subtle mt-0.5">{assigned ? assigned.name : 'No agent assigned'}</p>
              </div>
              {assigned ? (
                <span className="flex items-center gap-1.5 text-xs font-mono text-lime">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime status-pulse" />
                  Live
                </span>
              ) : (
                <a href="/dashboard/inbound" className="text-xs font-mono text-subtle hover:text-lime transition-colors">Assign</a>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Main Dashboard ─────────────────────────────────────────
export default function Dashboard() {
  const [settings, setSettings] = useState(storage.getSettings())
  const el = useElevenLabs()
  const hasKey = true

  const [agents, setAgents] = useState([])
  const [phoneNumbers, setPhoneNumbers] = useState([])
  const [calls, setCalls] = useState(storage.getCalls())
  const [loading, setLoading] = useState(false)
  const [calling, setCalling] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  // Re-read settings from localStorage whenever window gains focus
  // (covers the case where the user saves the key in another tab or the Settings page)
  useEffect(() => {
    const onFocus = () => setSettings(storage.getSettings())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  useEffect(() => {
    if (hasKey) load()

    const interval = setInterval(() => {
      // Auto-expire calls stuck in calling/initiated for more than 10 minutes
      const calls = storage.getCalls()
      const now = Date.now()
      let changed = false
      calls.forEach(c => {
        if ((c.status === 'calling' || c.status === 'initiated') &&
            now - new Date(c.timestamp).getTime() > 2 * 60 * 1000) {
          storage.updateCall(c.id, { status: 'completed' })
          changed = true
        }
      })
      setCalls(storage.getCalls())
    }, 5000)

    return () => clearInterval(interval)
  }, [hasKey, settings.elevenLabsKey])

  const load = async () => {
    setLoading(true)
    try {
      const cachedA = getCached('agents'); const cachedN = getCached('phoneNumbers')
      if (cachedA && cachedN) { setAgents(cachedA); setPhoneNumbers(cachedN); setLoading(false); return }
      const [a, n] = await Promise.all([el.getAgents(), el.getPhoneNumbers()])
      setCached('agents', a, 60000); setCached('phoneNumbers', n, 60000)
      setAgents(a); setPhoneNumbers(n)
    } catch (e) { console.error('Failed to load:', e.message) }
    finally { setLoading(false) }
  }

  const handleWsEvent = useCallback((event, data) => {
    if (event === 'call.completed') {
      const existing = storage.getCalls().find(call =>
        (call.status === 'calling' || call.status === 'initiated') &&
        (call.to === data.to || call.conversationId === data.conversationId)
      )
      if (existing) {
        storage.updateCall(existing.id, { status: 'completed', duration: data.duration, conversationId: data.conversationId })
      } else {
        storage.addCall({ to: data.to, from: data.from, agentId: data.agentId, agentName: data.agentName || 'Agent', status: 'completed', direction: data.direction || 'outbound', duration: data.duration, conversationId: data.conversationId })
      }
      setCalls(storage.getCalls())
    }
  }, [])

  const { connected } = useCallEvents(handleWsEvent)
  useEffect(() => setWsConnected(connected), [connected])

  const handleCall = async ({ toNumber, agentId, fromId }) => {
    setCalling(true)
    const digits = toNumber.replace(/\D/g, '')
    const e164 = digits.startsWith('1') ? `+${digits}` : `+1${digits}`

    // Debug -- visible in browser console (Cmd+Option+J)
    console.log('[Speekeasy] Initiating call:', { agentId, toNumber: e164, fromNumberId: fromId })
    console.log('[Speekeasy] Available phone numbers:', phoneNumbers)

    const agentName = agents.find(a => a.agent_id === agentId)?.name || 'Agent'
    const call = storage.addCall({ to: toNumber, agentId, agentName, fromId, status: 'initiated', direction: 'outbound' })
    setCalls(storage.getCalls())
    try {
      await el.initiateOutboundCall({ agentId, toNumber: e164, fromNumberId: fromId })
      storage.updateCall(call.id, { status: 'calling' })
      setCalls(storage.getCalls())
      return { ok: true }
    } catch (e) {
      console.error('[Speekeasy] Call failed:', e.message)
      storage.updateCall(call.id, { status: 'failed', error: e.message })
      setCalls(storage.getCalls())
      return { ok: false, error: e.message }
    } finally {
      setCalling(false)
    }
  }

  const today = calls.filter(c => new Date(c.timestamp).toDateString() === new Date().toDateString())
  const liveCalls = calls.filter(c => c.status === 'calling' || c.status === 'initiated')
  const connectRate = today.length > 0
    ? Math.round((today.filter(c => c.status !== 'failed').length / today.length) * 100)
    : 0

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="flex-1 overflow-auto">

        {/* Header */}
        <div className="sticky top-0 bg-ink/90 backdrop-blur-xl border-b border-border px-8 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-xl text-cream">Command Center</h1>
              <p className="text-xs text-subtle font-mono mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {liveCalls.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-lime/10 border border-lime/20 rounded-lg">
                  <Waveform active />
                  <span className="text-xs font-mono text-lime">{liveCalls.length} live</span>
                </div>
              )}
              <div className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono',
                wsConnected ? 'bg-lime/10 border-lime/20 text-lime' : 'bg-muted border-border text-subtle'
              )}>
                <span className={clsx('w-1.5 h-1.5 rounded-full', wsConnected ? 'bg-lime status-pulse' : 'bg-subtle')} />
                {wsConnected ? 'Live sync' : 'Backend offline'}
              </div>
              {loading && <Spinner size={16} />}
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6 max-w-7xl">

          {/* Setup banner */}
          {!hasKey && (
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-lime/5 border border-lime/20">
              <div className="w-10 h-10 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center flex-shrink-0">
                <Zap size={18} className="text-lime" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-cream">Connect your ElevenLabs account to get started</p>
                <p className="text-xs text-ghost mt-0.5">Add your API key in Settings, create an agent, and you are ready to call.</p>
              </div>
              <a href="/dashboard/settings">
                <Button size="sm">Go to Settings</Button>
              </a>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Calls today" value={today.length} icon={Phone} accent="lime"
              sub={`${today.filter(c => c.direction === 'inbound').length} inbound / ${today.filter(c => c.direction !== 'inbound').length} outbound`}
            />
            <StatCard
              label="Completed" value={today.filter(c => c.status === 'completed').length}
              icon={CheckCircle} accent="violet"
            />
            <StatCard
              label="Connect rate" value={`${connectRate}%`}
              icon={TrendingUp} accent={connectRate >= 60 ? 'lime' : connectRate >= 30 ? 'ghost' : 'coral'}
            />
            <StatCard
              label="Agents" value={agents.length} icon={Bot} accent="ghost"
              sub={`${phoneNumbers.length} phone number${phoneNumbers.length !== 1 ? 's' : ''} linked`}
            />
          </div>

          {/* Live calls banner */}
          {liveCalls.length > 0 && (
            <div className="p-5 rounded-2xl border border-lime/20 bg-lime/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime status-pulse" />
                  <h2 className="font-display font-semibold text-sm text-cream">
                    {liveCalls.length} Active Call{liveCalls.length !== 1 ? 's' : ''}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    const calls = storage.getCalls()
                    calls.forEach(c => {
                      if (c.status === 'calling' || c.status === 'initiated') {
                        storage.updateCall(c.id, { status: 'completed' })
                      }
                    })
                    setCalls(storage.getCalls())
                  }}
                  className="text-xs font-mono text-subtle hover:text-coral transition-colors border border-border px-3 py-1.5 rounded-lg hover:border-coral/30 hover:bg-coral/5"
                >
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {liveCalls.map(call => (
                  <div key={call.id} className="flex items-center gap-3 p-3 rounded-xl bg-ink/60 border border-lime/10">
                    <Waveform active />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-cream truncate">{call.to || call.from || 'Unknown'}</p>
                      <p className="text-xs text-subtle">{call.agentName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={clsx('text-xs font-mono flex-shrink-0',
                        call.direction === 'inbound' ? 'text-violet' : 'text-lime'
                      )}>
                        {call.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                      </span>
                      <button
                        onClick={() => {
                          storage.updateCall(call.id, { status: 'completed' })
                          setCalls(storage.getCalls())
                        }}
                        className="text-subtle hover:text-coral transition-colors ml-1"
                        title="Mark as ended"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left col */}
            <div className="space-y-4">
              <QuickDial
                agents={agents} phoneNumbers={phoneNumbers}
                onCall={handleCall} calling={calling} hasKey={hasKey}
              />
              <InboundPanel phoneNumbers={phoneNumbers} agents={agents} />
            </div>

            {/* Right col - Activity feed */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <Card className="p-0 flex-1">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-lime" />
                    <h3 className="font-display font-semibold text-sm text-cream">Activity Feed</h3>
                    <span className="text-xs font-mono text-subtle bg-muted border border-border px-2 py-0.5 rounded-full ml-1">
                      {calls.length}
                    </span>
                  </div>
                  <a href="/dashboard/history" className="text-xs font-mono text-lime hover:text-lime-dim transition-colors">
                    Full history
                  </a>
                </div>

                {calls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <Phone size={22} className="text-subtle" />
                    </div>
                    <p className="text-sm text-ghost font-medium">No calls yet</p>
                    <p className="text-xs text-subtle mt-1 max-w-xs leading-relaxed">
                      Use Quick Dial on the left to make your first outbound call, or set up inbound routing to receive calls.
                    </p>
                  </div>
                ) : (
                  <div className="px-5 max-h-[560px] overflow-y-auto">
                    {calls.slice(0, 30).map(call => (
                      <FeedItem key={call.id} call={call} />
                    ))}
                  </div>
                )}
              </Card>

              {/* Backend hint */}
              {!wsConnected && (
                <div className="p-4 rounded-xl border border-border bg-panel flex items-start gap-3">
                  <Activity size={14} className="text-subtle flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-cream mb-1">Enable live monitoring</p>
                    <p className="text-xs text-ghost leading-relaxed mb-2">
                      Start the backend server in a second terminal for real-time call events, transcripts, and sentiment.
                    </p>
                    <code className="block text-xs font-mono text-lime bg-ink border border-border rounded-lg px-3 py-2">
                      node server.js
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
