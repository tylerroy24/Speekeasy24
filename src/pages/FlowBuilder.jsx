import React, { useState, useRef, useCallback, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { useSEO } from '../hooks/useSEO'
import { useElevenLabs } from '../lib/elevenlabs'
import {
  Plus, Trash2, Save, Play, X, ChevronDown, Zap, Phone,
  MessageSquare, GitBranch, PhoneForwarded, StopCircle, Settings, Copy
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Node type definitions ──────────────────────────────────
const NODE_TYPES = {
  start:    { label: 'Call Start',     color: 'lime',   icon: Phone,          desc: 'Entry point when call connects' },
  message:  { label: 'Say Message',    color: 'violet', icon: MessageSquare,  desc: 'Agent speaks a message' },
  branch:   { label: 'Branch',         color: 'coral',  icon: GitBranch,      desc: 'Route based on caller response' },
  action:   { label: 'Action',         color: 'lime',   icon: Zap,            desc: 'Trigger webhook or CRM update' },
  transfer: { label: 'Transfer',       color: 'ghost',  icon: PhoneForwarded, desc: 'Transfer to human agent' },
  end:      { label: 'End Call',       color: 'coral',  icon: StopCircle,     desc: 'Hang up the call' },
}

const COLOR_MAP = {
  lime:   { bg: 'bg-lime/10',   border: 'border-lime/30',   text: 'text-lime',   dot: 'bg-lime' },
  violet: { bg: 'bg-violet/10', border: 'border-violet/30', text: 'text-violet', dot: 'bg-violet' },
  coral:  { bg: 'bg-coral/10',  border: 'border-coral/30',  text: 'text-coral',  dot: 'bg-coral' },
  ghost:  { bg: 'bg-muted',     border: 'border-border',    text: 'text-ghost',  dot: 'bg-ghost' },
}

let nodeIdCounter = 3

function makeId() { return `node_${++nodeIdCounter}_${Date.now()}` }

const DEFAULT_NODES = [
  {
    id: 'node_1', type: 'start', x: 120, y: 200,
    data: { label: 'Call Start', message: '' }
  },
  {
    id: 'node_2', type: 'message', x: 380, y: 200,
    data: { label: 'Greeting', message: 'Hi! Thanks for calling. How can I help you today?' }
  },
  {
    id: 'node_3', type: 'branch', x: 640, y: 200,
    data: { label: 'Intent Check', conditions: ['Interested', 'Not interested', 'Call back later'] }
  },
]

const DEFAULT_EDGES = [
  { id: 'e1', from: 'node_1', to: 'node_2' },
  { id: 'e2', from: 'node_2', to: 'node_3' },
]

// ── Utility: get node port positions ──────────────────────
function getOutputPort(node) {
  return { x: node.x + 220, y: node.y + 44 }
}
function getInputPort(node) {
  return { x: node.x, y: node.y + 44 }
}

// ── Edge SVG path ──────────────────────────────────────────
function EdgePath({ from, to, nodes, selected, onClick, id }) {
  const fromNode = nodes.find(n => n.id === from)
  const toNode = nodes.find(n => n.id === to)
  if (!fromNode || !toNode) return null

  const start = getOutputPort(fromNode)
  const end = getInputPort(toNode)
  const cp1x = start.x + Math.max(60, (end.x - start.x) * 0.5)
  const cp2x = end.x - Math.max(60, (end.x - start.x) * 0.5)

  const d = `M ${start.x} ${start.y} C ${cp1x} ${start.y}, ${cp2x} ${end.y}, ${end.x} ${end.y}`

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Hit area */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
      {/* Visible line */}
      <path
        d={d} fill="none"
        stroke={selected ? '#C8F53A' : '#2A2A3A'}
        strokeWidth={selected ? 2 : 1.5}
        strokeDasharray={selected ? 'none' : 'none'}
        style={{ transition: 'stroke 0.15s' }}
      />
      {/* Arrow */}
      <circle cx={end.x} cy={end.y} r={4}
        fill={selected ? '#C8F53A' : '#2A2A3A'}
        stroke={selected ? '#C8F53A' : '#3A3A5A'}
        strokeWidth={1}
      />
    </g>
  )
}

// ── Node component ─────────────────────────────────────────
function FlowNode({ node, selected, onSelect, onDragStart, onConnect, connectingFrom }) {
  const type = NODE_TYPES[node.type] || NODE_TYPES.message
  const colors = COLOR_MAP[type.color] || COLOR_MAP.violet
  const Icon = type.icon
  const isConnecting = !!connectingFrom

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onClick={e => { e.stopPropagation(); onSelect(node.id) }}
      onMouseDown={e => { e.stopPropagation(); onDragStart(e, node.id) }}
      style={{ cursor: 'grab', userSelect: 'none' }}
    >
      {/* Node body */}
      <rect
        x={0} y={0} width={220} height={88} rx={12}
        fill={selected ? '#16161F' : '#13131A'}
        stroke={selected ? '#C8F53A' : '#1E1E2E'}
        strokeWidth={selected ? 1.5 : 1}
      />

      {/* Color accent bar */}
      <rect x={0} y={0} width={4} height={88} rx={2}
        fill={type.color === 'lime' ? '#C8F53A' : type.color === 'violet' ? '#7B5CF0' : type.color === 'coral' ? '#FF5C3A' : '#6B6B8A'}
      />

      {/* Icon bg */}
      <rect x={16} y={20} width={32} height={32} rx={8}
        fill={type.color === 'lime' ? 'rgba(200,245,58,0.1)' : type.color === 'violet' ? 'rgba(123,92,240,0.1)' : type.color === 'coral' ? 'rgba(255,92,58,0.1)' : 'rgba(107,107,138,0.1)'}
      />

      {/* Label */}
      <text x={58} y={34} fill="#F0EEE6" fontSize={11} fontWeight={600} fontFamily="Syne, sans-serif">{node.data.label || type.label}</text>
      <text x={58} y={50} fill="#6B6B8A" fontSize={10} fontFamily="DM Sans, sans-serif">{type.label}</text>

      {/* Message preview */}
      {node.data.message && (
        <text x={16} y={74} fill="#9898B8" fontSize={9} fontFamily="DM Sans, sans-serif">
          {node.data.message.slice(0, 32)}{node.data.message.length > 32 ? '…' : ''}
        </text>
      )}
      {node.data.conditions && (
        <text x={16} y={74} fill="#9898B8" fontSize={9} fontFamily="DM Sans, sans-serif">
          {node.data.conditions.length} branch{node.data.conditions.length !== 1 ? 'es' : ''}
        </text>
      )}

      {/* Input port (left) */}
      {node.type !== 'start' && (
        <circle cx={0} cy={44} r={6}
          fill="#13131A" stroke="#2A2A3A" strokeWidth={1.5}
          style={{ cursor: isConnecting ? 'crosshair' : 'default' }}
          onClick={e => { e.stopPropagation(); if (connectingFrom) onConnect(connectingFrom, node.id) }}
        />
      )}

      {/* Output port (right) */}
      {node.type !== 'end' && (
        <circle cx={220} cy={44} r={6}
          fill={connectingFrom === node.id ? '#C8F53A' : '#13131A'}
          stroke={connectingFrom === node.id ? '#C8F53A' : '#2A2A3A'}
          strokeWidth={1.5}
          style={{ cursor: 'crosshair' }}
          onClick={e => { e.stopPropagation(); onConnect(node.id, null) }}
        />
      )}

      {/* SVG icon (simple shape) */}
      <foreignObject x={20} y={24} width={24} height={24}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{
          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: type.color === 'lime' ? '#C8F53A' : type.color === 'violet' ? '#7B5CF0' : type.color === 'coral' ? '#FF5C3A' : '#9898B8'
        }}>
          <Icon size={13} />
        </div>
      </foreignObject>
    </g>
  )
}

