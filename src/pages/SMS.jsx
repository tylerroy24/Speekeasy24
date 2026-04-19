import React, { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import { Button, Card } from '../components/UI'
import { storage } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { useSEO } from '../hooks/useSEO'
import {
  MessageSquare, Send, Phone, Clock, Check,
  AlertCircle, Plus, Trash2, ChevronDown
} from 'lucide-react'
import { clsx } from 'clsx'

const SMS_KEY = 'speekeasy_sms'

function getSMSHistory() {
  try { return JSON.parse(localStorage.getItem(SMS_KEY) || '[]') }
  catch { return [] }
}

function saveSMS(msg) {
  const history = getSMSHistory()
  history.unshift({ ...msg, id: Date.now(), ts: new Date().toISOString() })
  localStorage.setItem(SMS_KEY, JSON.stringify(history.slice(0, 200)))
}

const TEMPLATES = [
  { name: 'Appointment reminder', body: 'Hi {name}, just a reminder about your appointment tomorrow. Reply STOP to opt out.' },
  { name: 'Follow-up after call', body: 'Hi {name}, thanks for chatting with us today! Let us know if you have any questions.' },
  { name: 'Missed call', body: 'Hi {name}, we tried to reach you. Please call us back at your convenience.' },
  { name: 'Meeting confirmation', body: 'Hi {name}, your meeting is confirmed for {time}. Reply YES to confirm or NO to cancel.' },
]

export default function SMS() {
  useSEO({ title: 'SMS', description: 'Send and manage text messages.', noIndex: true })

  const { user } = useAuth()
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [history, setHistory] = useState(getSMSHistory())
  const [showTemplates, setShowTemplates] = useState(false)
  const textareaRef = useRef(null)

  const charsLeft = 1600 - message.length
  const smsCount = Math.ceil(message.length / 160) || 1

  const send = async () => {
    if (!to.trim() || !message.trim()) { setError('Phone number and message are required.'); return }
    setSending(true)
    setError('')
    setSuccess('')

    try {
      const token = user?.access_token || null
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = 'Bearer ' + token

      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({ to: to.trim(), message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send SMS')

      saveSMS({ to: to.trim(), message: message.trim(), direction: 'outbound', status: 'sent' })
      setHistory(getSMSHistory())
      setSuccess('Message sent successfully!')
      setMessage('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const applyTemplate = (template) => {
    setMessage(template.body)
    setShowTemplates(false)
    textareaRef.current?.focus()
  }

  const clearHistory = () => {
    if (!window.confirm('Clear SMS history?')) return
    localStorage.removeItem(SMS_KEY)
    setHistory([])
  }

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-ink/90 backdrop-blur-xl border-b border-border px-8 py-4 z-10">
          <h1 className="font-display font-bold text-xl text-cream flex items-center gap-2">
            <MessageSquare size={18} className="text-lime" /> SMS
          </h1>
          <p className="text-xs text-subtle font-mono mt-0.5">Send text messages to contacts</p>
        </div>

        <div className="p-8 max-w-5xl">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Compose */}
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <h2 className="font-display font-semibold text-sm text-cream mb-4">Compose message</h2>

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-coral/5 border border-coral/20 text-xs text-coral mb-4">
                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-lime/5 border border-lime/20 text-xs text-lime mb-4">
                    <Check size={13} className="flex-shrink-0 mt-0.5" /> {success}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">To</label>
                    <div className="flex items-center gap-2 bg-ink/80 border border-border rounded-lg px-4 py-2.5 focus-within:border-lime transition-colors">
                      <Phone size={13} className="text-subtle flex-shrink-0" />
                      <input
                        type="tel"
                        value={to}
                        onChange={e => setTo(e.target.value)}
                        placeholder="+1 (404) 555-1234"
                        className="flex-1 bg-transparent text-cream text-sm outline-none placeholder:text-subtle"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-mono text-ghost uppercase tracking-widest">Message</label>
                      <div className="flex items-center gap-3">
                        <span className={clsx('text-xs font-mono', charsLeft < 100 ? 'text-coral' : 'text-subtle')}>
                          {message.length}/1600 · {smsCount} SMS
                        </span>
                        <div className="relative">
                          <button
                            onClick={() => setShowTemplates(s => !s)}
                            className="text-xs font-mono text-lime hover:text-lime-dim flex items-center gap-1 transition-colors"
                          >
                            Templates <ChevronDown size={11} />
                          </button>
                          {showTemplates && (
                            <div className="absolute right-0 top-6 w-64 bg-surface border border-border rounded-xl shadow-xl z-20 overflow-hidden">
                              {TEMPLATES.map(t => (
                                <button
                                  key={t.name}
                                  onClick={() => applyTemplate(t)}
                                  className="w-full text-left px-4 py-3 text-sm text-ghost hover:bg-muted hover:text-cream transition-colors border-b border-border/50 last:border-0"
                                >
                                  {t.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={e => setMessage(e.target.value.slice(0, 1600))}
                      placeholder="Type your message..."
                      rows={6}
                      className="w-full bg-ink/80 border border-border text-cream px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-lime resize-none leading-relaxed transition-colors"
                    />
                    {/* Char progress */}
                    <div className="h-0.5 bg-muted rounded-full overflow-hidden mt-1">
                      <div
                        className={clsx('h-full rounded-full transition-all', charsLeft < 100 ? 'bg-coral' : 'bg-lime/50')}
                        style={{ width: (message.length / 1600 * 100) + '%' }}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={send}
                    loading={sending}
                    disabled={!to.trim() || !message.trim()}
                    className="w-full"
                    size="lg"
                  >
                    <Send size={15} /> Send SMS
                  </Button>

                  <p className="text-xs text-subtle text-center">
                    Messages sent via your Twilio number. Standard carrier rates apply.
                  </p>
                </div>
              </Card>

              {/* Templates info */}
              <Card>
                <h3 className="text-xs font-mono text-ghost uppercase tracking-widest mb-3">Template variables</h3>
                <div className="space-y-2">
                  {[
                    ['{name}', 'Contact name'],
                    ['{time}', 'Appointment time'],
                    ['{date}', 'Date'],
                    ['{phone}', 'Your phone number'],
                  ].map(([tag, desc]) => (
                    <div key={tag} className="flex items-center gap-3 text-sm">
                      <code className="font-mono text-lime text-xs bg-lime/10 px-2 py-0.5 rounded">{tag}</code>
                      <span className="text-ghost">{desc}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* History */}
            <div className="lg:col-span-2">
              <Card className="p-0">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h2 className="font-display font-semibold text-sm text-cream">Recent messages</h2>
                  {history.length > 0 && (
                    <button onClick={clearHistory} className="text-subtle hover:text-coral transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="px-5 py-10 text-center text-subtle text-sm">
                    No messages yet
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto divide-y divide-border/50">
                    {history.map(msg => (
                      <div key={msg.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-mono text-cream">{msg.to}</p>
                          <span className={clsx('text-xs font-mono flex-shrink-0', msg.status === 'sent' ? 'text-lime' : 'text-coral')}>
                            {msg.status}
                          </span>
                        </div>
                        <p className="text-xs text-ghost leading-relaxed line-clamp-2">{msg.message}</p>
                        <p className="text-xs text-subtle font-mono mt-1.5 flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(msg.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
