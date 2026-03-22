'use client'
import { useEffect, useState } from 'react'
import { checkAIHealth } from '@/lib/ai-client'

export function AIStatusBadge() {
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => { checkAIHealth().then(setOnline) }, [])

  if (online === null) return null

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '0.75rem',
      color: online ? 'var(--income)' : 'var(--text-tertiary)',
      fontWeight: 500,
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: online ? 'var(--income)' : 'var(--border-strong)',
        flexShrink: 0,
      }} />
      {online ? 'AI Online' : 'AI Offline'}
    </span>
  )
}
