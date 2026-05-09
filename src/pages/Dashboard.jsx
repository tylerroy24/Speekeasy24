import React, { useState, useEffect, useCallback } from 'react'
import DashLayout from '../components/DashLayout'
import { Button, Card, Badge, Waveform, Spinner } from '../components/UI'
import { useElevenLabs } from '../lib/elevenlabs'
import { storage } from '../lib/storage'
import { useCallEvents } from '../hooks/useCallEvents'
import { useCalls } from '../hooks/useCalls'
import {
  Phone, PhoneCall, PhoneIncoming, PhoneOff, CheckCircle,
  Clock, Activity, Bot, Zap, TrendingUp, X, ArrowUpRight,
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

// ── Quick Dial Panel ───────────────────────────────────────
function QuickDial({ agents, phoneNumbers, onCall, calling, hasKey }) {
  const [toNumber, setToNumber] = useState('')
  const [agentId, setAgentId] = useState('')
  const [fromId, setFromId] = useState('')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (agents.length && !agentId) setAgentId(agents[0].agent_id)
  }, [agents])

  useEffect(() => {
    if (phoneNumbers.length && !fromId) setFromId(phoneNumbers[0].phone_number_id)
  }, [phoneNumbers])

  const handleCall = async () => {
    if (!toNumber) { setMsg({ type: 'error', text: 'Enter a phone number.' }); return }
    if (!agentId) { setMsg({ type: 'error', text: 'Select an agent.' }); return }
    setMsg(null)
    const result = await onCall({ toNumber, agentId, fromId })
    if (result.ok) {
      setMsg({ type: 'success', text: `Calling ${toNumber}...` })
      setToNumber('')
      setTimeout(() => setMsg(null), 4000)
    } else {
      setMsg({ type: 'error', text: result.error })
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center">
          <PhoneCall size={15} className="text-lime" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-sm text-cream">Quick Dial</h3>
          <p className="text-xs text-subtle">Launch an outbound call instantly</p>
        </div>
      </div>

      <div className="space-y-3">
        {agents.length === 0 ? (
          <div className="p-3 rounded-lg bg-muted border border-border text-xs text-subtle">
            No agents yet.{' '}
            <a href="/dashboard/agents" className="text-lime hover:underline">Create one first</a>
          </div>
        ) : (
          <div>
            <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Agent</label>
            <select
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/10 appearance-none"
            >
              {agents.map(a => <option key={a.agent_id} value={a.agent_id}>{a.name}</option>)}
            </select>
          </div>
        )}

        {phoneNumbers.length > 0 && (
          <div>
            <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Caller ID</label>
            <select
              value={fromId}
              onChange={e => setFromId(e.target.value)}
              className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/10 appearance-none"
            >
              {phoneNumbers.map(n => (
                <option key={n.phone_number_id} value={n.phone_number_id}>{n.phone_number}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Phone number</label>
          <input
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={toNumber}
            onChange={e => setToNumber(formatPhone(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && handleCall()}
            className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/10"
          />
        </div>

        {msg && (
          <div className={clsx(
            'flex items-start gap-2 p-3 rounded-lg text-xs',
            msg.type === 'error'
              ? 'bg-coral/10 border border-coral/20 text-coral'
              : 'bg-lime/10 border border-lime/20 text-lime'
          )}>
            {msg.type === 'error'
              ? <X size={12} className="mt-0.5 flex-shrink-0" />
              : <CheckCircle size={12} className="mt-0.5 flex-shrink-0" />
            }
            {msg.text}
          </div>
        )}

        <Button
          onClick={handleCall}
          loading={calling}
          disabled={!hasKey || !toNumber || agents.length === 0}
          className="w-full"
          size="md"
        >
          <PhoneCall size={14} />
          {calling ? 'Dialing...' : 'Call now'}
        </Button>

        {!hasKey && (
          <p className="text-xs text-subtle text-center">
            <a href="/dashboard/settings" className="text-lime hover:underline">Configure API key in Settings</a>
          </p>
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
  const el = useElevenLabs(settings.elevenLabsKey)
  const hasKey = !!settings.elevenLabsKey

  const [agents, setAgents] = useState([])
  const [phoneNumbers, setPhoneNumbers] = useState([])
  const { calls, refresh: refreshCalls, addCall, updateCall } = useCalls()
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

    const interval = setInterval(async () => {
      const currentCalls = await Promise.resolve(storage.getCalls())
      const now = Date.now()
      let changed = false
      for (const c of currentCalls) {
        if ((c.status === 'calling' || c.status === 'initiated') &&
            now - new Date(c.timestamp).getTime() > 10 * 60 * 1000) {
          await Promise.resolve(storage.updateCall(c.id, { status: 'completed' }))
          changed = true
        }
      }
      if (changed) refreshCalls()
    }, 5000)

    return () => clearInterval(interval)
  }, [hasKey, settings.elevenLabsKey])

  const load = async () => {
    setLoading(true)
    try {
      const [a, n] = await Promise.all([el.getAgents(), el.getPhoneNumbers()])
      setAgents(a)
      setPhoneNumbers(n)
    } catch (e) {
      console.error('Failed to load:', e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleWsEvent = useCallback((event, data) => {
    if (event === 'call.completed') {
      addCall({
        to: data.to, from: data.from, agentId: data.agentId,
        agentName: data.agentName || 'Agent', status: 'completed',
        direction: data.direction || 'outbound', duration: data.duration,
        conversationId: data.conversationId,
      })
    }
  }, [addCall])

  const { connected } = useCallEvents(handleWsEvent)
  useEffect(() => setWsConnected(connected), [connected])

  const handleCall = async ({ toNumber, agentId, fromId }) => {
    setCalling(true)
    const digits = toNumber.replace(/\D/g, '')
    const e164 = digits.startsWith('1') ? `+${digits}` : `+1${digits}`

    console.log('[Speekeasy] Initiating call:', { agentId, toNumber: e164, fromNumberId: fromId })
    console.log('[Speekeasy] Available phone numbers:', phoneNumbers)

    const agentName = agents.find(a => a.agent_id === agentId)?.name || 'Agent'
    const call = await addCall({ to: toNumber, agentId, agentName, fromId, status: 'initiated', direction: 'outbound' })
    try {
      await el.initiateOutboundCall({ agentId, toNumber: e164, fromNumberId: fromId })
      await updateCall(call?.id, { status: 'calling' })
      return { ok: true }
    } catch (e) {
      console.error('[Speekeasy] Call failed:', e.message)
      await updateCall(call?.id, { status: 'failed', error: e.message })
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
    <DashLayout>
      
      
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
                  onClick={async () => {
                    const currentCalls = await Promise.resolve(storage.getCalls())
                    for (const c of currentCalls) {
                      if (c.status === 'calling' || c.status === 'initiated') {
                        await updateCall(c.id, { status: 'completed' })
                      }
                    }
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
                        onClick={() => updateCall(call.id, { status: 'completed' })}
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
    </DashLayout>
  )
}
