'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const { data: signupData, error: authError } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (authError) { setError(authError.message); return }
    if (!signupData.session) {
      // Email confirmation required — no session yet
      setSuccess('Account created! Check your email to confirm your address before signing in.')
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <p className="nav-wordmark" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Ledger</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Create your account</p>
      </div>

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

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="input"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Confirm password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
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

        {success && (
          <p style={{ fontSize: '0.8rem', color: 'var(--income)', background: '#F0FDF4', padding: '8px 12px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
            {success}
          </p>
        )}

        <button type="submit" disabled={loading || !!success} className="btn-primary" style={{ width: '100%', justifyContent: 'center', display: 'flex', marginTop: '4px' }}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
          Sign in
        </Link>
      </p>
    </div>
  )
}
