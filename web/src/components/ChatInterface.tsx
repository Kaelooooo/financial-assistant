'use client'
import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { streamChat } from '@/lib/ai-client'
import type { AIMessage } from '@/types/database'

interface Props {
  conversationId: string | null
  initialMessages: AIMessage[]
  aiAvailable: boolean
  onConversationCreated?: (id: string) => void
}

export function ChatInterface({ conversationId, initialMessages, aiAvailable, onConversationCreated }: Props) {
  const [messages, setMessages] = useState(initialMessages.map((m) => ({ role: m.role, content: m.content })))
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [currentConvId, setCurrentConvId] = useState(conversationId)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || streaming || !aiAvailable) return
    const userMessage = input.trim()
    setInput(''); setError('')
    setMessages((prev) => [...prev, { role: 'user' as const, content: userMessage }])
    setStreaming(true)
    setMessages((prev) => [...prev, { role: 'assistant' as const, content: '' }])
    try {
      let full = ''
      for await (const chunk of streamChat(userMessage, currentConvId, (id) => {
        setCurrentConvId(id); onConversationCreated?.(id)
      })) {
        full += chunk
        setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: full }; return u })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed. Please try again.')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setStreaming(false); inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: '8px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Ask me about your finances</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Spending trends · Budget advice · Tax tips · Savings goals</p>
          </div>
        )}
        {messages.map((m, i) => {
          const isStreamingMessage = streaming && i === messages.length - 1 && m.role === 'assistant'
          return (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                fontSize: '0.875rem', lineHeight: 1.6,
                background: m.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                boxShadow: m.role === 'assistant' ? 'var(--shadow-sm)' : 'none',
              }}>
                {m.role === 'user' ? (
                  <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                ) : m.content ? (
                  <div className="markdown-body">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                    {isStreamingMessage && <span className="streaming-cursor" />}
                  </div>
                ) : isStreamingMessage ? (
                  <span className="typing-dots">
                    <span /><span /><span />
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p style={{ fontSize: '0.8rem', color: 'var(--expense)', background: '#FEF2F2', padding: '8px 12px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #FECACA' }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)', alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!aiAvailable || streaming}
          placeholder={aiAvailable ? 'Ask about your finances…' : 'AI service unavailable'}
          rows={1}
          className="input"
          style={{ resize: 'none', minHeight: '42px', maxHeight: '120px', overflowY: 'auto', fontFamily: 'inherit' }}
        />
        <button type="submit" disabled={!aiAvailable || streaming || !input.trim()} className="btn-primary" style={{ flexShrink: 0, height: '42px' }}>
          {streaming ? '…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
