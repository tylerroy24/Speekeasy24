// ElevenLabs API integration
// Docs: https://elevenlabs.io/docs/api-reference

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'

export function useElevenLabs(apiKey) {
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  }

  const req = async (path, opts = {}) => {
    if (!apiKey) throw new Error('No ElevenLabs API key configured')
    const res = await fetch(`${ELEVENLABS_BASE}${path}`, { headers, ...opts })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail?.message || `ElevenLabs error: ${res.status}`)
    }
    if (res.status === 204) return true
    return res.json()
  }

  // ── Voices ────────────────────────────────────────────────
  const getVoices = async () => {
    const data = await req('/voices')
    return data.voices || []
  }

  // ── Agents ────────────────────────────────────────────────
  const getAgents = async () => {
    const data = await req('/convai/agents')
    return data.agents || []
  }

  const getAgent = async (agentId) => {
    return req(`/convai/agents/${agentId}`)
  }

  const createAgent = async ({ name, prompt, voiceId, firstMessage }) => {
    return req('/convai/agents/create', {
      method: 'POST',
      body: JSON.stringify({
        name,
        conversation_config: {
          agent: {
            prompt: {
              prompt,
              llm: 'claude-sonnet-4-5',
              temperature: 0.7,
            },
            first_message: firstMessage || `Hi! This is ${name}. How can I help you today?`,
            language: 'en',
          },
          tts: {
            voice_id: voiceId,
            model_id: 'eleven_turbo_v2_5',
          },
        },
      }),
    })
  }

  const deleteAgent = async (agentId) => {
    return req(`/convai/agents/${agentId}`, { method: 'DELETE' })
  }

  // ── Phone Numbers ─────────────────────────────────────────
  const getPhoneNumbers = async () => {
    const data = await req('/convai/phone-numbers')
    // ElevenLabs returns a plain array, not a nested object
    return Array.isArray(data) ? data : data.phone_numbers || []
  }

  // Assign an inbound agent to a phone number
  const assignInboundAgent = async (phoneNumberId, agentId) => {
    return req(`/convai/phone-numbers/${phoneNumberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ agent_id: agentId }),
    })
  }

  // ── Outbound Calls ────────────────────────────────────────
  const initiateOutboundCall = async ({ agentId, toNumber, fromNumberId }) => {
    return req('/convai/twilio/outbound_call', {
      method: 'POST',
      body: JSON.stringify({
        agent_id: agentId,
        agent_phone_number_id: fromNumberId,
        to_number: toNumber,
      }),
    })
  }

  // ── Conversations (call history from EL) ─────────────────
  const getConversations = async ({ agentId, limit = 50 } = {}) => {
    const params = new URLSearchParams({ page_size: limit })
    if (agentId) params.set('agent_id', agentId)
    const data = await req(`/convai/conversations?${params}`)
    return data.conversations || []
  }

  const getConversation = async (conversationId) => {
    return req(`/convai/conversations/${conversationId}`)
  }

  // ── Validate key ──────────────────────────────────────────
  const validateKey = async () => {
    if (!apiKey) return { valid: false, error: 'No key provided' }
    try {
      const res = await fetch(`${ELEVENLABS_BASE}/user`, {
        headers,
        mode: 'cors',
      })
      if (res.ok) return { valid: true }
      const body = await res.json().catch(() => ({}))
      return { valid: false, error: body.detail?.message || `HTTP ${res.status}` }
    } catch (e) {
      // CORS or network error -- try voices endpoint as fallback
      try {
        const res2 = await fetch(`${ELEVENLABS_BASE}/voices`, { headers })
        if (res2.ok) return { valid: true }
      } catch {}
      return { valid: false, error: e.message }
    }
  }

  return {
    getVoices,
    getAgents,
    getAgent,
    createAgent,
    deleteAgent,
    getPhoneNumbers,
    assignInboundAgent,
    initiateOutboundCall,
    getConversations,
    getConversation,
    validateKey,
  }
}
