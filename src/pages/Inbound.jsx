import React, { useState, useEffect } from 'react'
import DashLayout from '../components/DashLayout'
import { Button, Card, Badge, Spinner } from '../components/UI'
import { useElevenLabs } from '../lib/elevenlabs'
import { useAuth } from '../context/AuthContext'
import { useSEO } from '../hooks/useSEO'
import {
  PhoneIncoming, Phone, Bot, RefreshCw, AlertCircle,
  Check, ChevronRight, Info, ExternalLink,
} from 'lucide-react'
import { clsx } from 'clsx'

function PhoneNumberCard({ number, agents, onAssign, saving }) {
  // ElevenLabs returns assigned_agent: { agent_id, agent_name } not agent_id directly
  const currentAgentId = number.assigned_agent?.agent_id || number.agent_id || ''
  const [selected, setSelected] = useState(currentAgentId)
  const assigned = agents.find(a => a.agent_id === currentAgentId)
  const hasChanged = selected !== currentAgentId

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center flex-shrink-0">
            <Phone size={15} className="text-lime" />
          </div>
          <div>
            <p className="font-mono text-base font-medium text-cream">{number.phone_number}</p>
            <p className="text-xs text-subtle font-mono mt-0.5">ID: {number.phone_number_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {assigned ? (
            <Badge variant="lime">
              <span className="w-1.5 h-1.5 rounded-full bg-lime status-pulse" />
              Inbound active
            </Badge>
          ) : (
            <Badge variant="default">No inbound agent</Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <p className="text-xs font-mono text-ghost uppercase tracking-widest mb-3">Inbound Agent</p>
        <div className="flex gap-3 items-center">
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="flex-1 bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/10"
          >
            <option value="">-- No inbound agent --</option>
            {agents.map(a => (
              <option key={a.agent_id} value={a.agent_id}>{a.name}</option>
            ))}
          </select>
          <Button
            size="sm"
            variant={hasChanged ? 'primary' : 'secondary'}
            disabled={!hasChanged || saving}
            loading={saving}
            onClick={() => onAssign(number.phone_number_id, selected)}
          >
            <Check size={13} /> Save
          </Button>
        </div>

        {assigned && (
          <div className="mt-3 flex items-center gap-2 text-xs text-ghost">
            <Bot size={12} className="text-lime" />
            Currently routing to <span className="text-lime font-medium">{assigned.name}</span>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="px-5 pb-4">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-panel border border-border text-xs text-ghost leading-relaxed">
          <Info size={12} className="text-subtle flex-shrink-0 mt-0.5" />
          Anyone who calls <span className="font-mono text-cream mx-1">{number.phone_number}</span>
          will be connected to the assigned agent automatically.
        </div>
      </div>
    </Card>
  )
}

export default function Inbound() {
  useSEO({ title: "Inbound Calls", description: "Configure inbound call routing for your AI agents.", noIndex: true })

  const { user } = useAuth()
  const el = useElevenLabs()
  const hasKey = true

  const [phoneNumbers, setPhoneNumbers] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(null)
  const [err, setErr] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (hasKey) load()
  }, [hasKey])

  const load = async () => {
    setLoading(true)
    setErr('')
    try {
      const [nums, agts] = await Promise.all([el.getPhoneNumbers(), el.getAgents()])
      setPhoneNumbers(nums)
      setAgents(agts)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async (phoneNumberId, agentId) => {
    setSaving(phoneNumberId)
    setErr('')
    try {
      await el.assignInboundAgent(phoneNumberId, agentId || null)
      setSuccessMsg('Inbound agent updated successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
      await load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <DashLayout>
        {/* Header */}
        <div className="sticky top-0 bg-ink/80 backdrop-blur-xl border-b border-border px-8 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-xl text-cream flex items-center gap-2">
                <PhoneIncoming size={18} className="text-lime" />
                Inbound Calls
              </h1>
              <p className="text-xs text-subtle font-mono mt-0.5">
                Route incoming calls to your AI agents
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Refresh
              </Button>
              <a
                href="https://elevenlabs.io/app/conversational-ai/phone-numbers"
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="secondary" size="sm">
                  <ExternalLink size={13} /> Buy numbers
                </Button>
              </a>
            </div>
          </div>
        </div>

        <div className="p-8 max-w-3xl">
          {/* No key */}
          {!hasKey && (
            <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-coral/5 border border-coral/20">
              <AlertCircle size={16} className="text-coral flex-shrink-0 mt-0.5" />
              <p className="text-sm text-ghost">
                Add your ElevenLabs API key in{' '}
                <a href="/dashboard/settings" className="text-lime hover:underline">Settings</a>{' '}
                to manage phone numbers.
              </p>
            </div>
          )}

          {/* Success */}
          {successMsg && (
            <div className="flex items-center gap-2 p-4 mb-5 rounded-xl bg-lime/10 border border-lime/20 text-lime text-sm">
              <Check size={14} /> {successMsg}
            </div>
          )}

          {/* Error */}
          {err && (
            <div className="flex items-start gap-2 p-4 mb-5 rounded-xl bg-coral/10 border border-coral/20 text-coral text-sm">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {err}
            </div>
          )}

          {/* How inbound works banner */}
          <div className="mb-6 p-5 rounded-2xl border border-violet/20 bg-violet/5">
            <p className="text-xs font-mono text-violet uppercase tracking-widest mb-3">How inbound calling works</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { num: '01', text: 'Someone calls your Twilio number' },
                { num: '02', text: 'ElevenLabs routes the call to your assigned agent' },
                { num: '03', text: 'Your AI agent answers and handles the conversation' },
              ].map(({ num, text }) => (
                <div key={num} className="flex items-start gap-3">
                  <span className="font-display font-bold text-lg text-violet/40 leading-none mt-0.5">{num}</span>
                  <p className="text-xs text-ghost leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner size={24} />
            </div>
          ) : phoneNumbers.length === 0 && hasKey ? (
            /* No numbers */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Phone size={24} className="text-subtle" />
              </div>
              <p className="text-ghost font-medium mb-2">No phone numbers yet</p>
              <p className="text-xs text-subtle mb-6 max-w-xs leading-relaxed">
                Purchase a Twilio number and link it to ElevenLabs to enable inbound and outbound calling.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://elevenlabs.io/app/conversational-ai/phone-numbers"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button size="sm">
                    <ExternalLink size={13} /> Add number in ElevenLabs
                  </Button>
                </a>
                <a
                  href="https://elevenlabs.io/docs/conversational-ai/phone-calls/twilio"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="secondary" size="sm">
                    View setup docs
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            /* Phone numbers list */
            <div className="space-y-4">
              {phoneNumbers.map(num => (
                <PhoneNumberCard
                  key={num.phone_number_id}
                  number={num}
                  agents={agents}
                  onAssign={handleAssign}
                  saving={saving === num.phone_number_id}
                />
              ))}
            </div>
          )}

          {/* No agents warning */}
          {hasKey && !loading && phoneNumbers.length > 0 && agents.length === 0 && (
            <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-coral/5 border border-coral/20">
              <AlertCircle size={15} className="text-coral flex-shrink-0 mt-0.5" />
              <p className="text-sm text-ghost">
                No agents created yet.{' '}
                <a href="/dashboard/agents" className="text-lime hover:underline">Create an agent</a>{' '}
                to assign it to your phone numbers.
              </p>
            </div>
          )}
        </div>
    </DashLayout>
  )
}
