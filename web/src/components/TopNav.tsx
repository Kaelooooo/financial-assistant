'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { AIStatusBadge } from './AIStatusBadge'

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/budgets', label: 'Budgets' },
  { href: '/import', label: 'Import' },
]

export function TopNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })
  }, [])

  async function handleLogout() {
    setEmail('')
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '32px',
      height: '56px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <Link href="/" className="nav-wordmark">Ledger</Link>

      <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
        {NAV_LINKS.map((l) => {
          const isActive = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
          return <Link key={l.href} href={l.href} className={`nav-link ${isActive ? 'nav-link-active' : ''}`}>{l.label}</Link>
        })}
      </div>

      <AIStatusBadge />
      <Link href="/chat" className={`nav-ask-ai ${pathname.startsWith('/chat') ? 'nav-link-active' : ''}`}>Ask AI</Link>

      {email && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {email}
        </span>
      )}
      <button onClick={handleLogout} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
        Log out
      </button>
    </nav>
  )
}
