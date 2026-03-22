'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Category, BudgetPeriod } from '@/types/database'

interface Props { categories: Category[]; onSaved: () => void; onCancel: () => void }

export function BudgetForm({ categories, onSaved, onCancel }: Props) {
  const expenseCats = categories.filter((c) => c.type === 'expense')
  const [form, setForm] = useState({
    category_id: expenseCats[0]?.id ?? '',
    amount: '', period: 'monthly' as BudgetPeriod,
    anchor_date: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category_id) { setError('Please select a category'); return }
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setSaving(false); return }
    const { error: err } = await supabase.from('budgets').insert({
      ...form, amount: parseFloat(form.amount), active: true, user_id: user.id,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  const label = (text: string, hint?: string) => (
    <div style={{ marginBottom: '5px' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{text}</label>
      {hint && <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginLeft: '6px' }}>{hint}</span>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {error && <p style={{ fontSize: '0.8rem', color: 'var(--expense)', background: '#FEF2F2', padding: '8px 12px', borderRadius: '6px' }}>{error}</p>}
      <div>
        {label('Category')}
        <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input" disabled={expenseCats.length === 0}>
          {expenseCats.length === 0 ? <option>No expense categories</option> : expenseCats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          {label('Budget Amount')}
          <input type="number" step="0.01" min="1" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input mono" placeholder="0.00" />
        </div>
        <div>
          {label('Period')}
          <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value as BudgetPeriod })} className="input">
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>
      <div>
        {label('Start Date', '— first day of first period')}
        <input type="date" required value={form.anchor_date} onChange={(e) => setForm({ ...form, anchor_date: e.target.value })} className="input" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={saving || expenseCats.length === 0} className="btn-primary">{saving ? 'Saving…' : 'Save Budget'}</button>
      </div>
    </form>
  )
}
