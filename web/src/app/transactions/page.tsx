'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { TransactionTable } from '@/components/TransactionTable'
import { TransactionForm } from '@/components/TransactionForm'
import type { Transaction, Account, Category, TransactionType } from '@/types/database'

const PAGE_SIZE = 25

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterType, setFilterType] = useState<TransactionType | ''>('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAccount, setFilterAccount] = useState('')

  // Pagination
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)

    // Load accounts and categories (unfiltered)
    const [accR, catR] = await Promise.all([
      supabase.from('accounts').select('*'),
      supabase.from('categories').select('*').order('name'),
    ])
    setAccounts(accR.data ?? [])
    setCategories(catR.data ?? [])

    // Build transaction query with filters
    let query = supabase.from('transactions')
      .select('*, categories(name), accounts!account_id(name)', { count: 'exact' })
      .order('date', { ascending: false })

    if (dateFrom) query = query.gte('date', dateFrom)
    if (dateTo) query = query.lte('date', dateTo)
    if (filterType) query = query.eq('type', filterType)
    if (filterCategory) query = query.eq('category_id', filterCategory)
    if (filterAccount) query = query.eq('account_id', filterAccount)
    if (search) query = query.ilike('description', `%${search}%`)

    // Pagination
    const from = page * PAGE_SIZE
    query = query.range(from, from + PAGE_SIZE - 1)

    const txR = await query
    setTransactions(txR.data ?? [])
    setTotalCount(txR.count ?? 0)
    setLoading(false)
  }, [dateFrom, dateTo, filterType, filterCategory, filterAccount, search, page])

  useEffect(() => { load() }, [load])

  // Reset to page 0 when filters change
  useEffect(() => { setPage(0) }, [dateFrom, dateTo, filterType, filterCategory, filterAccount, search])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const clearFilters = () => {
    setDateFrom(''); setDateTo(''); setFilterType(''); setFilterCategory(''); setFilterAccount(''); setSearch('')
  }

  const hasFilters = dateFrom || dateTo || filterType || filterCategory || filterAccount || search

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

      {/* Search + Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '0.875rem', pointerEvents: 'none' }}>⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions…" className="input" style={{ paddingLeft: '36px' }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" style={{ width: 'auto', fontSize: '0.8rem' }} placeholder="From" />
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" style={{ width: 'auto', fontSize: '0.8rem' }} placeholder="To" />

          <select value={filterType} onChange={(e) => setFilterType(e.target.value as TransactionType | '')} className="input" style={{ width: 'auto', fontSize: '0.8rem' }}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>

          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input" style={{ width: 'auto', fontSize: '0.8rem' }}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon ?? ''} {c.name}</option>)}
          </select>

          <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="input" style={{ width: 'auto', fontSize: '0.8rem' }}>
            <option value="">All accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {!loading && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
          {totalCount} transaction{totalCount !== 1 ? 's' : ''}{hasFilters ? ' (filtered)' : ''}
        </p>
      )}

      {loading
        ? <div className="card" style={{ padding: '48px', textAlign: 'center' }}><p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Loading…</p></div>
        : <TransactionTable transactions={transactions} categories={categories} accounts={accounts} onUpdated={load} />
      }

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', paddingTop: '4px' }}>
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="btn-ghost"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="btn-ghost"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
