import React, { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { Card, Spinner } from '../components/UI'
import { storage } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { useSEO } from '../hooks/useSEO'
import {
  BarChart3, TrendingUp, Phone, CheckCircle, Clock,
  ThumbsUp, ThumbsDown, Minus, AlertCircle, RefreshCw
} from 'lucide-react'
import { clsx } from 'clsx'

function StatCard({ label, value, sub, icon: Icon, accent = 'lime' }) {
  const colors = {
    lime: 'text-lime bg-lime/10 border-lime/20',
    violet: 'text-violet bg-violet/10 border-violet/20',
    coral: 'text-coral bg-coral/10 border-coral/20',
    ghost: 'text-ghost bg-muted border-border',
  }
  return (
    <Card className="flex items-start gap-4">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border', colors[accent])}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-display font-bold text-cream">{value}</p>
        <p className="text-xs font-mono text-ghost uppercase tracking-widest mt-0.5">{label}</p>
        {sub && <p className="text-xs text-subtle mt-1">{sub}</p>}
      </div>
    </Card>
  )
}

function SentimentBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-ghost font-mono">{label}</span>
        <span className={clsx('font-medium', color)}>{count} ({pct}%)</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', {
            'bg-lime': color === 'text-lime',
            'bg-subtle': color === 'text-subtle',
            'bg-coral': color === 'text-coral',
          })}
          style={{ width: pct + '%' }}
        />
      </div>
    </div>
  )
}

