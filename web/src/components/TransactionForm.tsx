'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account, Category, TransactionType } from '@/types/database'

interface Props {
  accounts: Account[]
  categories: Category[]
  onSaved: () => void
  onCancel: () => void
}

export function TransactionForm({ accounts, categories, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: '', description: '',
    type: 'expense' as TransactionType,
    account_id: accounts[0]?.id ?? '',
    to_account_id: '', category_id: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setSaving(false); return }
    const { error: err } = await supabase.from('transactions').insert({
      date: form.date, amount: parseFloat(form.amount),
      description: form.description, type: form.type,
      account_id: form.account_id, notes: form.notes || null,
      category_id: form.type !== 'transfer' && form.category_id ? form.category_id : null,
      to_account_id: form.type === 'transfer' ? form.to_account_id : null,
      user_id: user.id,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  const relevantCats = categories.filter((c) => c.type === (form.type === 'income' ? 'income' : 'expense'))

  const label = (text: string) => (
    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>
      {text}
    </label>
  )

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {error && (
        <p style={{ fontSize: '0.8rem', color: 'var(--expense)', background: '#FEF2F2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #FECACA' }}>
          {error}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>{label('Date')}<input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" /></div>
        <div>{label('Amount')}<input type="number" step="0.01" min="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input mono" placeholder="0.00" /></div>
      </div>
      <div>{label('Description')}<input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" placeholder="What was this for?" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          {label('Type')}
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType })} className="input">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        <div>
          {label('Account')}
          <select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="input">
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      {form.type === 'transfer' ? (
        <div>
          {label('To Account')}
          <select required value={form.to_account_id} onChange={(e) => setForm({ ...form, to_account_id: e.target.value })} className="input">
            <option value="">Select destination…</option>
            {accounts.filter((a) => a.id !== form.account_id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      ) : (
        <div>
          {label('Category')}
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input">
            <option value="">No category</option>
            {relevantCats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}
