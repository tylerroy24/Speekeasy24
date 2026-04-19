import React, { useState, useCallback, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { Card, Badge, Waveform } from '../components/UI'
import { useCallEvents } from '../hooks/useCallEvents'
import { storage } from '../lib/storage'
import { useSEO } from '../hooks/useSEO'
import {
  Activity, PhoneCall, PhoneIncoming, PhoneOff, Clock,
  Wifi, WifiOff, MessageSquare, ChevronDown, ChevronUp,
} from 'lucide-react'
import { clsx } from 'clsx'

function fmtDuration(secs) {
  if (!secs && secs !== 0) return '--'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function TranscriptLine({ line }) {
  const isAgent = line.role === 'agent'
  return (
    <div className={clsx('flex gap-3 text-sm', isAgent ? '' : 'flex-row-reverse')}>
      <div className={clsx(
        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5',
        isAgent ? 'bg-lime/20 text-lime' : 'bg-muted text-ghost'
      )}>
        {isAgent ? 'A' : 'U'}
      </div>
      <div className={clsx(
        'max-w-xs px-3 py-2 rounded-xl text-xs leading-relaxed',
        isAgent ? 'bg-panel border border-border text-ghost' : 'bg-lime/10 border border-lime/20 text-cream'
      )}>
        {line.message}
      </div>
    </div>
  )
}

function CallCard({ call, onDismiss }) {
  const [expanded, setExpanded] = useState(false)
  const isInbound = call.direction === 'inbound'
  const DirIcon = isInbound ? PhoneIncoming : PhoneCall

  const statusColor = {
    active: 'lime',
    completed: 'violet',
    failed: 'coral',
  }[call.status] || 'ghost'

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-4">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            call.status === 'active' ? 'bg-lime/10 border border-lime/20' : 'bg-muted border border-border'
          )}>
            {call.status === 'active'
              ? <Waveform active />
              : <DirIcon size={16} className={`text-${statusColor}`} />
            }
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-cream">
                {call.to || call.from || 'Unknown'}
              </span>
              <span className={clsx('text-xs font-mono px-2 py-0.5 rounded-full border',
                isInbound
                  ? 'bg-violet/10 text-violet border-violet/20'
                  : 'bg-lime/10 text-lime border-lime/20'
              )}>
                {isInbound ? 'inbound' : 'outbound'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-subtle">{call.agentName || 'Unknown agent'}</span>
              {call.duration != null && (
                <span className="text-xs font-mono text-ghost">{fmtDuration(call.duration)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {call.status === 'active' && (
            <span className="flex items-center gap-1.5 text-xs text-lime font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-lime status-pulse" />
              Live
            </span>
          )}
          <Badge variant={statusColor === 'lime' ? 'lime' : statusColor === 'violet' ? 'violet' : statusColor === 'coral' ? 'coral' : 'default'}>
            {call.status}
          </Badge>
          {call.transcript?.length > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-subtle hover:text-cream transition-colors"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          {call.status !== 'active' && (
            <button
              onClick={() => onDismiss(call.id)}
              className="text-subtle hover:text-coral transition-colors text-xs font-mono"
            >
              dismiss
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      {call.summary && (
        <div className="px-5 pb-3">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-panel border border-border">
            <MessageSquare size={12} className="text-subtle flex-shrink-0 mt-0.5" />
            <p className="text-xs text-ghost leading-relaxed">{call.summary}</p>
          </div>
        </div>
      )}

      {/* Transcript */}
      {expanded && call.transcript?.length > 0 && (
        <div className="px-5 pb-4 border-t border-border pt-4">
          <p className="text-xs font-mono text-subtle uppercase tracking-widest mb-3">Transcript</p>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {call.transcript.map((line, i) => (
              <TranscriptLine key={i} line={line} />
            ))}
          </div>
        </div>
      )}

      {/* Sentiment / outcome row */}
      {call.status === 'completed' && (call.sentiment || call.successEval != null) && (
        <div className="px-5 pb-4 flex items-center gap-4">
          {call.sentiment && (
            <span className="text-xs text-ghost">
              Sentiment:{' '}
              <span className={clsx('font-medium',
                call.sentiment === 'positive' ? 'text-lime' :
                call.sentiment === 'negative' ? 'text-coral' : 'text-ghost'
              )}>
                {call.sentiment}
              </span>
            </span>
          )}
          {call.successEval != null && (
            <span className="text-xs text-ghost">
              Outcome:{' '}
              <span className={call.successEval ? 'text-lime font-medium' : 'text-coral font-medium'}>
                {call.successEval ? 'Successful' : 'Unsuccessful'}
              </span>
            </span>
          )}
        </div>
      )}
    </Card>
  )
}

export default function Monitor() {
  useSEO({ title: "Live Monitor", description: "Monitor active calls and view real-time call events.", noIndex: true })

  const [calls, setCalls] = useState([])
  const [eventLog, setEventLog] = useState([])

  const handleEvent = useCallback((event, data) => {
    setEventLog(log => [{
      event,
      ts: new Date().toLocaleTimeString(),
      summary: data?.to || data?.from || data?.callSid || '',
    }, ...log].slice(0, 20))

    if (event === 'call.completed') {
      // Add to local call list and persist to history
      const call = {
        ...data,
        id: data.conversationId || Date.now(),
        status: 'completed',
      }
      setCalls(prev => {
        const existing = prev.findIndex(c => c.id === call.id)
        if (existing !== -1) {
          const updated = [...prev]
          updated[existing] = call
          return updated
        }
        return [call, ...prev]
      })
      // Persist to local history
      storage.addCall({
        to: data.to,
        from: data.from,
        agentId: data.agentId,
        agentName: data.agentName || 'Agent',
        status: 'completed',
        direction: data.direction || 'outbound',
        duration: data.duration,
        conversationId: data.conversationId,
      })
    }

    if (event === 'twilio.status') {
      setCalls(prev => prev.map(c =>
        c.callSid === data.callSid
          ? { ...c, status: data.status === 'completed' ? 'completed' : data.status === 'failed' ? 'failed' : 'active' }
          : c
      ))
    }
  }, [])

  const { connected } = useCallEvents(handleEvent)

  const dismissCall = (id) => {
    setCalls(prev => prev.filter(c => c.id !== id))
  }

  const activeCalls = calls.filter(c => c.status === 'active')
  const recentCalls = calls.filter(c => c.status !== 'active')

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-ink/80 backdrop-blur-xl border-b border-border px-8 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-xl text-cream flex items-center gap-2">
                <Activity size={18} className="text-lime" />
                Live Monitor
              </h1>
              <p className="text-xs text-subtle font-mono mt-0.5">Real-time call events via WebSocket</p>
            </div>
            <div className="flex items-center gap-3">
              {/* WebSocket status */}
              <div className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono',
                connected
                  ? 'bg-lime/10 border-lime/20 text-lime'
                  : 'bg-coral/10 border-coral/20 text-coral'
              )}>
                {connected
                  ? <><Wifi size={12} /><span className="status-pulse inline-block w-1.5 h-1.5 rounded-full bg-lime" /> Live</>
                  : <><WifiOff size={12} /> Disconnected</>
                }
              </div>
              <div className="text-xs font-mono text-subtle px-3 py-1.5 bg-panel border border-border rounded-lg">
                {activeCalls.length} active · {recentCalls.length} recent
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 max-w-4xl">
          {/* Backend not connected notice */}
          {!connected && (
            <div className="mb-6 p-4 rounded-xl border border-coral/20 bg-coral/5 flex items-start gap-3">
              <WifiOff size={15} className="text-coral flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-cream font-medium">Backend not connected</p>
                <p className="text-xs text-ghost mt-1 leading-relaxed">
                  Start the backend server to receive live call events. In a second terminal, run:
                </p>
                <code className="block mt-2 text-xs font-mono bg-ink border border-border rounded-lg px-3 py-2 text-lime">
                  npm run dev:server
                </code>
                <p className="text-xs text-ghost mt-2">
                  Then expose it publicly with{' '}
                  <a href="https://ngrok.com" target="_blank" rel="noreferrer" className="text-lime hover:underline">ngrok</a>
                  {' '}and set the webhook URL in ElevenLabs.
                </p>
              </div>
            </div>
          )}

          {/* Active calls */}
          {activeCalls.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-lime status-pulse" />
                <h2 className="font-display font-semibold text-base text-cream">Active Calls</h2>
                <span className="font-mono text-xs text-lime bg-lime/10 border border-lime/20 px-2 py-0.5 rounded-full">
                  {activeCalls.length}
                </span>
              </div>
              <div className="space-y-3">
                {activeCalls.map(call => (
                  <CallCard key={call.id} call={call} onDismiss={dismissCall} />
                ))}
              </div>
            </div>
          )}

          {/* Empty active state */}
          {activeCalls.length === 0 && connected && (
            <div className="mb-8">
              <h2 className="font-display font-semibold text-base text-cream mb-4">Active Calls</h2>
              <Card className="flex flex-col items-center py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <PhoneCall size={22} className="text-subtle" />
                </div>
                <p className="text-ghost">No active calls right now</p>
                <p className="text-xs text-subtle mt-1">Active calls will appear here in real time</p>
              </Card>
            </div>
          )}

          {/* Recent completed calls */}
          {recentCalls.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display font-semibold text-base text-cream mb-4">
                Recent -- this session
              </h2>
              <div className="space-y-3">
                {recentCalls.map(call => (
                  <CallCard key={call.id} call={call} onDismiss={dismissCall} />
                ))}
              </div>
            </div>
          )}

          {/* Event log */}
          <div>
            <h2 className="font-display font-semibold text-base text-cream mb-4">Event Log</h2>
            <Card className="p-0">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-mono text-subtle uppercase tracking-widest">WebSocket events</span>
                <span className="text-xs font-mono text-subtle">{eventLog.length} events</span>
              </div>
              {eventLog.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-center">
                  <div>
                    <Clock size={18} className="text-subtle mx-auto mb-2" />
                    <p className="text-xs text-subtle">Waiting for events...</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {eventLog.map((e, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                      <span className="font-mono text-xs text-subtle w-16 flex-shrink-0">{e.ts}</span>
                      <span className={clsx('font-mono text-xs px-2 py-0.5 rounded border',
                        e.event.includes('completed') ? 'text-violet bg-violet/10 border-violet/20' :
                        e.event.includes('failed') ? 'text-coral bg-coral/10 border-coral/20' :
                        'text-lime bg-lime/10 border-lime/20'
                      )}>
                        {e.event}
                      </span>
                      {e.summary && (
                        <span className="font-mono text-xs text-subtle">{e.summary}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
