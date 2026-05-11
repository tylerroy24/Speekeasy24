// ElevenLabs API - all calls go through our backend proxy
// The ElevenLabs API key is stored server-side only (ELEVENLABS_API_KEY env var)
// This file never holds or exposes the API key
import { supabase } from './supabase'

const API_BASE = '/api/el'

// BUG-002: resolve the Supabase JWT live on every request. Trusting a
// token captured at hook-mount time produces 401s after silent refreshes,
// and several call sites used to hand in the ElevenLabs UI key instead
// of a JWT entirely. Going through supabase.auth.getSession() fixes both.
async function getAuthHeader() {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: 'Bearer ' + token } : {}
  } catch {
    return {}
  }
}

async function req(path, opts = {}) {
  const authHeader = await getAuthHeader()
  const headers = {
    'Content-Type': 'application/json',
    ...authHeader,
    ...(opts.headers || {}),
  }

  const res = await fetch(API_BASE + path, { ...opts, headers })

  if (res.status === 204) return true

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'API error ' + res.status)
  }
  return data
}

export function useElevenLabs() {
  const call = (path, opts) => req(path, opts)

  const getVoices = () => call('/voices')

  const getAgents = async () => {
    // SEC-005: public GET /api/el/agents no longer exists. Always go
    // through /agents/mine so we only see the caller's own agents.
    const data = await call('/agents/mine')
    return data.agents || []
  }

  const getPhoneNumbers = async () => {
    const data = await call('/phone-numbers')
    return Array.isArray(data) ? data : data.phone_numbers || []
  }

  const createAgent = async ({ name, prompt, voiceId, firstMessage }) => {
    const agent = await call('/agents', {
      method: 'POST',
      body: JSON.stringify({
        name,
        conversation_config: {
          agent: {
            prompt: { prompt, llm: 'claude-sonnet-4-5', temperature: 0.7 },
            first_message: firstMessage || 'Hi! This is ' + name + '. How can I help you today?',
            language: 'en',
          },
          tts: { voice_id: voiceId, model_id: 'eleven_turbo_v2_5' },
        },
      }),
    })
    // Register ownership so this user sees their agent
    if (agent?.agent_id) {
      await call('/agents/' + agent.agent_id + '/register', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }).catch(() => {})
    }
    return agent
  }

  const deleteAgent = (agentId) =>
    call('/agents/' + agentId, { method: 'DELETE' })

  const assignInboundAgent = (phoneNumberId, agentId) =>
    call('/phone-numbers/' + phoneNumberId, {
      method: 'PATCH',
      body: JSON.stringify({ agent_id: agentId }),
    })

  const initiateOutboundCall = ({ agentId, toNumber, fromNumberId }) =>
    call('/call', {
      method: 'POST',
      body: JSON.stringify({
        agent_id: agentId,
        agent_phone_number_id: fromNumberId,
        to_number: toNumber,
      }),
    })

  const getConversations = async ({ agentId, limit = 50 } = {}) => {
    const params = new URLSearchParams({ page_size: limit })
    if (agentId) params.set('agent_id', agentId)
    const data = await call('/conversations?' + params)
    return data.conversations || []
  }

  // Validate by trying to fetch voices through the proxy
  const validateKey = async () => {
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/el/voices', { headers })
      if (res.ok) return { valid: true }
      const body = await res.json().catch(() => ({}))
      return { valid: false, error: body.error || 'HTTP ' + res.status }
    } catch (e) {
      return { valid: false, error: e.message }
    }
  }

  return {
    getVoices,
    getAgents,
    getPhoneNumbers,
    createAgent,
    deleteAgent,
    assignInboundAgent,
    initiateOutboundCall,
    getConversations,
    validateKey,
  }
}
