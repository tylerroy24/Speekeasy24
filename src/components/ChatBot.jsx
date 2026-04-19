import React, { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { MessageSquare, X, Send, Bot, User, ChevronDown, Minimize2 } from 'lucide-react'

const SUGGESTIONS = [
  'How does outbound calling work?',
  'What is Speakeasy?',
  'How much does it cost?',
  'Can I upload a contact list?',
  'How do inbound calls work?',
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)',
            animation: 'wave 1s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
            display: 'inline-block',
          }}
        />
      ))}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={clsx('flex gap-2.5 mb-4', isUser && 'flex-row-reverse')}>
      <div className={clsx(
        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser ? 'bg-lime/20 border border-lime/30' : 'bg-panel border border-border'
      )}>
        {isUser
          ? <User size={13} className="text-lime" />
          : <Bot size={13} className="text-ghost" />
        }
      </div>
      <div className={clsx(
        'max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
        isUser
          ? 'bg-lime text-ink font-medium rounded-tr-sm'
          : 'bg-panel border border-border text-ghost rounded-tl-sm'
      )}>
        {msg.content}
      </div>
    </div>
  )
}

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m the Speekeasy assistant. Ask me anything about how our AI voice agent platform works.',
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasNewMsg, setHasNewMsg] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open, loading])

  useEffect(() => {
    if (open) {
      setHasNewMsg(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const sendMessage = async (text) => {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return
    setInput('')

    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await response.json()
      const reply = data.content?.[0]?.text || 'Sorry, I could not get a response. Please try again.'

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      if (!open) setHasNewMsg(true)
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I am having trouble connecting. Please make sure the backend server is running.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Chat window */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 88,
            right: 24,
            width: 360,
            height: minimized ? 56 : 520,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            transition: 'height 0.3s ease',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px',
            borderBottom: minimized ? 'none' : '1px solid var(--border)',
            background: 'var(--panel)',
            flexShrink: 0,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(200,245,58,0.15)',
              border: '1px solid rgba(200,245,58,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={16} color="var(--lime)" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', fontFamily: 'Syne, sans-serif' }}>
                Speekeasy Assistant
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', flexShrink: 0 }} className="status-pulse" />
                <span style={{ fontSize: 11, color: 'var(--ghost)', fontFamily: 'DM Mono, monospace' }}>Online</span>
              </div>
            </div>
            <button
              onClick={() => setMinimized(m => !m)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--subtle)', padding: 4 }}
            >
              {minimized ? <ChevronDown size={16} /> : <Minimize2 size={15} />}
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--subtle)', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px' }}>
                {messages.map((msg, i) => <Message key={i} msg={msg} />)}
                {loading && (
                  <div className="flex gap-2.5 mb-4">
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--panel)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Bot size={13} color="var(--ghost)" />
                    </div>
                    <div style={{
                      background: 'var(--panel)', border: '1px solid var(--border)',
                      borderRadius: '16px 16px 16px 4px',
                    }}>
                      <TypingIndicator />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Suggestions - only show if just the welcome message */}
              {messages.length === 1 && (
                <div style={{ padding: '0 14px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      style={{
                        background: 'var(--panel)', border: '1px solid var(--border)',
                        borderRadius: 99, padding: '5px 12px',
                        fontSize: 11, color: 'var(--ghost)', cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.target.style.borderColor = 'rgba(200,245,58,0.3)'; e.target.style.color = 'var(--lime)' }}
                      onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--ghost)' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div style={{
                padding: '10px 12px',
                borderTop: '1px solid var(--border)',
                display: 'flex', gap: 8, alignItems: 'flex-end',
                flexShrink: 0,
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask anything about Speakeasy..."
                  rows={1}
                  style={{
                    flex: 1, background: 'var(--ink)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '10px 14px', fontSize: 13,
                    color: 'var(--cream)', fontFamily: 'DM Sans, sans-serif',
                    resize: 'none', outline: 'none', lineHeight: 1.5,
                    maxHeight: 80, overflowY: 'auto',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--lime)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                    background: input.trim() && !loading ? 'var(--lime)' : 'var(--muted)',
                    border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                >
                  <Send size={15} color={input.trim() && !loading ? 'var(--ink)' : 'var(--subtle)'} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => { setOpen(o => !o); setHasNewMsg(false) }}
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? 'var(--muted)' : 'var(--lime)',
          border: 'none', cursor: 'pointer', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? 'none' : '0 8px 32px rgba(200,245,58,0.3)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open
          ? <X size={22} color="var(--cream)" />
          : <MessageSquare size={22} color="var(--ink)" />
        }
        {hasNewMsg && !open && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--coral)', border: '2px solid var(--ink)',
          }} />
        )}
      </button>
    </>
  )
}
