const cache = new Map()

export function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > entry.ttl) { cache.delete(key); return null }
  return entry.data
}

export function setCached(key, data, ttlMs = 60000) {
  cache.set(key, { data, ts: Date.now(), ttl: ttlMs })
}

export function invalidateCache(key) {
  if (key) cache.delete(key)
  else cache.clear()
}

import { useState, useEffect, useCallback } from 'react'

export function useCachedFetch(key, fetcher, ttlMs = 60000) {
  const [data, setData] = useState(() => getCached(key))
  const [loading, setLoading] = useState(!getCached(key))
  const [error, setError] = useState(null)
  const fetch_ = useCallback(async (force = false) => {
    if (!force) { const cached = getCached(key); if (cached) { setData(cached); setLoading(false); return } }
    setLoading(true); setError(null)
    try { const result = await fetcher(); setCached(key, result, ttlMs); setData(result) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [key, ttlMs])
  useEffect(() => { fetch_() }, [fetch_])
  return { data, loading, error, refresh: () => fetch_(true) }
}