function MiniBarChart({ data }) {
  const entries = Object.entries(data)
  const max = Math.max(...entries.map(([, v]) => v), 1)
  return (
    <div className="flex items-end gap-1.5 h-24">
      {entries.map(([date, count]) => {
        const height = Math.max((count / max) * 100, count > 0 ? 8 : 2)
        const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })
        return (
          <div key={date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
              <div
                className={clsx('w-full rounded-sm transition-all duration-700', count > 0 ? 'bg-lime/70' : 'bg-muted')}
                style={{ height: height + '%' }}
                title={date + ': ' + count + ' calls'}
              />
            </div>
            <span className="text-xs font-mono text-subtle">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Analytics() {
  useSEO({ title: 'Analytics', description: 'Call analytics, sentiment, and performance metrics.', noIndex: true })

  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState(7)
  const [localStats, setLocalStats] = useState(null)

  useEffect(() => {
    loadAnalytics()
    loadLocalStats()
  }, [period])

  const loadLocalStats = () => {
    const calls = storage.getCalls()
    const now = Date.now()
    const periodMs = period * 24 * 60 * 60 * 1000
    const recent = calls.filter(c => now - new Date(c.timestamp).getTime() < periodMs)

    const total = recent.length
    const completed = recent.filter(c => c.status === 'completed').length
    const failed = recent.filter(c => c.status === 'failed').length
    const outbound = recent.filter(c => c.direction !== 'inbound').length
    const inbound = recent.filter(c => c.direction === 'inbound').length

    const dailyCounts = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      dailyCounts[d] = 0
    }
    recent.forEach(c => {
      const day = c.timestamp?.slice(0, 10)
      if (day && dailyCounts[day] !== undefined) dailyCounts[day]++
    })

    setLocalStats({ total, completed, failed, outbound, inbound, dailyCounts })
  }

  const loadAnalytics = async () => {
    setLoading(true)
    setError('')
    try {
      const token = user?.access_token || null
      const headers = token ? { Authorization: 'Bearer ' + token } : {}
      const res = await fetch('/api/analytics?days=' + period, { headers })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to load analytics')
      }
      const data = await res.json()
      setAnalytics(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const stats = analytics?.summary || {}
  const sentiments = analytics?.sentiments || {}
  const sentimentTotal = Object.values(sentiments).reduce((a, b) => a + b, 0)
  const dailyCounts = analytics?.dailyCounts || localStats?.dailyCounts || {}

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-ink/90 backdrop-blur-xl border-b border-border px-8 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-xl text-cream flex items-center gap-2">
                <BarChart3 size={18} className="text-lime" /> Analytics
              </h1>
              <p className="text-xs text-subtle font-mono mt-0.5">Call performance and sentiment trends</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={period}
                onChange={e => setPeriod(Number(e.target.value))}
                className="bg-ink/80 border border-border text-cream px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-lime appearance-none"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button onClick={loadAnalytics} className="text-subtle hover:text-lime transition-colors p-2">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6 max-w-6xl">
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-coral/5 border border-coral/20 text-sm text-coral">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {error} -- showing local data instead.
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total calls"
              value={stats.total ?? localStats?.total ?? 0}
              icon={Phone}
              accent="lime"
              sub={`Last ${period} days`}
            />
            <StatCard
              label="Completed"
              value={stats.completed ?? localStats?.completed ?? 0}
              icon={CheckCircle}
              accent="violet"
              sub={`${stats.successRate ?? (localStats?.total > 0 ? Math.round((localStats?.completed / localStats?.total) * 100) : 0)}% success rate`}
            />
            <StatCard
              label="Avg duration"
              value={stats.avgDuration ? stats.avgDuration + 's' : '--'}
              icon={Clock}
              accent="ghost"
              sub="Per completed call"
            />
            <StatCard
              label="Outbound"
              value={localStats?.outbound ?? 0}
              icon={TrendingUp}
              accent="lime"
              sub={`${localStats?.inbound ?? 0} inbound`}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Daily call volume */}
            <Card>
              <h2 className="font-display font-semibold text-sm text-cream mb-5 flex items-center gap-2">
                <BarChart3 size={14} className="text-lime" /> Daily call volume
              </h2>
              {Object.keys(dailyCounts).length > 0 ? (
                <MiniBarChart data={dailyCounts} />
              ) : (
                <div className="h-24 flex items-center justify-center text-subtle text-sm">No data yet</div>
              )}
            </Card>

            {/* Sentiment breakdown */}
            <Card>
              <h2 className="font-display font-semibold text-sm text-cream mb-5 flex items-center gap-2">
                <ThumbsUp size={14} className="text-lime" /> Caller sentiment
              </h2>
              {sentimentTotal > 0 ? (
                <div className="space-y-4">
                  <SentimentBar label="Positive" count={sentiments.positive || 0} total={sentimentTotal} color="text-lime" />
                  <SentimentBar label="Neutral" count={sentiments.neutral || 0} total={sentimentTotal} color="text-subtle" />
                  <SentimentBar label="Negative" count={sentiments.negative || 0} total={sentimentTotal} color="text-coral" />
                  {sentiments.unknown > 0 && (
                    <SentimentBar label="Unknown" count={sentiments.unknown} total={sentimentTotal} color="text-subtle" />
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-panel border border-border text-xs text-ghost">
                    <ThumbsUp size={13} className="text-subtle flex-shrink-0" />
                    Sentiment data appears here once calls complete via webhook. Make sure your ElevenLabs webhook is configured.
                  </div>
                  <div className="space-y-3 opacity-30">
                    <SentimentBar label="Positive" count={65} total={100} color="text-lime" />
                    <SentimentBar label="Neutral" count={25} total={100} color="text-subtle" />
                    <SentimentBar label="Negative" count={10} total={100} color="text-coral" />
                  </div>
                </div>
              )}
            </Card>

            {/* Call outcomes */}
            <Card>
              <h2 className="font-display font-semibold text-sm text-cream mb-5 flex items-center gap-2">
                <CheckCircle size={14} className="text-lime" /> Call outcomes
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Completed', value: localStats?.completed || 0, color: 'text-violet', bg: 'bg-violet' },
                  { label: 'Failed / No answer', value: localStats?.failed || 0, color: 'text-coral', bg: 'bg-coral' },
                  { label: 'Total', value: localStats?.total || 0, color: 'text-cream', bg: 'bg-lime' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', bg)} />
                    <span className="text-sm text-ghost flex-1">{label}</span>
                    <span className={clsx('text-sm font-mono font-medium', color)}>{value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                    {localStats?.total > 0 && (
                      <>
                        <div
                          className="h-full bg-violet transition-all"
                          style={{ width: Math.round((localStats.completed / localStats.total) * 100) + '%' }}
                        />
                        <div
                          className="h-full bg-coral transition-all"
                          style={{ width: Math.round((localStats.failed / localStats.total) * 100) + '%' }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Top agents */}
            <Card>
              <h2 className="font-display font-semibold text-sm text-cream mb-5 flex items-center gap-2">
                <TrendingUp size={14} className="text-lime" /> Performance tips
              </h2>
              <div className="space-y-3 text-sm text-ghost">
                {localStats?.total === 0 ? (
                  <p className="text-subtle">Make your first call to start seeing performance data here.</p>
                ) : (
                  <>
                    {(localStats?.completed / localStats?.total) >= 0.7 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-lime/5 border border-lime/20">
                        <ThumbsUp size={13} className="text-lime flex-shrink-0 mt-0.5" />
                        <span>Strong completion rate -- your agent is connecting well.</span>
                      </div>
                    )}
                    {(localStats?.completed / localStats?.total) < 0.5 && localStats?.total > 5 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-coral/5 border border-coral/20">
                        <AlertCircle size={13} className="text-coral flex-shrink-0 mt-0.5" />
                        <span>Low completion rate. Try adjusting your agent prompt or calling during business hours.</span>
                      </div>
                    )}
                    {localStats?.outbound > localStats?.inbound * 3 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-panel border border-border">
                        <Minus size={13} className="text-subtle flex-shrink-0 mt-0.5" />
                        <span>Mostly outbound calls. Consider setting up inbound routing to handle callbacks.</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-panel border border-border">
                      <BarChart3 size={13} className="text-subtle flex-shrink-0 mt-0.5" />
                      <span>Connect your ElevenLabs webhook to unlock sentiment analysis and success scoring.</span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
