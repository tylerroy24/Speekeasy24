import React, { useState, useEffect } from 'react'
import DashLayout from '../components/DashLayout'
import { Button, Input, Textarea, Select, Card, Badge, Spinner } from '../components/UI'
import { useElevenLabs } from '../lib/elevenlabs'
import { storage } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { useSEO } from '../hooks/useSEO'
import { Bot, Plus, Trash2, X, Check, AlertCircle, ChevronRight, Mic } from 'lucide-react'
import { clsx } from 'clsx'

const DEFAULT_PROMPT = `You are a friendly and professional sales development representative. Your goal is to qualify leads and book a 15-minute demo call with our sales team.

Be conversational, confident, and empathetic. Listen actively and respond to objections naturally. Always confirm the prospect's interest before attempting to book a meeting.

Keep responses brief and conversational -- this is a phone call, not an essay.`

export default function Agents() {
  useSEO({ title: "AI Agents", description: "Create and manage your AI voice agents.", noIndex: true })

  const [settings] = useState(storage.getSettings())
  const el = useElevenLabs(settings.elevenLabsKey)

  const [agents, setAgents] = useState([])
  const [voices, setVoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    name: '',
    voiceId: '',
    prompt: DEFAULT_PROMPT,
    firstMessage: '',
  })

  const hasKey = true

  useEffect(() => {
    if (hasKey) loadData()
  }, [hasKey])

  const loadData = async () => {
    setLoading(true)
    try {
      const [a, v] = await Promise.all([el.getAgents(), el.getVoices()])
      setAgents(a)
      setVoices(v)
      if (v.length && !form.voiceId) setForm(f => ({ ...f, voiceId: v[0].voice_id }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Agent name is required'); return }
    const existing = agents.find(a => a.name.toLowerCase().trim() === form.name.toLowerCase().trim())
    if (existing) { setError(`An agent named "${form.name}" already exists.`); return }
    setCreating(true)
    setError('')
    try {
      await el.createAgent({
        name: form.name,
        voiceId: form.voiceId,
        prompt: form.prompt,
        firstMessage: form.firstMessage,
      })
      setSuccess(`Agent "${form.name}" created!`)
      setShowForm(false)
      setForm({ name: '', voiceId: voices[0]?.voice_id || '', prompt: DEFAULT_PROMPT, firstMessage: '' })
      await loadData()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (agentId, name) => {
    if (!window.confirm(`Delete agent "${name}"? This cannot be undone.`)) return
    setDeleting(agentId)
    try {
      await el.deleteAgent(agentId)
      setAgents(a => a.filter(ag => ag.agent_id !== agentId))
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <DashLayout>
        <div className="sticky top-0 bg-ink/80 backdrop-blur-xl border-b border-border px-8 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-xl text-cream">AI Agents</h1>
              <p className="text-xs text-subtle font-mono mt-0.5">Create and manage your voice agents</p>
            </div>
            {hasKey && (
              <Button onClick={() => { setShowForm(true); setError('') }} size="md">
                <Plus size={14} /> New agent
              </Button>
            )}
          </div>
        </div>

        <div className="p-8 max-w-4xl">
          {/* No key warning */}
          {!hasKey && (
            <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-coral/5 border border-coral/20">
              <AlertCircle size={16} className="text-coral flex-shrink-0 mt-0.5" />
              <p className="text-sm text-ghost">
                Add your ElevenLabs API key in <a href="/dashboard/settings" className="text-lime hover:underline">Settings</a> to create agents.
              </p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-4 mb-6 rounded-xl bg-lime/10 border border-lime/20 text-lime text-sm">
              <Check size={14} /> {success}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-4 mb-6 rounded-xl bg-coral/10 border border-coral/20 text-coral text-sm">
              <X size={14} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Create form */}
          {showForm && (
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-semibold text-lg text-cream">Create new agent</h2>
                <button onClick={() => setShowForm(false)} className="text-subtle hover:text-ghost transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <Input
                    label="Agent name"
                    placeholder="e.g. Aria · Sales Rep"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono text-ghost uppercase tracking-widest">Voice</label>
                    <select
                      value={form.voiceId}
                      onChange={e => setForm(f => ({ ...f, voiceId: e.target.value }))}
                      className="input-base w-full px-4 py-3 rounded-lg text-sm"
                    >
                      {voices.length === 0 && <option>Loading voices...</option>}
                      {voices.map(v => (
                        <option key={v.voice_id} value={v.voice_id}>{v.name} -- {v.labels?.gender || 'Voice'}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Input
                  label="First message (optional)"
                  placeholder="Hi! This is Aria from Acme. Is this a good time to chat?"
                  value={form.firstMessage}
                  onChange={e => setForm(f => ({ ...f, firstMessage: e.target.value }))}
                  hint="What the agent says when the call connects. Defaults to a generic greeting."
                />
                <Textarea
                  label="System prompt"
                  value={form.prompt}
                  onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                  rows={8}
                  hint="Describe your agent's personality, goals, and how it should handle conversations."
                />
                <div className="flex gap-3">
                  <Button type="submit" loading={creating} disabled={!form.name}>
                    <Bot size={14} /> Create agent
                  </Button>
                  <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </Card>
          )}

          {/* Agents list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size={24} />
            </div>
          ) : agents.length === 0 && hasKey ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Bot size={24} className="text-subtle" />
              </div>
              <p className="text-ghost mb-2">No agents yet</p>
              <p className="text-xs text-subtle mb-6">Create your first AI voice agent to start making calls</p>
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus size={14} /> Create first agent
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map(agent => (
                <div key={agent.agent_id} className="glass-card rounded-xl p-5 flex items-center justify-between hover:border-lime/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center">
                      <Mic size={16} className="text-lime" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-cream">{agent.name}</p>
                      <p className="text-xs font-mono text-subtle mt-0.5">ID: {agent.agent_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="lime">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime status-pulse" />
                      Active
                    </Badge>
                    <button
                      onClick={() => handleDelete(agent.agent_id, agent.name)}
                      disabled={deleting === agent.agent_id}
                      className="p-2 text-subtle hover:text-coral hover:bg-coral/10 rounded-lg transition-all"
                    >
                      {deleting === agent.agent_id ? <Spinner size={14} /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </DashLayout>
  )
}
