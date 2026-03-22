'use client'
import { useEffect, useState } from 'react'
import { checkAIHealth } from '@/lib/ai-client'
import { supabase } from '@/lib/supabase'
import { ChatInterface } from '@/components/ChatInterface'
import type { AIConversation, AIMessage } from '@/types/database'

export default function ChatPage() {
  const [aiAvailable, setAIAvailable] = useState(true)
  const [conversations, setConversations] = useState<AIConversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [chatKey, setChatKey] = useState(0)

  useEffect(() => {
    checkAIHealth().then(setAIAvailable)
    loadConversations()
  }, [])

  async function loadConversations() {
    const { data } = await supabase.from('ai_conversations').select('*').order('created_at', { ascending: false }).limit(20)
    setConversations(data ?? [])
  }

  async function loadConversation(id: string) {
    const { data } = await supabase.from('ai_messages').select('*').eq('conversation_id', id).order('created_at')
    setMessages(data ?? [])
    setActiveConvId(id)
    setChatKey((k) => k + 1)
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await supabase.from('ai_conversations').delete().eq('id', id)
    if (activeConvId === id) { setActiveConvId(null); setMessages([]); setChatKey((k) => k + 1) }
    setConversations((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 136px)' }}>
      {/* Sidebar */}
      <aside style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button
          onClick={() => { setActiveConvId(null); setMessages([]); setChatKey((k) => k + 1) }}
          className="btn-primary"
          style={{ width: '100%', marginBottom: '8px', justifyContent: 'center', display: 'flex' }}
        >
          + New Chat
        </button>
        {conversations.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', padding: '8px 4px' }}>No conversations yet</p>
        ) : (
          conversations.map((c) => (
            <div key={c.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
              onMouseEnter={(e) => { const btn = e.currentTarget.querySelector<HTMLElement>('.del-btn'); if (btn) btn.style.opacity = '1' }}
              onMouseLeave={(e) => { const btn = e.currentTarget.querySelector<HTMLElement>('.del-btn'); if (btn) btn.style.opacity = '0' }}
            >
              <button onClick={() => loadConversation(c.id)} style={{
                flex: 1, textAlign: 'left', padding: '8px 28px 8px 12px', borderRadius: '8px',
                fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                cursor: 'pointer', border: 'none',
                background: activeConvId === c.id ? 'var(--accent-light)' : 'transparent',
                color: activeConvId === c.id ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activeConvId === c.id ? 600 : 400,
                transition: 'background 0.1s ease',
              }}>
                {c.title ?? 'Untitled'}
              </button>
              <button className="del-btn" onClick={(e) => deleteConversation(c.id, e)} title="Delete conversation" style={{
                position: 'absolute', right: '6px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-tertiary)', padding: '3px', borderRadius: '4px',
                opacity: 0, transition: 'opacity 0.15s ease',
                display: 'flex', alignItems: 'center',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          ))
        )}
      </aside>

      {/* Chat */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', minWidth: 0 }}>
        {!aiAvailable && (
          <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--expense)' }}>
            The AI assistant is currently unavailable. Your financial data is unaffected.
          </div>
        )}
        <ChatInterface
          key={chatKey}
          conversationId={activeConvId}
          initialMessages={messages}
          aiAvailable={aiAvailable}
          onConversationCreated={(id) => { setActiveConvId(id); loadConversations() }}
        />
      </div>
    </div>
  )
}
