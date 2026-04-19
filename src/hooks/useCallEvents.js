import { useEffect, useRef, useCallback, useState } from 'react'

// In dev, Vite proxies /ws to the backend so we use same origin
// In production, use the WS URL from env or same host
function getWsUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return proto + '//' + host + '/ws'
}

export function useCallEvents(onEvent) {
  const ws = useRef(null)
  const reconnectTimer = useRef(null)
  const onEventRef = useRef(onEvent)
  const [connected, setConnected] = useState(false)

  useEffect(() => { onEventRef.current = onEvent }, [onEvent])

  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return
    try {
      const url = getWsUrl()
      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        setConnected(true)
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      }

      ws.current.onmessage = (msg) => {
        try {
          const { event, data } = JSON.parse(msg.data)
          if (event !== 'connected') onEventRef.current && onEventRef.current(event, data)
        } catch (e) {}
      }

      ws.current.onclose = () => {
        setConnected(false)
        reconnectTimer.current = setTimeout(connect, 3000)
      }

      ws.current.onerror = () => {
        if (ws.current) ws.current.close()
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (ws.current) ws.current.close()
    }
  }, [connect])

  return { connected }
}
