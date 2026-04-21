import React, { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { Button, Card, Input } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { useSEO } from '../hooks/useSEO'
import {
  Webhook, Plus, Trash2, Check, AlertCircle,
  ExternalLink, RefreshCw, Globe, Zap, ChevronDown
} from 'lucide-react'
import { clsx } from 'clsx'

const CRM_PRESETS = [
  {
    name: 'HubSpot',
    icon: '🟠',
    desc: 'Log calls and update contact records in HubSpot',
    docsUrl: 'https://developers.hubspot.com/docs/api/webhooks',
    defaultEvents: ['call.completed'],
    headerHint: 'Add your HubSpot secret in the Authorization header',
  },
  {
    name: 'Salesforce',
    icon: '🔵',
    desc: 'Sync call outcomes to Salesforce activities',
    docsUrl: 'https://developer.salesforce.com',
    defaultEvents: ['call.completed', 'call.transferred'],
    headerHint: 'Use OAuth bearer token in Authorization header',
  },
  {
    name: 'Slack',
    icon: '💬',
    desc: 'Post call summaries to a Slack channel',
    docsUrl: 'https://api.slack.com/messaging/webhooks',
    defaultEvents: ['call.completed'],
    headerHint: 'Use your Slack Incoming Webhook URL directly',
  },
  {
    name: 'Zapier',
    icon: '⚡',
    desc: 'Trigger any Zap on call events',
    docsUrl: 'https://zapier.com/apps/webhook',
    defaultEvents: ['call.completed'],
    headerHint: 'Paste your Zapier Webhook URL',
  },
  {
    name: 'Custom',
    icon: '🔧',
    desc: 'Send call data to any HTTP endpoint',
    docsUrl: null,
    defaultEvents: ['call.completed'],
    headerHint: 'Add any custom headers your endpoint requires',
  },
]

const ALL_EVENTS = [
  { id: 'call.completed', label: 'Call completed', desc: 'Fired when a call ends with transcript and sentiment' },
  { id: 'call.transferred', label: 'Call transferred', desc: 'Fired when a call is transferred to a human' },
  { id: 'twilio.status', label: 'Call status change', desc: 'Fired on every Twilio status update' },
]

function WebhookCard({ hook, onDelete, onTest }) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hook.headers },
        body: JSON.stringify({
          event: 'test',
          data: { message: 'Test from Speekeasy', ts: new Date().toISOString() },
        }),
      })
      setTestResult({ ok: res.ok, status: res.status })
    } catch (err) {
      setTestResult({ ok: false, error: err.message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-panel hover:border-lime/20 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0 text-lg">
        {hook.icon || '🔧'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-cream">{hook.name}</p>
            <p className="text-xs font-mono text-subtle truncate mt-0.5">{hook.url}</p>
          </div>
          <div className={clsx('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', hook.active ? 'bg-lime' : 'bg-muted')} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {hook.events.map(e => (
            <span key={e} className="text-xs font-mono bg-muted border border-border text-ghost px-2 py-0.5 rounded-lg">{e}</span>
          ))}
        </div>
        {testResult && (
          <div className={clsx('mt-3 text-xs font-mono flex items-center gap-1.5', testResult.ok ? 'text-lime' : 'text-coral')}>
            {testResult.ok ? <Check size={11} /> : <AlertCircle size={11} />}
            {testResult.ok ? 'Test successful (HTTP ' + testResult.status + ')' : 'Test failed: ' + (testResult.error || 'HTTP ' + testResult.status)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleTest}
          disabled={testing}
          className="text-xs font-mono text-subtle hover:text-lime transition-colors border border-border px-3 py-1.5 rounded-lg hover:border-lime/30"
        >
          {testing ? <RefreshCw size={11} className="animate-spin" /> : 'Test'}
        </button>
        <button onClick={() => onDelete(hook.id)} className="text-subtle hover:text-coral transition-colors p-1.5">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

export default function Integrations() {
  useSEO({ title: 'Integrations', description: 'Connect Speekeasy to your CRM and business tools.', noIndex: true })

  const { user } = useAuth()
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [form, setForm] = useState({ name: '', url: '', events: ['call.completed'], headerKey: '', headerValue: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadWebhooks() }, [])

  const getHeaders = () => {
    const token = user?.access_token || null
    const h = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = 'Bearer ' + token
    return h
  }

  const loadWebhooks = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/webhooks', { headers: getHeaders() })
      const data = await res.json()
      setWebhooks(data.webhooks || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const applyPreset = (preset) => {
    setSelectedPreset(preset)
    setForm(f => ({
      ...f,
      name: preset.name,
      events: preset.defaultEvents,
    }))
    setShowForm(true)
  }

  const saveWebhook = async () => {
    if (!form.name || !form.url) { setError('Name and URL are required'); return }
    setSaving(true)
    setError('')
    try {
      const headers = {}
      if (form.headerKey && form.headerValue) headers[form.headerKey] = form.headerValue

      const res = await fetch('/api/crm/webhooks', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: form.name,
          url: form.url,
          events: form.events,
          headers,
          icon: selectedPreset?.icon,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setWebhooks(prev => [...prev, data.webhook])
      setShowForm(false)
      setForm({ name: '', url: '', events: ['call.completed'], headerKey: '', headerValue: '' })
      setSelectedPreset(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteWebhook = async (id) => {
    if (!window.confirm('Remove this webhook?')) return
    try {
      await fetch('/api/crm/webhooks/' + id, { method: 'DELETE', headers: getHeaders() })
      setWebhooks(prev => prev.filter(h => h.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleEvent = (event) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(event)
        ? f.events.filter(e => e !== event)
        : [...f.events, event],
    }))
  }

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 bg-ink/90 backdrop-blur-xl border-b border-border px-8 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-xl text-cream flex items-center gap-2">
                <Zap size={18} className="text-lime" /> Integrations
              </h1>
              <p className="text-xs text-subtle font-mono mt-0.5">Connect Speekeasy to your CRM and business tools</p>
            </div>
            <Button size="sm" onClick={() => { setShowForm(true); setSelectedPreset(null) }}>
              <Plus size={13} /> Add webhook
            </Button>
          </div>
        </div>

        <div className="p-8 max-w-4xl space-y-8">
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-coral/5 border border-coral/20 text-sm text-coral">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Add webhook form */}
          {showForm && (
            <Card>
              <h2 className="font-display font-semibold text-sm text-cream mb-5">
                {selectedPreset ? selectedPreset.name + ' webhook' : 'New webhook'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. HubSpot CRM"
                    className="w-full bg-ink/80 border border-border text-cream px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Webhook URL</label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://hooks.yourcrm.com/..."
                    className="w-full bg-ink/80 border border-border text-cream px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime font-mono"
                  />
                  {selectedPreset?.headerHint && (
                    <p className="text-xs text-subtle mt-1.5">{selectedPreset.headerHint}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-2">Events to send</label>
                  <div className="space-y-2">
                    {ALL_EVENTS.map(ev => (
                      <label key={ev.id} className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={form.events.includes(ev.id)}
                          onChange={() => toggleEvent(ev.id)}
                          className="mt-0.5 accent-lime"
                        />
                        <div>
                          <p className="text-sm text-cream font-mono">{ev.id}</p>
                          <p className="text-xs text-subtle">{ev.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Auth header (optional)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={form.headerKey}
                      onChange={e => setForm(f => ({ ...f, headerKey: e.target.value }))}
                      placeholder="Authorization"
                      className="bg-ink/80 border border-border text-cream px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime font-mono"
                    />
                    <input
                      type="text"
                      value={form.headerValue}
                      onChange={e => setForm(f => ({ ...f, headerValue: e.target.value }))}
                      placeholder="Bearer your-token"
                      className="bg-ink/80 border border-border text-cream px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime font-mono"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={saveWebhook} loading={saving} size="sm">
                    <Check size={13} /> Save webhook
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setShowForm(false); setSelectedPreset(null) }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Quick connect presets */}
          {!showForm && (
            <div>
              <h2 className="text-xs font-mono text-ghost uppercase tracking-widest mb-4">Quick connect</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {CRM_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-panel hover:border-lime/30 hover:bg-muted/20 transition-all text-center group"
                  >
                    <span className="text-2xl">{preset.icon}</span>
                    <span className="text-sm font-medium text-cream">{preset.name}</span>
                    <span className="text-xs text-subtle leading-tight">{preset.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active webhooks */}
          <div>
            <h2 className="text-xs font-mono text-ghost uppercase tracking-widest mb-4">
              Active webhooks {webhooks.length > 0 && '(' + webhooks.length + ')'}
            </h2>
            {loading ? (
              <div className="text-center py-8 text-subtle text-sm">Loading...</div>
            ) : webhooks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Webhook size={28} className="text-border" />
                <p className="text-ghost text-sm">No webhooks configured yet.</p>
                <p className="text-subtle text-xs max-w-sm">Add a webhook above to automatically send call data to your CRM, Slack, or any HTTP endpoint.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map(hook => (
                  <WebhookCard key={hook.id} hook={hook} onDelete={deleteWebhook} />
                ))}
              </div>
            )}
          </div>

          {/* Payload reference */}
          <Card>
            <h2 className="font-display font-semibold text-sm text-cream mb-4 flex items-center gap-2">
              <Globe size={14} className="text-lime" /> Webhook payload reference
            </h2>
            <p className="text-xs text-ghost mb-3">All webhooks receive a JSON POST with this structure:</p>
            <pre className="bg-ink/80 border border-border rounded-xl p-4 text-xs font-mono text-ghost overflow-x-auto leading-relaxed">{`{
  "event": "call.completed",
  "ts": "2026-04-19T14:30:00.000Z",
  "data": {
    "conversationId": "conv_abc123",
    "agentId": "agent_xyz",
    "duration": 142,
    "from": "+14045551234",
    "to": "+16785559876",
    "summary": "Customer asked about pricing...",
    "sentiment": "positive",
    "success": true
  }
}`}</pre>
          </Card>
        </div>
      </main>
    </div>
  )
}
