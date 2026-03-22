'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { TransactionTable } from '@/components/TransactionTable'
import { TransactionForm } from '@/components/TransactionForm'
import type { Transaction, Account, Category } from '@/types/database'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [txR, accR, catR] = await Promise.all([
      supabase.from('transactions').select('*, categories(name), accounts!account_id(name)').order('date', { ascending: false }).limit(100),
      supabase.from('accounts').select('*'),
      supabase.from('categories').select('*').order('name'),
    ])
    setTransactions(txR.data ?? [])
    setAccounts(accR.data ?? [])
    setCategories(catR.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = transactions.filter((t) => t.description.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Transactions
        </h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add Transaction'}
        </button>
      </div>

      {showForm && (
        <div className="card fade-in" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>New Transaction</h2>
          <TransactionForm accounts={accounts} categories={categories} onSaved={() => { setShowForm(false); load() }} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '0.875rem', pointerEvents: 'none' }}>⌕</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions…" className="input" style={{ paddingLeft: '36px' }} />
      </div>

      {!loading && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}{search && ` matching "${search}"`}
        </p>
      )}

      {loading
        ? <div className="card" style={{ padding: '48px', textAlign: 'center' }}><p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Loading…</p></div>
        : <TransactionTable transactions={filtered} categories={categories} accounts={accounts} onUpdated={load} />
      }
    </div>
  )
}
