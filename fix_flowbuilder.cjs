const fs = require('fs')

let c = fs.readFileSync('src/pages/FlowBuilder.jsx', 'utf8')

// 1. Swap Sidebar import for DashLayout
c = c.replace(
  "import Sidebar from '../components/Sidebar'",
  "import DashLayout from '../components/DashLayout'"
)

// 2. Replace the entire DeployModal function with the updated version
const oldModal = `// ── Deploy Modal ────────────────────────────────────────────
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
}`

const newModal = `// ── Deploy Modal ────────────────────────────────────────────
function DeployModal({ nodes, edges, flowName, onClose, onDeployed }) {
  const el = useElevenLabs()
  const [voices, setVoices] = React.useState([])
  const [phoneNumbers, setPhoneNumbers] = React.useState([])
  const [voiceId, setVoiceId] = React.useState('')
  const [agentName, setAgentName] = React.useState(flowName + ' Agent')
  const [inboundNumberId, setInboundNumberId] = React.useState('')
  const [enableInbound, setEnableInbound] = React.useState(false)
  const [deploying, setDeploying] = React.useState(false)
  const [error, setError] = React.useState('')
  const [preview, setPreview] = React.useState(false)
  const prompt = compileFlowToPrompt(nodes, edges, flowName)

  React.useEffect(() => {
    el.getVoices().then(v => { setVoices(v); if (v.length) setVoiceId(v[0].voice_id) }).catch(() => {})
    el.getPhoneNumbers().then(nums => {
      setPhoneNumbers(nums)
      if (nums.length) setInboundNumberId(nums[0].phone_number_id)
    }).catch(() => {})
  }, [])

  const deploy = async () => {
    if (!agentName.trim()) { setError('Agent name is required'); return }
    setDeploying(true); setError('')
    try {
      const agent = await el.createAgent({ name: agentName, voiceId, prompt, firstMessage: '' })
      // If inbound routing is enabled, assign this agent to the selected phone number
      if (enableInbound && inboundNumberId && agent?.agent_id) {
        await el.assignInboundAgent(inboundNumberId, agent.agent_id)
      }
      onDeployed(agent, enableInbound ? inboundNumberId : null)
    } catch (e) {
      setError(e.message)
      setDeploying(false)
    }
  }

  const selectedNumber = phoneNumbers.find(n => n.phone_number_id === inboundNumberId)

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

          {/* Inbound routing */}
          <div className="p-4 rounded-xl border border-border bg-panel space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-violet/10 border border-violet/20 flex items-center justify-center">
                  <Phone size={12} className="text-violet" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-cream">Route inbound calls</p>
                  <p className="text-xs text-subtle">Assign this agent to answer incoming calls</p>
                </div>
              </div>
              <button
                onClick={() => setEnableInbound(v => !v)}
                className={clsx(
                  'relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
                  enableInbound ? 'bg-lime' : 'bg-muted border border-border'
                )}
              >
                <span className={clsx(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                  enableInbound ? 'left-4' : 'left-0.5'
                )} />
              </button>
            </div>

            {enableInbound && (
              <div>
                {phoneNumbers.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-ink/60 border border-border text-xs text-subtle">
                    <Phone size={11} />
                    No phone numbers found. <a href="/dashboard/inbound" className="text-lime hover:underline ml-1">Add one first.</a>
                  </div>
                ) : (
                  <>
                    <label className="text-xs font-mono text-ghost uppercase tracking-widest block mb-1.5">Phone Number</label>
                    <select
                      value={inboundNumberId}
                      onChange={e => setInboundNumberId(e.target.value)}
                      className="w-full bg-ink/80 border border-border text-cream px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-violet appearance-none"
                    >
                      {phoneNumbers.map(n => (
                        <option key={n.phone_number_id} value={n.phone_number_id}>{n.phone_number}</option>
                      ))}
                    </select>
                    {selectedNumber && (
                      <p className="text-xs text-subtle mt-1.5">
                        Calls to <span className="text-cream font-mono">{selectedNumber.phone_number}</span> will be answered by this agent.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
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
            Creates a new agent from <span className="text-cream font-medium">{nodes.length} nodes</span>
            {enableInbound && selectedNumber && (
              <span> and routes inbound calls on <span className="text-cream font-mono">{selectedNumber.phone_number}</span> to it</span>
            )}.
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
}`

c = c.replace(oldModal, newModal)

// 3. Update SuccessBanner to mention inbound if assigned
c = c.replace(
  `function SuccessBanner({ agentName, onClose }) {
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
}`,
  `function SuccessBanner({ agentName, inboundNumber, onClose }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 px-5 py-4 rounded-2xl bg-lime/10 border border-lime/30 shadow-2xl">
      <div className="w-8 h-8 rounded-xl bg-lime/20 flex items-center justify-center">
        <Zap size={14} className="text-lime" />
      </div>
      <div>
        <p className="text-sm font-display font-semibold text-cream">Agent deployed!</p>
        <p className="text-xs text-ghost mt-0.5">
          "{agentName}" is ready in Outbound Calls
          {inboundNumber && <span className="text-lime"> · answering inbound calls</span>}
        </p>
      </div>
      <button onClick={onClose} className="text-subtle hover:text-ghost transition-colors ml-2"><X size={14} /></button>
    </div>
  )
}`
)

// 4. Update onDeployed call to pass inbound number through
c = c.replace(
  `onDeployed={agent => { setDeployedAgent(agent); setShowDeploy(false) }}`,
  `onDeployed={(agent, inboundNumberId) => { setDeployedAgent({ ...agent, inboundNumberId }); setShowDeploy(false) }}`
)

// 5. Update SuccessBanner usage to pass inboundNumber
c = c.replace(
  `<SuccessBanner agentName={deployedAgent.name || flowName + ' Agent'} onClose={() => setDeployedAgent(null)} />`,
  `<SuccessBanner agentName={deployedAgent.name || flowName + ' Agent'} inboundNumber={deployedAgent.inboundNumberId} onClose={() => setDeployedAgent(null)} />`
)

// 6. Swap Sidebar usage for DashLayout in JSX
c = c.replace(
  `    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">`,
  `    <DashLayout>
      <div className="flex flex-col" style={{minHeight: 'calc(100vh - 56px)'}}>
      <div className="flex flex-1 flex-col overflow-hidden">`
)

// Close DashLayout properly at end
c = c.replace(
  `      </main>
    </div>`,
  `      </div>
      </div>
    </DashLayout>`
)

fs.writeFileSync('src/pages/FlowBuilder.jsx', c)
console.log('FlowBuilder.jsx updated')

// Verify
const updated = fs.readFileSync('src/pages/FlowBuilder.jsx', 'utf8')
console.log('Has DashLayout:', updated.includes('DashLayout'))
console.log('Has Sidebar:', updated.includes("import Sidebar"))
console.log('Has inbound toggle:', updated.includes('enableInbound'))
console.log('Has assignInboundAgent:', updated.includes('assignInboundAgent'))
console.log('Has phone numbers fetch:', updated.includes('getPhoneNumbers'))
