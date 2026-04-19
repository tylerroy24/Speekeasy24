import React, { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { Card, Badge, Button } from '../components/UI'
import { storage } from '../lib/storage'
import { Phone, PhoneCall, PhoneOff, Clock, CheckCircle, Search, Trash2, Download } from 'lucide-react'
import { clsx } from 'clsx'

const STATUS_MAP = {
  calling: { label: 'In Call', variant: 'lime', icon: PhoneCall },
  completed: { label: 'Completed', variant: 'violet', icon: CheckCircle },
  failed: { label: 'Failed', variant: 'coral', icon: PhoneOff },
  initiated: { label: 'Initiated', variant: 'lime', icon: Clock },
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function History() {
  const [calls, setCalls] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    setCalls(storage.getCalls())
  }, [])

  const filtered = calls.filter(c => {
    const matchSearch = c.to?.includes(search) || c.agentName?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const clearHistory = () => {
    if (!window.confirm('Clear all call history? This cannot be undone.')) return
    storage.saveCalls([])
    setCalls([])
  }

  const exportCSV = () => {
    const rows = [
      ['Timestamp', 'To Number', 'Agent', 'Status'],
      ...calls.map(c => [c.timestamp, c.to, c.agentName || '', c.status]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'speekeasy-calls.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const stats = {
    total: calls.length,
    completed: calls.filter(c => c.status === 'completed').length,
    failed: calls.filter(c => c.status === 'failed').length,
    today: calls.filter(c => new Date(c.timestamp).toDateString() === new Date().toDateString()).length,
  }

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-ink/80 backdrop-blur-xl border-b border-border px-8 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-xl text-cream">Call History</h1>
              <p className="text-xs text-subtle font-mono mt-0.5">{calls.length} total calls logged</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={exportCSV}>
                <Download size={13} /> Export CSV
              </Button>
              <Button variant="danger" size="sm" onClick={clearHistory}>
                <Trash2 size={13} /> Clear
              </Button>
            </div>
          </div>
        </div>

        <div className="p-8 max-w-5xl">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total calls', val: stats.total, color: 'text-cream' },
              { label: 'Completed', val: stats.completed, color: 'text-violet' },
              { label: 'Failed', val: stats.failed, color: 'text-coral' },
              { label: 'Today', val: stats.today, color: 'text-lime' },
            ].map(({ label, val, color }) => (
              <Card key={label} className="py-4">
                <p className="text-xs font-mono text-subtle mb-1">{label}</p>
                <p className={clsx('font-display font-bold text-3xl', color)}>{val}</p>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                placeholder="Search number or agent..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-base w-full pl-9 pr-4 py-2.5 rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-1.5">
              {['all', 'completed', 'calling', 'failed', 'initiated'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={clsx(
                    'text-xs font-mono px-3 py-1.5 rounded-lg border transition-all capitalize',
                    filterStatus === s
                      ? 'bg-lime/10 border-lime/30 text-lime'
                      : 'border-border text-subtle hover:text-ghost hover:border-muted'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <Card className="p-0">
            <div className="px-5 py-3 border-b border-border grid grid-cols-12 text-xs font-mono text-subtle uppercase tracking-wider">
              <div className="col-span-4">Number</div>
              <div className="col-span-3">Agent</div>
              <div className="col-span-3">Time</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Phone size={18} className="text-subtle" />
                </div>
                <p className="text-sm text-ghost">No calls found</p>
                <p className="text-xs text-subtle mt-1">
                  {calls.length === 0 ? 'Make your first call from the dashboard' : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              filtered.map(call => {
                const s = STATUS_MAP[call.status] || STATUS_MAP.initiated
                const Icon = s.icon
                return (
                  <div key={call.id} className="px-5 py-4 border-b border-border last:border-0 grid grid-cols-12 items-center hover:bg-muted/20 transition-colors">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                        call.status === 'completed' ? 'bg-violet/10' :
                        call.status === 'failed' ? 'bg-coral/10' : 'bg-lime/10'
                      )}>
                        <Icon size={12} className={
                          call.status === 'completed' ? 'text-violet' :
                          call.status === 'failed' ? 'text-coral' : 'text-lime'
                        } />
                      </div>
                      <span className="text-sm font-mono text-cream">{call.to || '—'}</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-sm text-ghost">{call.agentName || 'Unknown'}</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-xs font-mono text-subtle">{formatDate(call.timestamp)}</span>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                  </div>
                )
              })
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
