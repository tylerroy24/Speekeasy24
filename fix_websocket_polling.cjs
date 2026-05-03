const fs = require('fs')

// ── 1. Replace useCallEvents.js with polling version ──────
const newHook = `import { useEffect, useRef, useState, useCallback } from 'react'
import { storage } from '../lib/storage'

const POLL_INTERVAL = 5000 // 5 seconds

export function useCallEvents(onEvent) {
  const [connected, setConnected] = useState(false)
  const onEventRef = useRef(onEvent)
  const lastCountRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => { onEventRef.current = onEvent }, [onEvent])

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/el/conversations', {
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) throw new Error('poll failed')
      const data = await res.json()
      setConnected(true)

      const conversations = data.conversations || []

      // On first poll just set baseline, don't fire events
      if (lastCountRef.current === null) {
        lastCountRef.current = conversations.length
        return
      }

      // Fire call.completed for any new conversations since last poll
      if (conversations.length > lastCountRef.current) {
        const newOnes = conversations.slice(0, conversations.length - lastCountRef.current)
        newOnes.forEach(conv => {
          onEventRef.current && onEventRef.current('call.completed', {
            conversationId: conv.conversation_id,
            agentId: conv.agent_id,
            agentName: conv.metadata?.agent_name || 'Agent',
            duration: conv.metadata?.call_duration_secs,
            status: conv.status,
            direction: 'outbound',
          })
        })
      }

      lastCountRef.current = conversations.length
    } catch (e) {
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    // Initial poll
    poll()
    // Start polling interval
    timerRef.current = setInterval(poll, POLL_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [poll])

  return { connected }
}
`

fs.writeFileSync('src/hooks/useCallEvents.js', newHook)
console.log('✓ src/hooks/useCallEvents.js replaced with polling version')

// ── 2. Remove WebSocket server from server.js ──────────────
let server = fs.readFileSync('server.js', 'utf8')

// Remove ws import
server = server.replace("import { WebSocketServer } from 'ws'\n", '')

// Remove WebSocket server block (from comment to end of wss.on block)
server = server.replace(
  /\/\/ ── WebSocket server with auth[^/]+wss\.on\('connection'[^}]+}\)[^\n]*\n/s,
  '// WebSocket removed - using polling for Vercel compatibility\n'
)

// Remove upgrade handler
server = server.replace(
  /server\.on\('upgrade'[\s\S]+?wss\.handleUpgrade[\s\S]+?}\s*\)\s*}\s*\)/s,
  ''
)

// Remove WebSocket close in graceful shutdown
server = server.replace(
  /\/\/ Close all WebSocket connections[\s\S]{0,200}wss\.clients[\s\S]{0,100}\n/s,
  ''
)

fs.writeFileSync('server.js', server)
console.log('✓ server.js WebSocket server removed')

// ── 3. Verify ──────────────────────────────────────────────
const updatedServer = fs.readFileSync('server.js', 'utf8')
const updatedHook = fs.readFileSync('src/hooks/useCallEvents.js', 'utf8')

console.log('\nVerify:')
console.log('server.js has WebSocketServer:', updatedServer.includes('WebSocketServer'))
console.log('server.js has wss:', updatedServer.includes('const wss'))
console.log('useCallEvents uses polling:', updatedHook.includes('POLL_INTERVAL'))
console.log('useCallEvents has no WebSocket:', !updatedHook.includes('new WebSocket'))
