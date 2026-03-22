'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { checkAIHealth, categorizeTransactions } from '@/lib/ai-client'
import { parseFile } from '@/lib/import-parser'
import { ImportReviewTable } from '@/components/ImportReviewTable'
import type { ParsedTransaction, Category } from '@/types/database'

type Step = 'upload' | 'review' | 'done'
interface Account { id: string; name: string }

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload')
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [rows, setRows] = useState<ParsedTransaction[]>([])
  const [fileName, setFileName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [aiAvailable, setAIAvailable] = useState(true)
  const [parsing, setParsing] = useState(false)

  const [mounted, setMounted] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountType, setNewAccountType] = useState('cash')
  const [addingAccount, setAddingAccount] = useState(false)
  const [addAccountError, setAddAccountError] = useState('')

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault()
    setAddingAccount(true)
    setAddAccountError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAddingAccount(false); setAddAccountError('Not logged in.'); return }
    const { data, error: err } = await supabase.from('accounts')
      .insert({ name: newAccountName.trim(), type: newAccountType, currency: 'PHP', user_id: user.id })
      .select('id, name').single()
    setAddingAccount(false)
    if (err || !data) { setAddAccountError(err?.message ?? 'Failed to create account'); return }
    const updated = [...accounts, data]
    setAccounts(updated)
    setSelectedAccountId(data.id)
    setNewAccountName('')
    setNewAccountType('cash')
    setShowAddAccount(false)
  }

  useEffect(() => {
    setMounted(true)
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data ?? []))
    supabase.from('accounts').select('id, name').order('name').then(({ data }) => {
      const list = data ?? []; setAccounts(list)
      if (list.length > 0) setSelectedAccountId(list[0].id)
    })
    checkAIHealth().then(setAIAvailable)
  }, [])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setFileName(file.name); setError(''); setParsing(true)
    try {
      const parsed = await parseFile(file)
      const withIds: ParsedTransaction[] = parsed.map((r, i) => ({ ...r, row_id: i }))
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const { data: existing } = await supabase.from('transactions').select('date, amount, description').eq('user_id', authUser?.id ?? '')
      const existingSet = new Set((existing ?? []).map((r) => `${r.date}|${r.amount}|${r.description}`))
      const withDupes = withIds.map((r) => ({ ...r, is_duplicate: existingSet.has(`${r.date}|${r.amount}|${r.description}`) }))
      // Match raw_category from CSV to actual category IDs (case-insensitive)
      const catByName = Object.fromEntries(categories.map((c) => [c.name.toLowerCase(), c.id]))
      const withCsvCats = withDupes.map((r) => {
        if (r.raw_category) {
          const matchedId = catByName[r.raw_category.toLowerCase()]
          if (matchedId) return { ...r, category_id: matchedId }
        }
        return r
      })
      // AI categorization for rows that don't already have a category
      const uncategorized = withCsvCats.filter((r) => !r.category_id)
      if (aiAvailable && uncategorized.length > 0) {
        try {
          const results = await categorizeTransactions(uncategorized)
          setRows(withCsvCats.map((r) => {
            if (r.category_id) return r
            const match = results.find((res) => res.row_id === r.row_id)
            return { ...r, category_id: match ? catByName[match.suggested_category.toLowerCase()] : undefined }
          }))
        } catch { setRows(withCsvCats) }
      } else { setRows(withCsvCats) }
      setStep('review')
    } catch (err) { setError(`Failed to parse file: ${String(err)}`) }
    finally { setParsing(false) }
  }

  async function handleConfirm() {
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setError('Not logged in.'); return }
    const { data: importRecord, error: importErr } = await supabase.from('imports')
      .insert({ filename: fileName, format: fileName.endsWith('.ofx') || fileName.endsWith('.qfx') ? 'ofx' : 'csv', row_count: rows.length, status: 'pending', user_id: user.id })
      .select().single()
    if (importErr || !importRecord) { setSaving(false); setError(importErr?.message ?? 'Failed to create import record'); return }
    if (!selectedAccountId) { setSaving(false); setError('Please create an account before importing.'); return }
    const { error: insertErr } = await supabase.from('transactions').insert(
      rows.map((r) => ({ date: r.date, amount: r.amount, description: r.description, type: r.type, account_id: selectedAccountId, category_id: r.category_id ?? null, import_id: importRecord.id, user_id: user.id }))
    )
    if (insertErr) { await supabase.from('imports').update({ status: 'failed', error_message: insertErr.message }).eq('id', importRecord.id); setSaving(false); setError(insertErr.message); return }
    await supabase.from('imports').update({ status: 'done' }).eq('id', importRecord.id)
    setSaving(false); setStep('done')
  }

  if (step === 'done') {
    return (
      <div className="fade-up" style={{ textAlign: 'center', padding: '80px 32px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px', color: 'var(--income)' }}>✓</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          {rows.length} transactions imported
        </h2>
        <a href="/transactions" style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
          View transactions →
        </a>
      </div>
    )
  }

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
        Import Transactions
      </h1>

      {!aiAvailable && (
        <div style={{ padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '0.875rem', color: '#92400E' }}>
          AI unavailable — categories won't be auto-suggested. You can assign them manually.
        </div>
      )}
      {error && <p style={{ fontSize: '0.875rem', color: 'var(--expense)', background: '#FEF2F2', padding: '10px 14px', borderRadius: '8px', border: '1px solid #FECACA' }}>{error}</p>}

      {step === 'upload' && (
        <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {mounted && <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {accounts.length > 0 && (
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>Import to account</label>
                <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="input" style={{ maxWidth: '280px' }}>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ paddingTop: accounts.length > 0 ? '20px' : '0' }}>
              <button onClick={() => setShowAddAccount(true)} className="btn-ghost" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                + Add account
              </button>
            </div>
          </div>}

          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
            border: `2px dashed var(--border)`, borderRadius: '10px', padding: '48px 32px',
            cursor: !mounted || accounts.length === 0 ? 'not-allowed' : 'pointer', opacity: !mounted || accounts.length === 0 ? 0.6 : 1,
            transition: 'border-color 0.15s ease',
          }}>
            {parsing ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Parsing file…</p>
            ) : (
              <>
                <span style={{ fontSize: '2rem' }}>📂</span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Upload a CSV or OFX/QFX bank export
                  {' · '}
                  <a href="/template.csv" download style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Download CSV template</a>
                </p>
                {!mounted || accounts.length === 0
                  ? <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Add an account above to get started</p>
                  : <span className="btn-primary" style={{ pointerEvents: 'none', padding: '8px 16px' }}>Choose File</span>
                }
              </>
            )}
            <input type="file" accept=".csv,.ofx,.qfx" style={{ display: 'none' }} disabled={!mounted || accounts.length === 0 || parsing} onChange={handleFileUpload} />
          </label>

          {showAddAccount && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowAddAccount(false) }}>
              <div className="card" style={{ width: '100%', maxWidth: '360px', padding: '32px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>Add account</h3>
                <form onSubmit={handleAddAccount} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>Name</label>
                    <input value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} required placeholder="e.g. BDO Checking, GCash" className="input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>Type</label>
                    <select value={newAccountType} onChange={(e) => setNewAccountType(e.target.value)} className="input" style={{ width: '100%' }}>
                      <option value="cash">Cash</option>
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                  {addAccountError && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--expense)', background: '#FEF2F2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #FECACA' }}>
                      {addAccountError}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button type="button" onClick={() => { setShowAddAccount(false); setAddAccountError('') }} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                    <button type="submit" disabled={addingAccount} className="btn-primary" style={{ flex: 1, justifyContent: 'center', display: 'flex' }}>
                      {addingAccount ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{rows.length}</strong> transactions from <strong style={{ color: 'var(--text-primary)' }}>{fileName}</strong>
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setStep('upload')} className="btn-ghost">Back</button>
              <button onClick={handleConfirm} disabled={saving} className="btn-primary">
                {saving ? 'Importing…' : `Confirm (${rows.length})`}
              </button>
            </div>
          </div>
          <ImportReviewTable rows={rows} categories={categories} onChange={setRows} />
        </div>
      )}
    </div>
  )
}