// ── Inspector Panel ────────────────────────────────────────
function Inspector({ node, onChange, onDelete, onClose }) {
  if (!node) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
        <Settings size={18} className="text-subtle" />
      </div>
      <p className="text-sm text-ghost font-medium">No node selected</p>
      <p className="text-xs text-subtle mt-1">Click a node to edit its properties</p>
    </div>
  )

  const type = NODE_TYPES[node.type] || NODE_TYPES.message
  const Icon = type.icon

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Icon size={14} className="text-lime" />
          <span className="font-display font-semibold text-sm text-cream">{type.label}</span>
        </div>
        <button onClick={onClose} className="text-subtle hover:text-ghost transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Node label */}
        <div>
          <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Node Label</label>
          <input
            value={node.data.label || ''}
            onChange={e => onChange({ ...node, data: { ...node.data, label: e.target.value } })}
            className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime"
            placeholder="Label this node..."
          />
        </div>

        {/* Message */}
        {(node.type === 'message' || node.type === 'start') && (
          <div>
            <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Agent Message</label>
            <textarea
              value={node.data.message || ''}
              onChange={e => onChange({ ...node, data: { ...node.data, message: e.target.value } })}
              rows={4}
              className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime resize-none"
              placeholder="What should the agent say?"
            />
          </div>
        )}

        {/* Branch conditions */}
        {node.type === 'branch' && (
          <div>
            <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Branch Conditions</label>
            <div className="space-y-2">
              {(node.data.conditions || []).map((cond, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-coral/10 border border-coral/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-mono text-coral">{i + 1}</span>
                  </div>
                  <input
                    value={cond}
                    onChange={e => {
                      const conditions = [...(node.data.conditions || [])]
                      conditions[i] = e.target.value
                      onChange({ ...node, data: { ...node.data, conditions } })
                    }}
                    className="flex-1 bg-ink/80 border border-border text-cream px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-lime"
                    placeholder={`Condition ${i + 1}`}
                  />
                  <button onClick={() => {
                    const conditions = (node.data.conditions || []).filter((_, j) => j !== i)
                    onChange({ ...node, data: { ...node.data, conditions } })
                  }} className="text-subtle hover:text-coral transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => onChange({ ...node, data: { ...node.data, conditions: [...(node.data.conditions || []), ''] } })}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border text-xs text-subtle hover:text-ghost hover:border-muted transition-all"
              >
                <Plus size={12} /> Add condition
              </button>
            </div>
          </div>
        )}

        {/* Webhook URL for action nodes */}
        {node.type === 'action' && (
          <div>
            <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Webhook URL</label>
            <input
              value={node.data.webhookUrl || ''}
              onChange={e => onChange({ ...node, data: { ...node.data, webhookUrl: e.target.value } })}
              className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-lime"
              placeholder="https://your-crm.com/webhook"
            />
          </div>
        )}

        {/* Transfer number */}
        {node.type === 'transfer' && (
          <div>
            <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Transfer To</label>
            <input
              value={node.data.transferTo || ''}
              onChange={e => onChange({ ...node, data: { ...node.data, transferTo: e.target.value } })}
              className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-lime"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        )}

        {/* Node type info */}
        <div className="p-3 rounded-xl bg-panel border border-border">
          <p className="text-xs text-subtle leading-relaxed">{type.desc}</p>
        </div>
      </div>

      {/* Delete */}
      {node.type !== 'start' && (
        <div className="p-5 border-t border-border">
          <button
            onClick={() => onDelete(node.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono text-coral hover:bg-coral/10 border border-transparent hover:border-coral/20 transition-all"
          >
            <Trash2 size={13} /> Delete node
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Flow Builder ──────────────────────────────────────

// ── Flow → Prompt Compiler ─────────────────────────────────
function compileFlowToPrompt(nodes, edges, flowName) {
  const lines = []
  lines.push(`You are an AI voice agent named "${flowName}". Follow this call flow exactly:\n`)

  // Build adjacency for traversal
  const adj = {}
  edges.forEach(e => { if (!adj[e.from]) adj[e.from] = []; adj[e.from].push(e.to) })

  const visited = new Set()
  const queue = [nodes.find(n => n.type === 'start')]

  while (queue.length) {
    const node = queue.shift()
    if (!node || visited.has(node.id)) continue
    visited.add(node.id)

    if (node.type === 'start') {
      lines.push('STEP: Call begins.')
      if (node.data.message) lines.push(`Say: "${node.data.message}"`)
    } else if (node.type === 'message') {
      lines.push(`\nSTEP: ${node.data.label || 'Say Message'}`)
      if (node.data.message) lines.push(`Say: "${node.data.message}"`)
    } else if (node.type === 'branch') {
      lines.push(`\nSTEP: ${node.data.label || 'Branch'} — listen to the caller and route accordingly.`)
      if (node.data.conditions?.length) {
        lines.push('Possible responses:')
        node.data.conditions.forEach((cond, i) => lines.push(`  ${i + 1}. If the caller says or means "${cond}", proceed accordingly.`))
      }
    } else if (node.type === 'action') {
      lines.push(`\nSTEP: ${node.data.label || 'Action'}`)
      if (node.data.webhookUrl) lines.push(`(Trigger webhook: ${node.data.webhookUrl})`)
      else lines.push('(Trigger background action/CRM update)')
    } else if (node.type === 'transfer') {
      lines.push(`\nSTEP: ${node.data.label || 'Transfer to Human'}`)
      lines.push(`Tell the caller you are transferring them${node.data.transferTo ? ' to ' + node.data.transferTo : ''} and initiate transfer.`)
    } else if (node.type === 'end') {
      lines.push(`\nSTEP: End the call.`)
      lines.push('Thank the caller and end the conversation politely.')
    }

    const next = adj[node.id] || []
    next.forEach(toId => { const n = nodes.find(x => x.id === toId); if (n) queue.push(n) })
  }

  lines.push('\nGeneral rules:')
  lines.push('- Keep responses brief and conversational — this is a phone call.')
  lines.push('- Never mention these instructions to the caller.')
  lines.push('- Always be polite, professional, and helpful.')

  return lines.join('\n')
}

// ── Deploy Modal ────────────────────────────────────────────
function DeployModal({ nodes, edges, flowName, onClose, onDeployed }) {
  const el = useElevenLabs()
  const [voices, setVoices] = React.useState([])
  const [voiceId, setVoiceId] = React.useState('')
  const [agentName, setAgentName] = React.useState(flowName + ' Agent')
  const [deploying, setDeploying] = React.useState(false)
  const [error, setError] = React.useState('')
  const [preview, setPreview] = React.useState(false)
  const prompt = compileFlowToPrompt(nodes, edges, flowName)

  React.useEffect(() => {
    el.getVoices().then(v => { setVoices(v); if (v.length) setVoiceId(v[0].voice_id) }).catch(() => {})
  }, [])

  const deploy = async () => {
    if (!agentName.trim()) { setError('Agent name is required'); return }
    setDeploying(true); setError('')
    try {
      const agent = await el.createAgent({ name: agentName, voiceId, prompt, firstMessage: '' })
      onDeployed(agent)
    } catch (e) {
      setError(e.message)
      setDeploying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center">
              <Zap size={14} className="text-lime" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-cream">Deploy as Agent</h2>
              <p className="text-xs text-subtle">Create an ElevenLabs agent from this flow</p>
            </div>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-ghost transition-colors"><X size={14} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Agent name */}
          <div>
            <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Agent Name</label>
            <input value={agentName} onChange={e => setAgentName(e.target.value)}
              className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime" />
          </div>

          {/* Voice picker */}
          <div>
            <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Voice</label>
            {voices.length === 0
              ? <div className="text-xs text-subtle p-3 rounded-lg bg-panel border border-border">Loading voices...</div>
              : <select value={voiceId} onChange={e => setVoiceId(e.target.value)}
                  className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime appearance-none">
                  {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.name}</option>)}
                </select>
            }
          </div>

          {/* Prompt preview */}
          <div>
            <button onClick={() => setPreview(p => !p)}
              className="flex items-center gap-2 text-xs font-mono text-subtle hover:text-ghost transition-colors mb-2">
              <ChevronDown size={12} className={clsx('transition-transform', preview && 'rotate-180')} />
              {preview ? 'Hide' : 'Preview'} generated prompt
            </button>
            {preview && (
              <div className="p-3 rounded-xl bg-panel border border-border max-h-48 overflow-y-auto">
                <pre className="text-xs text-ghost font-mono whitespace-pre-wrap leading-relaxed">{prompt}</pre>
              </div>
            )}
          </div>

          {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-coral/10 border border-coral/20 text-xs text-coral"><X size={12} />{error}</div>}

          {/* Summary */}
          <div className="p-3 rounded-xl bg-lime/5 border border-lime/10 text-xs text-ghost">
            This will create a new agent in your ElevenLabs account using the <span className="text-cream font-medium">{nodes.length} nodes</span> in this flow as its instructions.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="text-xs font-mono text-subtle hover:text-ghost px-4 py-2 rounded-xl transition-colors">Cancel</button>
          <button onClick={deploy} disabled={deploying || !voiceId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lime text-ink text-xs font-mono font-semibold hover:bg-lime-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {deploying ? <><div className="w-3 h-3 border-2 border-ink/30 border-t-ink rounded-full animate-spin" /> Deploying...</> : <><Zap size={13} /> Deploy agent</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Success Banner ──────────────────────────────────────────
function SuccessBanner({ agentName, onClose }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 px-5 py-4 rounded-2xl bg-lime/10 border border-lime/30 shadow-2xl">
      <div className="w-8 h-8 rounded-xl bg-lime/20 flex items-center justify-center">
        <Zap size={14} className="text-lime" />
      </div>
      <div>
        <p className="text-sm font-display font-semibold text-cream">Agent deployed!</p>
        <p className="text-xs text-ghost mt-0.5">"{agentName}" is ready in Outbound Calls</p>
      </div>
      <button onClick={onClose} className="text-subtle hover:text-ghost transition-colors ml-2"><X size={14} /></button>
    </div>
  )
}

export default function FlowBuilder() {
  useSEO({ title: "Flow Builder", description: "Build visual call flows for your AI agents.", noIndex: true })

  const [showDeploy, setShowDeploy] = useState(false)
  const [deployedAgent, setDeployedAgent] = useState(null)
  const [nodes, setNodes] = useState(DEFAULT_NODES)
  const [edges, setEdges] = useState(DEFAULT_EDGES)
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [connectingFrom, setConnectingFrom] = useState(null)
  const [saved, setSaved] = useState(false)
  const [flowName, setFlowName] = useState('My Call Flow')
  const [editingName, setEditingName] = useState(false)

  const svgRef = useRef(null)
  const dragging = useRef(null)
  const offset = useRef({ x: 0, y: 0 })

  // ── Pan state ────────────────────────────────────────────
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })

  const getSelectedNode = () => nodes.find(n => n.id === selectedNode) || null

  // ── Drag logic ───────────────────────────────────────────
  const handleDragStart = useCallback((e, id) => {
    if (connectingFrom) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    const node = nodes.find(n => n.id === id)
    dragging.current = id
    offset.current = { x: svgP.x - node.x - pan.x, y: svgP.y - node.y - pan.y }
    e.preventDefault()
  }, [nodes, connectingFrom, pan])

  const handleMouseMove = useCallback((e) => {
    if (panning.current) {
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      setPan(p => ({ x: p.x + dx, y: p.y + dy }))
      panStart.current = { x: e.clientX, y: e.clientY }
      return
    }
    if (!dragging.current) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    setNodes(ns => ns.map(n => n.id === dragging.current
      ? { ...n, x: svgP.x - offset.current.x - pan.x, y: svgP.y - offset.current.y - pan.y }
      : n
    ))
  }, [pan])

  const handleMouseUp = useCallback(() => {
    dragging.current = null
    panning.current = false
  }, [])

  const handleSvgMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === 'svg') {
      if (connectingFrom) { setConnectingFrom(null); return }
      setSelectedNode(null)
      setSelectedEdge(null)
      panning.current = true
      panStart.current = { x: e.clientX, y: e.clientY }
    }
  }, [connectingFrom])

  // ── Connect logic ────────────────────────────────────────
  const handleConnect = useCallback((fromId, toId) => {
    if (!toId) {
      // Start connecting
      setConnectingFrom(fromId === connectingFrom ? null : fromId)
    } else if (fromId && toId && fromId !== toId) {
      // Complete connection
      const exists = edges.find(e => e.from === fromId && e.to === toId)
      if (!exists) {
        setEdges(es => [...es, { id: `e_${Date.now()}`, from: fromId, to: toId }])
      }
      setConnectingFrom(null)
    }
  }, [connectingFrom, edges])

  // ── Add node ─────────────────────────────────────────────
  const addNode = (type) => {
    const id = makeId()
    const defaults = {
      message:  { label: 'Say Message', message: '' },
      branch:   { label: 'Branch', conditions: ['Option A', 'Option B'] },
      action:   { label: 'Action', webhookUrl: '' },
      transfer: { label: 'Transfer', transferTo: '' },
      end:      { label: 'End Call' },
    }
    const newNode = {
      id, type,
      x: 200 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      data: defaults[type] || { label: type }
    }
    setNodes(ns => [...ns, newNode])
    setSelectedNode(id)
  }

  // ── Update node ──────────────────────────────────────────
  const updateNode = (updated) => {
    setNodes(ns => ns.map(n => n.id === updated.id ? updated : n))
  }

  // ── Delete node ──────────────────────────────────────────
  const deleteNode = (id) => {
    setNodes(ns => ns.filter(n => n.id !== id))
    setEdges(es => es.filter(e => e.from !== id && e.to !== id))
    setSelectedNode(null)
  }

  // ── Delete edge ──────────────────────────────────────────
  const deleteEdge = (id) => {
    setEdges(es => es.filter(e => e.id !== id))
    setSelectedEdge(null)
  }

  // ── Save ─────────────────────────────────────────────────
  const saveFlow = () => {
    const flow = { name: flowName, nodes, edges, savedAt: new Date().toISOString() }
    localStorage.setItem('speekeasy_flow', JSON.stringify(flow))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Load saved ───────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('speekeasy_flow')
    if (saved) {
      try {
        const flow = JSON.parse(saved)
        setNodes(flow.nodes)
        setEdges(flow.edges)
        setFlowName(flow.name || 'My Call Flow')
      } catch {}
    }
  }, [])

  const nodeTypes = [
    { type: 'message',  label: 'Say Message',  icon: MessageSquare },
    { type: 'branch',   label: 'Branch',        icon: GitBranch },
    { type: 'action',   label: 'Action',        icon: Zap },
    { type: 'transfer', label: 'Transfer',      icon: PhoneForwarded },
    { type: 'end',      label: 'End Call',      icon: StopCircle },
  ]

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <GitBranch size={16} className="text-lime" />
            {editingName ? (
              <input
                autoFocus
                value={flowName}
                onChange={e => setFlowName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
                className="font-display font-bold text-base text-cream bg-transparent border-b border-lime outline-none"
              />
            ) : (
              <h1
                className="font-display font-bold text-base text-cream cursor-text hover:text-lime transition-colors"
                onClick={() => setEditingName(true)}
              >{flowName}</h1>
            )}
            <span className="text-xs font-mono text-subtle">{nodes.length} nodes · {edges.length} connections</span>
          </div>
          <div className="flex items-center gap-2">
            {connectingFrom && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-lime/10 border border-lime/20 text-xs font-mono text-lime">
                <div className="w-1.5 h-1.5 rounded-full bg-lime status-pulse" />
                Click a node input to connect
              </div>
            )}
            {(selectedNode || selectedEdge) && (
              <button
                onClick={() => {
                  if (selectedEdge) { setEdges(es=>es.filter(e=>e.id!==selectedEdge)); setSelectedEdge(null) }
                  else if (selectedNode) {
                    const node = nodes.find(n=>n.id===selectedNode)
                    if (node && node.type !== 'start') {
                      setNodes(ns=>ns.filter(n=>n.id!==selectedNode))
                      setEdges(es=>es.filter(e=>e.from!==selectedNode&&e.to!==selectedNode))
                      setSelectedNode(null)
                    }
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-coral/10 text-coral border border-coral/30 hover:bg-coral/20 transition-all">
                <Trash2 size={13} /> Delete {selectedEdge ? 'Connection' : 'Node'}
              </button>
            )}
            <button onClick={saveFlow}
              className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all', saved ? 'bg-lime/20 text-lime border border-lime/30' : 'bg-lime text-ink hover:bg-lime-dim')}>
              <Save size={13} /> {saved ? 'Saved!' : 'Save flow'}
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Left toolbar */}
          <div className="w-48 border-r border-border bg-surface flex flex-col gap-1 p-3 flex-shrink-0">
            <p className="text-xs font-mono text-subtle uppercase tracking-widest mb-2 px-1">Add Node</p>
            {nodeTypes.map(({ type, label, icon: Icon }) => {
              const t = NODE_TYPES[type]
              const c = COLOR_MAP[t.color]
              return (
                <button
                  key={type}
                  onClick={() => addNode(type)}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-sans transition-all border',
                    'border-transparent hover:border-border hover:bg-panel text-ghost hover:text-cream'
                  )}
                >
                  <div className={clsx('w-6 h-6 rounded-lg flex items-center justify-center', c.bg)}>
                    <Icon size={11} className={c.text} />
                  </div>
                  {label}
                </button>
              )
            })}

            <div className="mt-auto pt-4 border-t border-border">
              <p className="text-xs font-mono text-subtle uppercase tracking-widest mb-2 px-1">Tips</p>
              <p className="text-xs text-subtle leading-relaxed px-1">Drag nodes to reposition. Click the <span className="text-lime">●</span> output port to start a connection.</p>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden bg-ink" style={{ backgroundImage: 'radial-gradient(circle, #1E1E2E 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            <svg
              ref={svgRef}
              width="100%" height="100%"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseDown={handleSvgMouseDown}
              style={{ cursor: panning.current ? 'grabbing' : 'default' }}
            >
              <g transform={`translate(${pan.x}, ${pan.y})`}>
                {/* Edges */}
                {edges.map(edge => (
                  <EdgePath
                    key={edge.id}
                    id={edge.id}
                    from={edge.from}
                    to={edge.to}
                    nodes={nodes}
                    selected={selectedEdge === edge.id}
                    onClick={e => { e.stopPropagation(); setSelectedEdge(edge.id); setSelectedNode(null) }}
                  />
                ))}

                {/* Nodes */}
                {nodes.map(node => (
                  <FlowNode
                    key={node.id}
                    node={node}
                    selected={selectedNode === node.id}
                    onSelect={setSelectedNode}
                    onDragStart={handleDragStart}
                    onConnect={handleConnect}
                    connectingFrom={connectingFrom}
                  />
                ))}
              </g>
            </svg>

            {/* Delete edge hint */}
            {selectedEdge && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface border border-border shadow-xl">
                <span className="text-xs text-ghost">Connection selected</span>
                <button
                  onClick={() => deleteEdge(selectedEdge)}
                  className="flex items-center gap-1.5 text-xs font-mono text-coral hover:bg-coral/10 px-2 py-1 rounded-lg transition-all"
                >
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            )}
          </div>

          {/* Right inspector */}
          <div className="w-64 border-l border-border bg-surface flex-shrink-0">
            <Inspector
              node={getSelectedNode()}
              onChange={updateNode}
              onDelete={deleteNode}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        </div>
      </main>
      {showDeploy && (
        <DeployModal
          nodes={nodes} edges={edges} flowName={flowName}
          onClose={() => setShowDeploy(false)}
          onDeployed={agent => { setDeployedAgent(agent); setShowDeploy(false) }}
        />
      )}
      {deployedAgent && (
        <SuccessBanner agentName={deployedAgent.name || flowName + ' Agent'} onClose={() => setDeployedAgent(null)} />
      )}
    </div>
  )
}
