import React, { useState, useRef, useCallback, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { useSEO } from '../hooks/useSEO'
import { Plus, Trash2, Save, X, Zap, Phone, MessageSquare, GitBranch, PhoneForwarded, StopCircle, Settings } from 'lucide-react'
import { clsx } from 'clsx'

const NODE_TYPES = {
  start:    { label: 'Call Start',  color: 'lime',   icon: Phone,          desc: 'Entry point when call connects' },
  message:  { label: 'Say Message', color: 'violet', icon: MessageSquare,  desc: 'Agent speaks a message' },
  branch:   { label: 'Branch',      color: 'coral',  icon: GitBranch,      desc: 'Route based on caller response' },
  action:   { label: 'Action',      color: 'lime',   icon: Zap,            desc: 'Trigger a webhook or CRM update' },
  transfer: { label: 'Transfer',    color: 'ghost',  icon: PhoneForwarded, desc: 'Transfer to a human agent' },
  end:      { label: 'End Call',    color: 'coral',  icon: StopCircle,     desc: 'Hang up the call' },
}

const COLOR_MAP = {
  lime:   { bg: 'rgba(200,245,58,0.1)',  border: '#C8F53A', text: '#C8F53A' },
  violet: { bg: 'rgba(123,92,240,0.1)', border: '#7B5CF0', text: '#7B5CF0' },
  coral:  { bg: 'rgba(255,92,58,0.1)',  border: '#FF5C3A', text: '#FF5C3A' },
  ghost:  { bg: 'rgba(107,107,138,0.1)',border: '#6B6B8A', text: '#9898B8' },
}

let nodeIdCounter = 3
function makeId() { return `node_${++nodeIdCounter}_${Date.now()}` }

const DEFAULT_NODES = [
  { id: 'node_1', type: 'start',   x: 80,  y: 180, data: { label: 'Call Start', message: '' } },
  { id: 'node_2', type: 'message', x: 360, y: 180, data: { label: 'Greeting', message: 'Hi! Thanks for calling. How can I help you today?' } },
  { id: 'node_3', type: 'branch',  x: 640, y: 180, data: { label: 'Intent Check', conditions: ['Interested', 'Not interested', 'Call back later'] } },
]
const DEFAULT_EDGES = [
  { id: 'e1', from: 'node_1', to: 'node_2' },
  { id: 'e2', from: 'node_2', to: 'node_3' },
]

function EdgePath({ from, to, nodes, selected, onClick }) {
  const fn = nodes.find(n => n.id === from)
  const tn = nodes.find(n => n.id === to)
  if (!fn || !tn) return null
  const sx = fn.x + 220, sy = fn.y + 44
  const ex = tn.x,       ey = tn.y + 44
  const cp = Math.max(60, Math.abs(ex - sx) * 0.5)
  const d = `M ${sx} ${sy} C ${sx+cp} ${sy}, ${ex-cp} ${ey}, ${ex} ${ey}`
  return (
    <g onClick={onClick} style={{cursor:'pointer'}}>
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
      <path d={d} fill="none" stroke={selected ? '#C8F53A' : '#2A2A3A'} strokeWidth={selected ? 2 : 1.5} />
      <circle cx={ex} cy={ey} r={4} fill={selected ? '#C8F53A' : '#2A2A3A'} />
    </g>
  )
}

function FlowNode({ node, selected, onSelect, onDragStart, onConnect, connectingFrom }) {
  const type = NODE_TYPES[node.type] || NODE_TYPES.message
  const col = COLOR_MAP[type.color] || COLOR_MAP.violet
  const Icon = type.icon
  return (
    <g transform={`translate(${node.x},${node.y})`}
      onClick={e => { e.stopPropagation(); onSelect(node.id) }}
      onMouseDown={e => { e.stopPropagation(); onDragStart(e, node.id) }}
      style={{cursor:'grab',userSelect:'none'}}>
      <rect x={0} y={0} width={220} height={88} rx={12}
        fill={selected ? '#16161F' : '#13131A'}
        stroke={selected ? '#C8F53A' : '#1E1E2E'} strokeWidth={selected ? 1.5 : 1} />
      <rect x={0} y={0} width={4} height={88} rx={2} fill={col.border} />
      <rect x={16} y={20} width={32} height={32} rx={8} fill={col.bg} />
      <text x={58} y={34} fill="#F0EEE6" fontSize={11} fontWeight={600} fontFamily="Syne,sans-serif">{(node.data.label||type.label).slice(0,18)}</text>
      <text x={58} y={50} fill="#6B6B8A" fontSize={10} fontFamily="DM Sans,sans-serif">{type.label}</text>
      {node.data.message && <text x={16} y={74} fill="#9898B8" fontSize={9} fontFamily="DM Sans,sans-serif">{node.data.message.slice(0,34)}{node.data.message.length>34?'…':''}</text>}
      {node.data.conditions && <text x={16} y={74} fill="#9898B8" fontSize={9} fontFamily="DM Sans,sans-serif">{node.data.conditions.length} branch{node.data.conditions.length!==1?'es':''}</text>}
      {node.type !== 'start' && (
        <circle cx={0} cy={44} r={6} fill="#13131A" stroke="#2A2A3A" strokeWidth={1.5}
          style={{cursor: connectingFrom ? 'crosshair' : 'default'}}
          onClick={e => { e.stopPropagation(); if(connectingFrom) onConnect(connectingFrom, node.id) }} />
      )}
      {node.type !== 'end' && (
        <circle cx={220} cy={44} r={6}
          fill={connectingFrom===node.id ? '#C8F53A' : '#13131A'}
          stroke={connectingFrom===node.id ? '#C8F53A' : '#2A2A3A'} strokeWidth={1.5}
          style={{cursor:'crosshair'}}
          onClick={e => { e.stopPropagation(); onConnect(node.id, null) }} />
      )}
      <foreignObject x={20} y={24} width={24} height={24}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',color:col.text}}>
          <Icon size={13} />
        </div>
      </foreignObject>
    </g>
  )
}

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
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Icon size={14} className="text-lime" />
          <span className="font-display font-semibold text-sm text-cream">{type.label}</span>
        </div>
        <button onClick={onClose} className="text-subtle hover:text-ghost transition-colors"><X size={14} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Node Label</label>
          <input value={node.data.label||''} onChange={e => onChange({...node,data:{...node.data,label:e.target.value}})}
            className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime" placeholder="Label this node..." />
        </div>
        {(node.type==='message'||node.type==='start') && (
          <div>
            <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Agent Message</label>
            <textarea value={node.data.message||''} onChange={e => onChange({...node,data:{...node.data,message:e.target.value}})}
              rows={4} className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-lime resize-none"
              placeholder="What should the agent say?" />
          </div>
        )}
        {node.type==='branch' && (
          <div>
            <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Branch Conditions</label>
            <div className="space-y-2">
              {(node.data.conditions||[]).map((cond,i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-coral/10 border border-coral/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-mono text-coral">{i+1}</span>
                  </div>
                  <input value={cond} onChange={e => { const c=[...(node.data.conditions||[])]; c[i]=e.target.value; onChange({...node,data:{...node.data,conditions:c}}) }}
                    className="flex-1 bg-ink/80 border border-border text-cream px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-lime" placeholder={`Condition ${i+1}`} />
                  <button onClick={() => { const c=(node.data.conditions||[]).filter((_,j)=>j!==i); onChange({...node,data:{...node.data,conditions:c}}) }}
                    className="text-subtle hover:text-coral transition-colors"><X size={13} /></button>
                </div>
              ))}
              <button onClick={() => onChange({...node,data:{...node.data,conditions:[...(node.data.conditions||[]),'']}})}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border text-xs text-subtle hover:text-ghost hover:border-muted transition-all">
                <Plus size={12} /> Add condition
              </button>
            </div>
          </div>
        )}
        {node.type==='action' && (
          <div>
            <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Webhook URL</label>
            <input value={node.data.webhookUrl||''} onChange={e => onChange({...node,data:{...node.data,webhookUrl:e.target.value}})}
              className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-lime" placeholder="https://your-crm.com/webhook" />
          </div>
        )}
        {node.type==='transfer' && (
          <div>
            <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Transfer To</label>
            <input value={node.data.transferTo||''} onChange={e => onChange({...node,data:{...node.data,transferTo:e.target.value}})}
              className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-lime" placeholder="+1 (555) 000-0000" />
          </div>
        )}
        <div className="p-3 rounded-xl bg-panel border border-border">
          <p className="text-xs text-subtle leading-relaxed">{type.desc}</p>
        </div>
      </div>
      {node.type !== 'start' && (
        <div className="p-5 border-t border-border">
          <button onClick={() => onDelete(node.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono text-coral hover:bg-coral/10 border border-transparent hover:border-coral/20 transition-all">
            <Trash2 size={13} /> Delete node
          </button>
        </div>
      )}
    </div>
  )
}

export default function FlowBuilder() {
  useSEO({ title: "Flow Builder", description: "Build visual call flows for your AI agents.", noIndex: true })
  const [nodes, setNodes] = useState(DEFAULT_NODES)
  const [edges, setEdges] = useState(DEFAULT_EDGES)
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [connectingFrom, setConnectingFrom] = useState(null)
  const [saved, setSaved] = useState(false)
  const [flowName, setFlowName] = useState('My Call Flow')
  const [editingName, setEditingName] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const svgRef = useRef(null)
  const dragging = useRef(null)
  const offset = useRef({ x: 0, y: 0 })
  const panning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const s = localStorage.getItem('speekeasy_flow')
    if (s) { try { const f=JSON.parse(s); setNodes(f.nodes); setEdges(f.edges); setFlowName(f.name||'My Call Flow') } catch {} }
  }, [])

  const getSelectedNode = () => nodes.find(n => n.id === selectedNode) || null

  const handleDragStart = useCallback((e, id) => {
    if (connectingFrom) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY
    const sp = pt.matrixTransform(svg.getScreenCTM().inverse())
    const node = nodes.find(n => n.id === id)
    dragging.current = id
    offset.current = { x: sp.x - node.x - pan.x, y: sp.y - node.y - pan.y }
    e.preventDefault()
  }, [nodes, connectingFrom, pan])

  const handleMouseMove = useCallback((e) => {
    if (panning.current) {
      const dx=e.clientX-panStart.current.x, dy=e.clientY-panStart.current.y
      setPan(p => ({ x:p.x+dx, y:p.y+dy }))
      panStart.current = { x:e.clientX, y:e.clientY }
      return
    }
    if (!dragging.current) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY
    const sp = pt.matrixTransform(svg.getScreenCTM().inverse())
    setNodes(ns => ns.map(n => n.id===dragging.current ? {...n, x:sp.x-offset.current.x-pan.x, y:sp.y-offset.current.y-pan.y} : n))
  }, [pan])

  const handleMouseUp = useCallback(() => { dragging.current=null; panning.current=false }, [])

  const handleSvgMouseDown = useCallback((e) => {
    if (e.target===svgRef.current || e.target.tagName==='svg') {
      if (connectingFrom) { setConnectingFrom(null); return }
      setSelectedNode(null); setSelectedEdge(null)
      panning.current=true; panStart.current={x:e.clientX,y:e.clientY}
    }
  }, [connectingFrom])

  const handleConnect = useCallback((fromId, toId) => {
    if (!toId) { setConnectingFrom(fromId===connectingFrom ? null : fromId) }
    else if (fromId && toId && fromId!==toId) {
      if (!edges.find(e => e.from===fromId && e.to===toId))
        setEdges(es => [...es, { id:`e_${Date.now()}`, from:fromId, to:toId }])
      setConnectingFrom(null)
    }
  }, [connectingFrom, edges])

  const addNode = (type) => {
    const id = makeId()
    const defaults = { message:{label:'Say Message',message:''}, branch:{label:'Branch',conditions:['Option A','Option B']}, action:{label:'Action',webhookUrl:''}, transfer:{label:'Transfer',transferTo:''}, end:{label:'End Call'} }
    setNodes(ns => [...ns, { id, type, x:200+Math.random()*150, y:80+Math.random()*180, data:defaults[type]||{label:type} }])
    setSelectedNode(id)
  }

  const updateNode = (updated) => setNodes(ns => ns.map(n => n.id===updated.id ? updated : n))
  const deleteNode = (id) => { setNodes(ns => ns.filter(n => n.id!==id)); setEdges(es => es.filter(e => e.from!==id && e.to!==id)); setSelectedNode(null) }
  const deleteEdge = (id) => { setEdges(es => es.filter(e => e.id!==id)); setSelectedEdge(null) }

  const saveFlow = () => {
    localStorage.setItem('speekeasy_flow', JSON.stringify({ name:flowName, nodes, edges, savedAt:new Date().toISOString() }))
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const nodeTypes = [
    { type:'message',  label:'Say Message', icon:MessageSquare },
    { type:'branch',   label:'Branch',      icon:GitBranch },
    { type:'action',   label:'Action',      icon:Zap },
    { type:'transfer', label:'Transfer',    icon:PhoneForwarded },
    { type:'end',      label:'End Call',    icon:StopCircle },
  ]

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <GitBranch size={16} className="text-lime" />
            {editingName
              ? <input autoFocus value={flowName} onChange={e=>setFlowName(e.target.value)} onBlur={()=>setEditingName(false)} onKeyDown={e=>e.key==='Enter'&&setEditingName(false)} className="font-display font-bold text-base text-cream bg-transparent border-b border-lime outline-none" />
              : <h1 className="font-display font-bold text-base text-cream cursor-text hover:text-lime transition-colors" onClick={()=>setEditingName(true)}>{flowName}</h1>
            }
            <span className="text-xs font-mono text-subtle">{nodes.length} nodes · {edges.length} connections</span>
          </div>
          <div className="flex items-center gap-2">
            {connectingFrom && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-lime/10 border border-lime/20 text-xs font-mono text-lime">
                <div className="w-1.5 h-1.5 rounded-full bg-lime" />
                Click an input port to connect
              </div>
            )}
            <button onClick={saveFlow} className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all', saved ? 'bg-lime/20 text-lime border border-lime/30' : 'bg-lime text-ink hover:bg-lime-dim')}>
              <Save size={13} /> {saved ? 'Saved!' : 'Save flow'}
            </button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 border-r border-border bg-surface flex flex-col gap-1 p-3 flex-shrink-0">
            <p className="text-xs font-mono text-subtle uppercase tracking-widest mb-2 px-1">Add Node</p>
            {nodeTypes.map(({ type, label, icon:Icon }) => {
              const t = NODE_TYPES[type]; const col = COLOR_MAP[t.color]
              return (
                <button key={type} onClick={() => addNode(type)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-sans transition-all border border-transparent hover:border-border hover:bg-panel text-ghost hover:text-cream">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:col.bg}}>
                    <Icon size={11} style={{color:col.text}} />
                  </div>
                  {label}
                </button>
              )
            })}
            <div className="mt-auto pt-4 border-t border-border">
              <p className="text-xs font-mono text-subtle uppercase tracking-widest mb-2 px-1">Tips</p>
              <p className="text-xs text-subtle leading-relaxed px-1">Drag nodes to move. Click the <span className="text-lime">●</span> right port to start connecting.</p>
            </div>
          </div>
          <div className="flex-1 relative overflow-hidden bg-ink" style={{backgroundImage:'radial-gradient(circle, #1E1E2E 1px, transparent 1px)',backgroundSize:'24px 24px'}}>
            <svg ref={svgRef} width="100%" height="100%"
              onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseDown={handleSvgMouseDown}>
              <g transform={`translate(${pan.x},${pan.y})`}>
                {edges.map(edge => (
                  <EdgePath key={edge.id} from={edge.from} to={edge.to} nodes={nodes}
                    selected={selectedEdge===edge.id}
                    onClick={e => { e.stopPropagation(); setSelectedEdge(edge.id); setSelectedNode(null) }} />
                ))}
                {nodes.map(node => (
                  <FlowNode key={node.id} node={node} selected={selectedNode===node.id}
                    onSelect={setSelectedNode} onDragStart={handleDragStart}
                    onConnect={handleConnect} connectingFrom={connectingFrom} />
                ))}
              </g>
            </svg>
            {selectedEdge && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface border border-border shadow-xl">
                <span className="text-xs text-ghost">Connection selected</span>
                <button onClick={() => deleteEdge(selectedEdge)} className="flex items-center gap-1.5 text-xs font-mono text-coral hover:bg-coral/10 px-2 py-1 rounded-lg transition-all">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            )}
          </div>
          <div className="w-64 border-l border-border bg-surface flex-shrink-0">
            <Inspector node={getSelectedNode()} onChange={updateNode} onDelete={deleteNode} onClose={() => setSelectedNode(null)} />
          </div>
        </div>
      </main>
    </div>
  )
}
