import React, { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import { Button, Card, Spinner } from '../components/UI'
import { useElevenLabs } from '../lib/elevenlabs'
import { storage } from '../lib/storage'
import { useSEO } from '../hooks/useSEO'
import { useAuth } from '../context/AuthContext'
import {
  Upload, Phone, PhoneCall, X, Check, AlertCircle,
  Play, Pause, Download, FileSpreadsheet, Trash2,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── SheetJS loader (loaded from CDN at runtime) ───────────────
async function loadXLSX() {
  if (window.XLSX) return window.XLSX
  await new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
  return window.XLSX
}

// ── Parse any file using SheetJS ─────────────────────────────
async function parseAnyFile(file) {
  const XLSX = await loadXLSX()
  const isExcel = /\.(xlsx|xls|xlsm|ods)$/i.test(file.name)

  let rows = []

  if (isExcel) {
    // Read as array buffer for binary Excel files
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  } else {
    // CSV / TSV -- read as text
    const text = await file.text()
    const delim = text.includes('\t') ? '\t' : ','
    rows = text.trim().split(/\r?\n/).map(line =>
      line.split(delim).map(c => c.trim().replace(/^"|"$/g, ''))
    )
  }

  if (!rows.length) return []

  // Detect header row
  const firstRow = rows[0].map(c => String(c).trim())
  const hasHeader = firstRow.some(c => /phone|number|mobile|cell|tel|contact/i.test(c))

  const dataRows = hasHeader ? rows.slice(1) : rows
  const phoneCol = hasHeader
    ? firstRow.findIndex(c => /phone|number|mobile|cell|tel/i.test(c))
    : 0
  const nameCol = hasHeader
    ? firstRow.findIndex(c => /^(first.?name|name|full.?name|contact)$/i.test(c))
    : -1
  const lastNameCol = hasHeader
    ? firstRow.findIndex(c => /last.?name/i.test(c))
    : -1

  const results = []
  dataRows.forEach((cols, i) => {
    if (!cols || !cols.length) return
    const rawPhone = String(cols[phoneCol >= 0 ? phoneCol : 0] || '').trim()
    let name = nameCol >= 0 ? String(cols[nameCol] || '').trim() : ''
    if (lastNameCol >= 0 && cols[lastNameCol]) {
      name = (name + ' ' + String(cols[lastNameCol]).trim()).trim()
    }
    const digits = rawPhone.replace(/\D/g, '')
    if (digits.length >= 10) {
      const e164 = digits.startsWith('1') ? '+' + digits : '+1' + digits
      results.push({ id: Date.now() + i, name, phone: e164, raw: rawPhone, status: 'pending' })
    }
  })
  return results
}

function formatPhone(e164) {
  const d = e164.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('1')) {
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  }
  return e164
}

// ── Contact row ───────────────────────────────────────────────
function ContactRow({ contact, onRemove }) {
  const statusMap = {
    pending:   { label: 'Pending',   color: 'text-subtle',  bg: 'bg-muted',      icon: Phone },
    calling:   { label: 'Calling',   color: 'text-lime',    bg: 'bg-lime/10',    icon: PhoneCall },
    completed: { label: 'Completed', color: 'text-violet',  bg: 'bg-violet/10',  icon: Check },
    failed:    { label: 'Failed',    color: 'text-coral',   bg: 'bg-coral/10',   icon: X },
    skipped:   { label: 'Skipped',   color: 'text-subtle',  bg: 'bg-muted',      icon: X },
  }
  const s = statusMap[contact.status] || statusMap.pending
  const Icon = s.icon

  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
      <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', s.bg)}>
        <Icon size={12} className={s.color} />
      </div>
      <div className="flex-1 min-w-0">
        {contact.name && <p className="text-sm text-cream font-medium truncate">{contact.name}</p>}
        <p className="text-sm font-mono text-ghost">{formatPhone(contact.phone)}</p>
      </div>
      <span className={clsx('text-xs font-mono flex-shrink-0', s.color)}>{s.label}</span>
      {contact.error && (
        <span className="text-xs text-coral truncate max-w-32" title={contact.error}>
          {contact.error.slice(0, 30)}
        </span>
      )}
      {contact.status === 'pending' && (
        <button onClick={() => onRemove(contact.id)} className="text-subtle hover:text-coral transition-colors flex-shrink-0">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function BulkCall() {
  useSEO({ title: "Bulk Caller", description: "Upload a contact list and launch an AI calling campaign.", noIndex: true })

  const { user } = useAuth()
  const token = user?.access_token || null
  const el = useElevenLabs(settings.elevenLabsKey)
  const hasKey = true

  const [agents, setAgents] = useState([])
  const [phoneNumbers, setPhoneNumbers] = useState([])
  const [agentId, setAgentId] = useState('')
  const [fromId, setFromId] = useState('')

  const [contacts, setContacts] = useState([])
  const [fileName, setFileName] = useState('')
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [delayMs, setDelayMs] = useState(3000)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [tcpaConsent, setTcpaConsent] = useState(false)

  const pausedRef = useRef(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (hasKey) load()
  }, [hasKey])

  const load = async () => {
    try {
      const [a, n] = await Promise.all([el.getAgents(), el.getPhoneNumbers()])
      setAgents(a)
      setPhoneNumbers(n)
      if (a.length) setAgentId(a[0].agent_id)
      if (n.length) setFromId(n[0].phone_number_id)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setContacts([])

    // FIX #7: File size limit (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    // Validate file type by extension
    const validExts = /\.(xlsx|xls|xlsm|ods|csv|tsv|txt)$/i
    if (!validExts.test(file.name)) {
      setError('Unsupported file type. Please upload an Excel (.xlsx, .xls) or CSV file.')
      return
    }

    setFileName(file.name)

    // Show loading state for large files
    const isExcel = /\.(xlsx|xls|xlsm|ods)$/i.test(file.name)

    try {
      const parsed = await parseAnyFile(file)
      if (parsed.length === 0) {
        setError('No valid phone numbers found. Make sure the file has a column with phone numbers (header: Phone, Mobile, Cell, Number, or Tel).')
        return
      }
      setContacts(parsed)
    } catch (err) {
      setError('Could not parse file: ' + err.message + (isExcel ? '. Try saving as CSV from Excel.' : ''))
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const removeContact = (id) => {
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const updateContact = (id, updates) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const stats = {
    total: contacts.length,
    pending: contacts.filter(c => c.status === 'pending').length,
    calling: contacts.filter(c => c.status === 'calling').length,
    completed: contacts.filter(c => c.status === 'completed').length,
    failed: contacts.filter(c => c.status === 'failed').length,
  }

  const startCampaign = async () => {
    if (!agentId) { setError('Please select an agent.'); return }
    if (!fromId) { setError('Please select a caller ID.'); return }
    if (contacts.filter(c => c.status === 'pending').length === 0) {
      setError('No pending contacts to call.')
      return
    }
    // FIX #14: Require TCPA consent before launching campaign
    if (!tcpaConsent) {
      setError('Please confirm you have obtained consent to contact these individuals before starting the campaign.')
      return
    }

    setRunning(true)
    setPaused(false)
    pausedRef.current = false
    setError('')

    const pending = contacts.filter(c => c.status === 'pending')

    for (const contact of pending) {
      // Check if paused
      while (pausedRef.current) {
        await new Promise(r => setTimeout(r, 500))
      }

      updateContact(contact.id, { status: 'calling' })

      try {
        await el.initiateOutboundCall({
          agentId,
          toNumber: contact.phone,
          fromNumberId: fromId,
        })

        storage.addCall({
          to: contact.phone,
          agentId,
          agentName: agents.find(a => a.agent_id === agentId)?.name || 'Agent',
          status: 'calling',
          direction: 'outbound',
          contactName: contact.name,
        })

        updateContact(contact.id, { status: 'completed' })
      } catch (e) {
        updateContact(contact.id, { status: 'failed', error: e.message })
      }

      // Delay between calls
      if (delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs))
      }
    }

    setRunning(false)
    setPaused(false)
  }

  const pauseCampaign = () => {
    pausedRef.current = true
    setPaused(true)
  }

  const resumeCampaign = () => {
    pausedRef.current = false
    setPaused(false)
  }

  const resetContacts = () => {
    setContacts(prev => prev.map(c => ({ ...c, status: 'pending', error: undefined })))
  }

  const clearAll = () => {
    setContacts([])
    setFileName('')
  }

  const downloadTemplate = () => {
    const csv = 'First Name,Last Name,Phone Number\nJohn,Smith,+14045551234\nJane,Doe,+16785559876\nAlex,Johnson,9175551234\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'speekeasy-contacts-template.csv'
    a.click()
  }

  const progress = stats.total > 0
    ? Math.round(((stats.completed + stats.failed) / stats.total) * 100)
    : 0

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-ink/90 backdrop-blur-xl border-b border-border px-8 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-xl text-cream flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-lime" />
                Bulk Caller
              </h1>
              <p className="text-xs text-subtle font-mono mt-0.5">Upload a list and launch a calling campaign</p>
            </div>
            <div className="flex items-center gap-2">
              {contacts.length > 0 && !running && (
                <Button variant="secondary" size="sm" onClick={clearAll}>
                  <Trash2 size={13} /> Clear list
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={downloadTemplate}>
                <Download size={13} /> Download template
              </Button>
            </div>
          </div>
        </div>

        <div className="p-8 max-w-5xl space-y-6">
          {/* No key warning */}
          {!hasKey && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-coral/5 border border-coral/20">
              <AlertCircle size={15} className="text-coral flex-shrink-0 mt-0.5" />
              <p className="text-sm text-ghost">
                Add your API key in <a href="/dashboard/settings" className="text-lime hover:underline">Settings</a> to use bulk calling.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-coral/5 border border-coral/20">
              <AlertCircle size={15} className="text-coral flex-shrink-0 mt-0.5" />
              <p className="text-sm text-coral">{error}</p>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left - Config */}
            <div className="space-y-4">
              {/* Agent + caller ID */}
              <Card>
                <h3 className="font-display font-semibold text-sm text-cream mb-4 flex items-center gap-2">
                  <PhoneCall size={14} className="text-lime" /> Campaign Settings
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Agent</label>
                    {agents.length === 0 ? (
                      <div className="p-3 rounded-lg bg-muted border border-border text-xs text-subtle">
                        No agents. <a href="/dashboard/agents" className="text-lime hover:underline">Create one</a>
                      </div>
                    ) : (
                      <select
                        value={agentId}
                        onChange={e => setAgentId(e.target.value)}
                        disabled={running}
                        className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime appearance-none disabled:opacity-50"
                      >
                        {agents.map(a => <option key={a.agent_id} value={a.agent_id}>{a.name}</option>)}
                      </select>
                    )}
                  </div>

                  {phoneNumbers.length > 0 && (
                    <div>
                      <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Caller ID</label>
                      <select
                        value={fromId}
                        onChange={e => setFromId(e.target.value)}
                        disabled={running}
                        className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime appearance-none disabled:opacity-50"
                      >
                        {phoneNumbers.map(n => (
                          <option key={n.phone_number_id} value={n.phone_number_id}>{n.phone_number}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">
                      Delay between calls
                    </label>
                    <select
                      value={delayMs}
                      onChange={e => setDelayMs(Number(e.target.value))}
                      disabled={running}
                      className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime appearance-none disabled:opacity-50"
                    >
                      <option value={1000}>1 second</option>
                      <option value={3000}>3 seconds</option>
                      <option value={5000}>5 seconds</option>
                      <option value={10000}>10 seconds</option>
                      <option value={30000}>30 seconds</option>
                      <option value={60000}>1 minute</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Stats */}
              {contacts.length > 0 && (
                <Card>
                  <h3 className="text-xs font-mono text-ghost uppercase tracking-widest mb-4">Campaign Progress</h3>

                  {/* Progress bar */}
                  <div className="h-2 bg-muted rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-lime rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs font-mono text-subtle mb-4">{progress}% complete</p>

                  <div className="space-y-2">
                    {[
                      { label: 'Total', val: stats.total, color: 'text-cream' },
                      { label: 'Pending', val: stats.pending, color: 'text-ghost' },
                      { label: 'Completed', val: stats.completed, color: 'text-violet' },
                      { label: 'Failed', val: stats.failed, color: 'text-coral' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-xs text-ghost">{label}</span>
                        <span className={clsx('text-sm font-mono font-medium', color)}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* TCPA Consent - Fix #14 */}
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-panel">
                    <input
                      type="checkbox"
                      id="tcpa"
                      checked={tcpaConsent}
                      onChange={e => setTcpaConsent(e.target.checked)}
                      disabled={running}
                      className="mt-0.5 flex-shrink-0 accent-lime cursor-pointer"
                    />
                    <label htmlFor="tcpa" className="text-xs text-ghost leading-relaxed cursor-pointer select-none">
                      I confirm I have obtained proper consent to contact these individuals and this campaign complies with the TCPA and all applicable calling laws.
                    </label>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    {!running ? (
                      <Button
                        onClick={startCampaign}
                        disabled={!hasKey || stats.pending === 0 || agents.length === 0 || !tcpaConsent}
                        className="w-full"
                        size="md"
                      >
                        <Play size={14} />
                        {stats.completed > 0 ? 'Resume campaign' : 'Start campaign'}
                      </Button>
                    ) : paused ? (
                      <Button onClick={resumeCampaign} className="w-full" size="md">
                        <Play size={14} /> Resume
                      </Button>
                    ) : (
                      <Button onClick={pauseCampaign} variant="secondary" className="w-full" size="md">
                        <Pause size={14} /> Pause
                      </Button>
                    )}
                    {(stats.completed > 0 || stats.failed > 0) && !running && (
                      <Button variant="secondary" onClick={resetContacts} className="w-full" size="sm">
                        Reset all to pending
                      </Button>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Right - Upload + contact list */}
            <div className="lg:col-span-2 space-y-4">
              {/* Upload zone */}
              {contacts.length === 0 && (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={clsx(
                    'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
                    dragOver
                      ? 'border-lime/60 bg-lime/5'
                      : 'border-border hover:border-lime/30 hover:bg-muted/20'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.tsv,.xlsx,.xls,.xlsm,.ods"
                    className="hidden"
                    onChange={e => handleFile(e.target.files[0])}
                  />
                  <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                    <Upload size={22} className="text-subtle" />
                  </div>
                  <p className="font-display font-semibold text-cream mb-2">
                    Drop your contact list here
                  </p>
                  <p className="text-sm text-ghost mb-4">
                    Supports native Excel (.xlsx, .xls), CSV, TSV, and ODS. Must include a phone number column.
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {['.xlsx', '.xls', '.csv', '.tsv', '.ods'].map(ext => (
                      <span key={ext} className="text-xs font-mono bg-panel border border-border text-ghost px-2.5 py-1 rounded-lg">{ext}</span>
                    ))}
                  </div>
                  <p className="text-xs text-subtle mt-4">or click to browse</p>
                </div>
              )}

              {/* File loaded - show contacts */}
              {contacts.length > 0 && (
                <Card className="p-0">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet size={15} className="text-lime" />
                      <div>
                        <p className="text-sm font-medium text-cream">{fileName}</p>
                        <p className="text-xs text-subtle">{contacts.length} contacts loaded</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!running && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-mono text-lime hover:text-lime-dim transition-colors"
                        >
                          Replace file
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt,.tsv,.xlsx,.xls,.xlsm,.ods"
                        className="hidden"
                        onChange={e => handleFile(e.target.files[0])}
                      />
                      {running && (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-lime">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime status-pulse" />
                          Campaign running
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Table header */}
                  <div className="grid grid-cols-12 px-5 py-2 border-b border-border text-xs font-mono text-subtle uppercase tracking-widest">
                    <div className="col-span-1"></div>
                    <div className="col-span-7">Contact</div>
                    <div className="col-span-3">Status</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Contact list */}
                  <div className="max-h-[500px] overflow-y-auto">
                    {contacts.map(contact => (
                      <ContactRow
                        key={contact.id}
                        contact={contact}
                        onRemove={removeContact}
                      />
                    ))}
                  </div>

                  {/* Start button at bottom if no stats card visible */}
                  {!running && stats.pending > 0 && (
                    <div className="px-5 py-4 border-t border-border space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-panel">
                        <input
                          type="checkbox"
                          id="tcpa-bottom"
                          checked={tcpaConsent}
                          onChange={e => setTcpaConsent(e.target.checked)}
                          className="mt-0.5 flex-shrink-0 accent-lime cursor-pointer"
                        />
                        <label htmlFor="tcpa-bottom" className="text-xs text-ghost leading-relaxed cursor-pointer select-none">
                          I confirm I have consent to contact these individuals and comply with the TCPA.
                        </label>
                      </div>
                      <Button
                        onClick={startCampaign}
                        disabled={!hasKey || agents.length === 0 || !tcpaConsent}
                        className="w-full"
                        size="lg"
                      >
                        <Play size={15} />
                        Start campaign -- call {stats.pending} contact{stats.pending !== 1 ? 's' : ''}
                      </Button>
                    </div>
                  )}
                </Card>
              )}

              {/* How it works */}
              {contacts.length === 0 && (
                <Card>
                  <p className="text-xs font-mono text-ghost uppercase tracking-widest mb-4">How it works</p>
                  <div className="space-y-4">
                    {[
                      { num: '01', title: 'Upload your list', desc: 'CSV or Excel file with a phone number column. Names are optional but recommended.' },
                      { num: '02', title: 'Configure your campaign', desc: 'Select your AI agent, caller ID, and delay between calls.' },
                      { num: '03', title: 'Launch and monitor', desc: 'Speekeasy calls each number in sequence. Pause or stop at any time.' },
                    ].map(({ num, title, desc }) => (
                      <div key={num} className="flex gap-4">
                        <span className="font-display font-bold text-2xl text-border leading-none mt-0.5 flex-shrink-0">{num}</span>
                        <div>
                          <p className="text-sm font-semibold text-cream mb-1">{title}</p>
                          <p className="text-xs text-ghost leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 p-4 bg-panel border border-border rounded-xl">
                    <p className="text-xs font-mono text-ghost uppercase tracking-widest mb-2">Accepted formats</p>
                    <p className="text-xs text-ghost leading-relaxed">
                      Upload native Excel files (.xlsx, .xls), CSV, TSV, or ODS. Your file needs at least one column with phone numbers. Headers like "Phone", "Mobile", "Number", "Cell", or "Tel" are auto-detected. First Name, Last Name, Name, and Contact columns are also detected automatically. Numbers can be in any format -- (404) 555-1234, 4045551234, +14045551234 all work.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
