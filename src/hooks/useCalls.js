// useCalls — async-safe wrapper around storage.getCalls()
// Works with both Supabase (async) and localStorage (sync) backends
import { useState, useEffect, useCallback } from 'react'
import { storage } from '../lib/storage'

export function useCalls() {
  const [calls, setCalls] = useState([])

  const refresh = useCallback(async () => {
    const result = await Promise.resolve(storage.getCalls())
    setCalls(result)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const addCall = useCallback(async (call) => {
    await Promise.resolve(storage.addCall(call))
    await refresh()
  }, [refresh])

  const updateCall = useCallback(async (id, updates) => {
    await Promise.resolve(storage.updateCall(id, updates))
    await refresh()
  }, [refresh])

  const clearCalls = useCallback(async () => {
    await Promise.resolve(storage.saveCalls([]))
    setCalls([])
  }, [])

  return { calls, refresh, addCall, updateCall, clearCalls }
}
