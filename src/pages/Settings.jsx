import React, { useState, useEffect } from 'react'
import DashLayout from '../components/DashLayout'
import { Button, Input, Card } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { useElevenLabs } from '../lib/elevenlabs'
import { storage } from '../lib/storage'
import { useSEO } from '../hooks/useSEO'
import { Key, User, Bell, Shield, Check, X, Eye, EyeOff, ExternalLink, AlertCircle, Webhook, Copy } from 'lucide-react'
import { clsx } from 'clsx'

function Section({ title, desc, icon: Icon, children }) {
  return (
    <Card className="mb-5">
      <div className="flex items-start gap-4 mb-6 pb-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-lime" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-base text-cream">{title}</h2>
          {desc && <p className="text-sm text-ghost mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </Card>
  )
}

export default function Settings() {
  useSEO({ title: "Settings", description: "Manage your Speekeasy workspace settings.", noIndex: true })

  const { user, updateUser, userName, userEmail } = useAuth()
  const [settings, setSettings] = useState(storage.getSettings())

  // ElevenLabs key
  const [elKey, setElKey] = useState(settings.elevenLabsKey || '')
  const [showKey, setShowKey] = useState(false)
  const [validating, setValidating] = useState(false)
  const [keyStatus, setKeyStatus] = useState(settings.elevenLabsKey ? 'saved' : null)

  // Account form
  const [name, setName] = useState(userName || '')
  const [savingAccount, setSavingAccount] = useState(false)
  const [accountSaved, setAccountSaved] = useState(false)

  // Notifications
  const [notifs, setNotifs] = useState(settings.notifications || {
    callCompleted: true,
    callFailed: true,
    weeklyReport: false,
  })

  const el = useElevenLabs()

  const [keyError, setKeyError] = useState('')

  const validateAndSaveKey = async () => {
    if (!elKey.trim()) { setKeyStatus('empty'); return }
    setValidating(true)
    setKeyStatus(null)
    setKeyError('')
    try {
      const result = await el.validateKey()
      if (result.valid) {
        saveKey()
        setKeyStatus('valid')
      } else {
        setKeyError(result.error || 'Invalid key')
        setKeyStatus('invalid')
      }
    } catch (e) {
      setKeyError(e.message)
      setKeyStatus('invalid')
    } finally {
      setValidating(false)
    }
  }

  const saveKey = () => {
    const updated = { ...settings, elevenLabsKey: elKey.trim() }
    storage.saveSettings(updated)
    setSettings(updated)
  }

  const saveKeyAnyway = () => {
    saveKey()
    setKeyStatus('valid')
    setKeyError('')
  }

  const removeKey = () => {
    const updated = { ...settings, elevenLabsKey: '' }
    storage.saveSettings(updated)
    setSettings(updated)
    setElKey('')
    setKeyStatus(null)
  }

  const saveAccount = async () => {
    setSavingAccount(true)
    await new Promise(r => setTimeout(r, 500))
    updateUser({ name })
    setSavingAccount(false)
    setAccountSaved(true)
    setTimeout(() => setAccountSaved(false), 3000)
  }

  const saveNotifs = (key, val) => {
    const updated = { ...notifs, [key]: val }
    setNotifs(updated)
    const s = { ...settings, notifications: updated }
    storage.saveSettings(s)
    setSettings(s)
  }

  const maskedKey = elKey
    ? elKey.slice(0, 8) + '•'.repeat(Math.max(0, elKey.length - 12)) + elKey.slice(-4)
    : ''

  return (
    <DashLayout>
        <div className="sticky top-0 bg-ink/80 backdrop-blur-xl border-b border-border px-8 py-4 z-10">
          <h1 className="font-display font-bold text-xl text-cream">Settings</h1>
          <p className="text-xs text-subtle font-mono mt-0.5">Manage your workspace configuration</p>
        </div>

        <div className="p-8 max-w-2xl">

          {/* Voice AI API */}
          <Section
            title="Voice AI API"
            desc="API credentials are configured server-side for security."
            icon={Key}
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-lime/5 border border-lime/20">
                <Check size={15} className="text-lime flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-cream font-medium">API key is configured server-side</p>
                  <p className="text-xs text-ghost mt-1 leading-relaxed">
                    For security, your Voice AI API key is stored as a server environment variable
                    (<code className="font-mono text-lime">ELEVENLABS_API_KEY</code>) and never exposed to the browser.
                    To update it, edit your <code className="font-mono text-lime">.env</code> file and restart the server.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-panel rounded-xl border border-border">
                <p className="text-xs font-mono text-ghost uppercase tracking-widest mb-3">Setup checklist</p>
                <ul className="space-y-2.5">
                  {[
                    { done: true, label: 'Voice AI API key configured (server-side)' },
                    { done: false, label: 'Phone number purchased and linked' },
                    { done: false, label: 'Twilio account linked (for outbound calling)' },
                    { done: false, label: 'First AI agent created' },
                  ].map(({ done, label }) => (
                    <li key={label} className="flex items-center gap-2.5 text-sm">
                      <div className={clsx('w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border',
                        done ? 'bg-lime/20 border-lime/40' : 'border-border bg-muted'
                      )}>
                        {done && <Check size={9} className="text-lime" />}
                      </div>
                      <span className={done ? 'text-ghost' : 'text-subtle'}>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-violet/5 border border-violet/20 rounded-xl text-xs text-ghost leading-relaxed">
                <p className="font-semibold text-cream mb-1">How outbound calling works</p>
                Speekeasy uses conversational AI + Twilio to make outbound calls. You need to: (1) add ELEVENLABS_API_KEY to your .env, (2) purchase a phone number, and (3) link your Twilio account.{' '}
                <a href="https://elevenlabs.io/docs/conversational-ai/phone-calls/twilio" target="_blank" rel="noreferrer" className="text-violet hover:text-cream underline">Read the docs</a>
              </div>
            </div>
          </Section>

          {/* Account */}
          <Section
            title="Account"
            desc="Update your profile information."
            icon={User}
          >
            <div className="space-y-4">
              <Input
                label="Display name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
              />
              <Input
                label="Email"
                value={userEmail || user?.email || ''}
                disabled
                hint="Email cannot be changed after registration."
              />
              <div className="flex items-center gap-3">
                <Button onClick={saveAccount} loading={savingAccount} size="sm">
                  {accountSaved ? <><Check size={13} /> Saved</> : 'Save changes'}
                </Button>
                {accountSaved && <span className="text-xs text-lime font-mono">Changes saved!</span>}
              </div>
            </div>
          </Section>

          {/* Notifications */}
          <Section
            title="Notifications"
            desc="Choose what events you'd like to be notified about."
            icon={Bell}
          >
            <div className="space-y-4">
              {[
                { key: 'callCompleted', label: 'Call completed', desc: 'Get notified when an outbound call finishes.' },
                { key: 'callFailed', label: 'Call failed', desc: 'Alert when a call cannot connect.' },
                { key: 'weeklyReport', label: 'Weekly report', desc: 'Summary of calls, connect rates, and outcomes every Monday.' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between gap-4 py-2">
                  <div>
                    <p className="text-sm text-cream font-medium">{label}</p>
                    <p className="text-xs text-ghost mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => saveNotifs(key, !notifs[key])}
                    className={clsx(
                      'relative w-10 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5',
                      notifs[key] ? 'bg-lime' : 'bg-muted border border-border'
                    )}
                  >
                    <span className={clsx(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                      notifs[key] ? 'left-5' : 'left-0.5'
                    )} />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* Webhooks */}
          <Section
            title="Webhooks"
            desc="Receive real-time call events in your backend."
            icon={Webhook}
          >
            <div className="space-y-4">
              <div className="p-4 bg-panel rounded-xl border border-border space-y-3">
                <p className="text-xs font-mono text-ghost uppercase tracking-widest">Your webhook URLs</p>
                {[
                  { label: 'Post-call webhook', url: `${window.location.origin}/webhooks/elevenlabs` },
                  { label: 'Twilio status callback', url: `${window.location.origin}/webhooks/twilio/status` },
                ].map(({ label, url }) => (
                  <div key={label}>
                    <p className="text-xs text-subtle mb-1.5">{label}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono text-lime bg-ink border border-border rounded-lg px-3 py-2 overflow-x-auto">
                        {url}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(url)}
                        className="p-2 text-subtle hover:text-cream hover:bg-muted rounded-lg transition-all flex-shrink-0"
                        title="Copy"
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-violet/5 border border-violet/20 rounded-xl text-xs text-ghost leading-relaxed space-y-2">
                <p className="font-semibold text-cream">Making webhooks public</p>
                <p>In development, use <a href="https://ngrok.com" target="_blank" rel="noreferrer" className="text-violet underline">ngrok</a> to expose your local backend:</p>
                <code className="block bg-ink border border-border rounded-lg px-3 py-2 text-lime font-mono">
                  ngrok http 3001
                </code>
                <p>Copy the <span className="text-cream">https://xxxx.ngrok.io</span> URL and paste it into:</p>
                <ul className="list-disc list-inside space-y-1 text-subtle">
                  <li>Voice AI dashboard: <span className="text-cream">Conversational AI &rarr; Agents &rarr; [agent] &rarr; Webhooks</span></li>
                  <li>Twilio console: <span className="text-cream">Phone Numbers &rarr; [number] &rarr; Voice &rarr; Status callback</span></li>
                </ul>
              </div>

              <div className="flex gap-2">
                <a href="https://ngrok.com/download" target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm">
                    <ExternalLink size={12} /> Download ngrok
                  </Button>
                </a>
                <a href="https://elevenlabs.io/docs/conversational-ai/guides/custom-llm/webhook" target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm">
                    <ExternalLink size={12} /> Webhook docs
                  </Button>
                </a>
              </div>
            </div>
          </Section>

          {/* Danger zone */}
          <Section
            title="Danger Zone"
            desc="Destructive actions that cannot be undone."
            icon={Shield}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl border border-coral/20 bg-coral/5">
                <div>
                  <p className="text-sm text-cream font-medium">Clear call history</p>
                  <p className="text-xs text-ghost mt-0.5">Permanently delete all call logs.</p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('Delete all call history?')) {
                      storage.saveCalls([])
                    }
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </Section>
        </div>
    </DashLayout>
  )
}
