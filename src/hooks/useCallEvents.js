import { useEffect, useRef, useState, useCallback } from 'react'

const POLL_INTERVAL = 4000 // 4 seconds

export function useCallEvents(onEvent) {
  const [connected, setConnected] = useState(false)
  const onEventRef = useRef(onEvent)
  const lastTsRef = useRef(Date.now())
  const timerRef = useRef(null)

  useEffect(() => { onEventRef.current = onEvent }, [onEvent])

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/events?since=' + lastTsRef.current)
      if (!res.ok) throw new Error('poll failed')
      const { events, serverTime } = await res.json()
      setConnected(true)
      lastTsRef.current = serverTime || Date.now()

      if (events && events.length > 0) {
        events.forEach(({ type, data }) => {
          onEventRef.current && onEventRef.current(type, data)
        })
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[useCallEvents] poll error:', e)
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    poll()
    timerRef.current = setInterval(poll, POLL_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [poll])

  return { connected }
}
