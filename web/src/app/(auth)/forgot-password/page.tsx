'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  return (
    <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <p className="nav-wordmark" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Ledger</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Reset your password</p>
      </div>

      {sent ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--income)', background: '#F0FDF4', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            Check your email for a password reset link.
          </p>
          <Link href="/login" style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input"
              style={{ width: '100%' }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '0.8rem', color: 'var(--expense)', background: '#FEF2F2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #FECACA' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', display: 'flex', marginTop: '4px' }}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  )
}
