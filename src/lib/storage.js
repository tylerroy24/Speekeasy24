const KEY = 'speekeasy_settings'
const CALLS_KEY = 'speekeasy_calls'
const AGENTS_KEY = 'speekeasy_agents'

export const storage = {
  getSettings: () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') }
    catch { return {} }
  },
  saveSettings: (data) => {
    localStorage.setItem(KEY, JSON.stringify(data))
  },
  getCalls: () => {
    try { return JSON.parse(localStorage.getItem(CALLS_KEY) || '[]') }
    catch { return [] }
  },
  saveCalls: (calls) => {
    localStorage.setItem(CALLS_KEY, JSON.stringify(calls))
  },
  addCall: (call) => {
    const calls = storage.getCalls()
    calls.unshift({ ...call, id: Date.now(), timestamp: new Date().toISOString() })
    storage.saveCalls(calls.slice(0, 200)) // keep last 200
    return calls[0]
  },
  updateCall: (id, updates) => {
    const calls = storage.getCalls()
    const idx = calls.findIndex(c => c.id === id)
    if (idx !== -1) {
      calls[idx] = { ...calls[idx], ...updates }
      storage.saveCalls(calls)
    }
  },
  getAgents: () => {
    try { return JSON.parse(localStorage.getItem(AGENTS_KEY) || '[]') }
    catch { return [] }
  },
  saveAgents: (agents) => {
    localStorage.setItem(AGENTS_KEY, JSON.stringify(agents))
  },
}
