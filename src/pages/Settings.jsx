import React, { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { Button, Input, Card } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { useElevenLabs } from '../lib/elevenlabs'
import { storage } from '../lib/storage'
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
  const { user, updateUser } = useAuth()
  const [settings, setSettings] = useState(storage.getSettings())

  // ElevenLabs key
  const [elKey, setElKey] = useState(settings.elevenLabsKey || '')
  const [showKey, setShowKey] = useState(false)
  const [validating, setValidating] = useState(false)
  const [keyStatus, setKeyStatus] = useState(settings.elevenLabsKey ? 'saved' : null)

  // Account form
  const [name, setName] = useState(user?.name || '')
  const [savingAccount, setSavingAccount] = useState(false)
  const [accountSaved, setAccountSaved] = useState(false)

  // Notifications
  const [notifs, setNotifs] = useState(settings.notifications || {
    callCompleted: true,
    callFailed: true,
    weeklyReport: false,
  })

  const el = useElevenLabs(elKey)

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
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 bg-ink/80 backdrop-blur-xl border-b border-border px-8 py-4 z-10">
          <h1 className="font-display font-bold text-xl text-cream">Settings</h1>
          <p className="text-xs text-subtle font-mono mt-0.5">Manage your workspace configuration</p>
        </div>

        <div className="p-8 max-w-2xl">

          {/* ElevenLabs API */}
          <Section
            title="Voice AI API"
            desc="Connect your voice AI account to enable agents and outbound calls."
            icon={Key}
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-ghost uppercase tracking-widest">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk_..."
                    value={elKey}
                    onChange={e => { setElKey(e.target.value); setKeyStatus(null) }}
                    className="input-base w-full px-4 py-3 rounded-lg text-sm font-mono pr-24"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKey(s => !s)}
                      className="p-1.5 text-subtle hover:text-ghost transition-colors"
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    {elKey && (
                      <button
                        type="button"
                        onClick={removeKey}
                        className="p-1.5 text-subtle hover:text-coral transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Key status */}
                {keyStatus === 'valid' && (
                  <div className="flex items-center gap-1.5 text-xs text-lime">
                    <Check size={12} /> Key validated and saved
                  </div>
                )}
                {keyStatus === 'saved' && (
                  <div className="flex items-center gap-1.5 text-xs text-lime">
                    <Check size={12} /> API key configured
                  </div>
                )}
                {keyStatus === 'invalid' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-1.5 text-xs text-coral">
                      <X size={12} className="mt-0.5 flex-shrink-0" />
                      <span>Validation failed: {keyError || 'Could not reach the voice API'}. This may be a browser CORS issue.</span>
                    </div>
                    <button
                      onClick={saveKeyAnyway}
                      className="text-xs text-lime hover:text-lime-dim underline text-left font-mono"
                    >
                      Save key anyway and test by creating an agent →
                    </button>
                  </div>
                )}
                {keyStatus === 'empty' && (
                  <div className="flex items-center gap-1.5 text-xs text-coral">
                    <AlertCircle size={12} /> Please enter your API key
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={validateAndSaveKey} loading={validating} size="sm">
                  <Check size={13} /> Validate & save
                </Button>
                <a
                  href="https://elevenlabs.io/app/settings/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-lime hover:text-lime-dim transition-colors font-mono"
                >
                  Get API key <ExternalLink size={11} />
                </a>
              </div>

              <div className="p-4 bg-panel rounded-xl border border-border">
                <p className="text-xs font-mono text-ghost uppercase tracking-widest mb-3">Setup checklist</p>
                <ul className="space-y-2.5">
                  {[
                    { done: !!settings.elevenLabsKey, label: 'Voice AI API key connected' },
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
                Speekeasy uses conversational AI + Twilio to make outbound calls. You'll need to: (1) create a voice AI account, (2) purchase a phone number, and (3) link your Twilio account. Then paste your API key above and you're ready to go.
                {' '}<a href="https://elevenlabs.io/docs/conversational-ai/phone-calls/twilio" target="_blank" rel="noreferrer" className="text-violet hover:text-cream underline">Read the docs →</a>
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
                value={user?.email || ''}
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
                  { label: 'Post-call webhook', url: 'http://localhost:3001/webhooks/elevenlabs' },
                  { label: 'Twilio status callback', url: 'http://localhost:3001/webhooks/twilio/status' },
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
      </main>
    </div>
  )
}
