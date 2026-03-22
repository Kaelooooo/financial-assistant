'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError(''); setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <p className="nav-wordmark" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Ledger</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Set a new password</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            New Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="input"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Confirm Password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
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
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
