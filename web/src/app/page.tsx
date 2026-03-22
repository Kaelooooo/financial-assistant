'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getPeriodWindow } from '@/lib/budget-utils'
import type { BudgetPeriod } from '@/types/database'

interface Recent {
  id: string
  date: string
  amount: number
  description: string
  type: string
  categories: { name: string }[] | { name: string } | null
}

interface BudgetStatus {
  category: string
  spent: number
  limit: number
  pct: number
  over: boolean
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function DashboardPage() {
  const [netWorth, setNetWorth] = useState(0)
  const [monthlySpend, setMonthlySpend] = useState(0)
  const [recent, setRecent] = useState<Recent[]>([])
  const [budgets, setBudgets] = useState<BudgetStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const today = new Date()
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
      const todayStr = today.toISOString().slice(0, 10)

      const [balancesResult, spendingResult, recentResult, budgetsResult] = await Promise.all([
        supabase.from('account_balances').select('balance').eq('user_id', user.id),
        supabase.from('transactions').select('amount').eq('type', 'expense').gte('date', monthStart).lte('date', todayStr),
        supabase.from('transactions').select('id, date, amount, description, type, categories(name)').order('date', { ascending: false }).limit(8),
        supabase.from('budgets').select('id, category_id, amount, period, anchor_date, categories(name)').eq('active', true),
      ])

      setNetWorth((balancesResult.data ?? []).reduce((sum, r) => sum + Number(r.balance), 0))
      setMonthlySpend((spendingResult.data ?? []).reduce((sum, r) => sum + Number(r.amount), 0))
      setRecent((recentResult.data ?? []) as Recent[])

      // Compute budget statuses
      const budgetRows = budgetsResult.data ?? []
      const statuses: BudgetStatus[] = []
      for (const b of budgetRows) {
        const { windowStart, windowEnd } = getPeriodWindow(b.anchor_date, b.period as BudgetPeriod, today)
        const { data: spentRows } = await supabase.from('transactions').select('amount')
          .eq('type', 'expense').eq('category_id', b.category_id)
          .gte('date', windowStart.toISOString().slice(0, 10))
          .lte('date', windowEnd.toISOString().slice(0, 10))
        const spent = (spentRows ?? []).reduce((s, r) => s + Number(r.amount), 0)
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0
        const cat = b.categories as { name: string } | { name: string }[] | null
        const catName = Array.isArray(cat) ? cat[0]?.name : cat?.name ?? 'Unknown'
        statuses.push({ category: catName, spent, limit: b.amount, pct, over: spent > b.amount })
      }
      setBudgets(statuses.sort((a, b) => b.pct - a.pct))
      setLoading(false)
    }
    load()
  }, [])

  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ── Top metric row ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>

        <div className="card" style={{ padding: '24px' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Net Worth</p>
          <p className="mono display" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {loading ? '—' : `₱${fmt(netWorth)}`}
          </p>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Spent in {month}</p>
          <p className="mono display" style={{ fontSize: '2rem', fontWeight: 700, color: monthlySpend > 0 ? 'var(--expense)' : 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {loading ? '—' : `₱${fmt(monthlySpend)}`}
          </p>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Recent Transactions</p>
          <p className="mono display" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {loading ? '—' : recent.length}
          </p>
        </div>

      </div>

      {/* ── Budgets overview ──────────────────────────────────── */}
      {!loading && budgets.length > 0 && (
        <div className="card fade-up delay-1" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Budgets</h2>
            <Link href="/budgets" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Manage →
            </Link>
          </div>
          {budgets.map((b, i) => {
            const barColor = b.over ? 'var(--expense)' : b.pct >= 75 ? '#D97706' : 'var(--income)'
            const badgeBg = b.over ? '#FEF2F2' : b.pct >= 75 ? '#FFFBEB' : '#F0FDF4'
            const badgeColor = b.over ? 'var(--expense)' : b.pct >= 75 ? '#D97706' : 'var(--income)'
            const badgeText = b.over ? 'Over' : b.pct >= 75 ? `${Math.round(b.pct)}%` : 'On track'
            return (
              <div key={i} style={{
                padding: '14px 24px',
                borderBottom: i < budgets.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'center', gap: '16px',
              }}>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 600, padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap',
                  background: badgeBg, color: badgeColor, minWidth: '56px', textAlign: 'center',
                }}>
                  {badgeText}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {b.category}
                  </p>
                  <div style={{ height: '3px', background: 'var(--surface-dim)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${Math.min(b.pct, 100)}%`,
                      background: barColor, borderRadius: '2px',
                    }} />
                  </div>
                </div>
                <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  ₱{fmt(b.spent)} / ₱{fmt(b.limit)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Recent transactions ─────────────────────────────── */}
      <div className="card fade-up delay-2">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Recent Transactions</h2>
          <Link href="/transactions" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            View all →
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Loading…</p>
          </div>
        ) : recent.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No transactions yet</p>
            <Link href="/import" style={{ display: 'inline-block', marginTop: '12px', fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Import from bank →
            </Link>
          </div>
        ) : (
          recent.map((t, i) => (
            <div key={t.id} className="tx-row" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 24px',
              borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {t.description}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {t.date}
                  {(() => {
                    const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories
                    return cat?.name ? <> · {cat.name}</> : null
                  })()}
                </p>
              </div>
              <span className="mono" style={{
                fontSize: '0.875rem', fontWeight: 600, flexShrink: 0, marginLeft: '16px',
                color: t.type === 'income' ? 'var(--income)' : t.type === 'transfer' ? 'var(--transfer)' : 'var(--expense)',
              }}>
                {t.type === 'income' ? '+' : t.type === 'transfer' ? '⇄' : '−'}₱{Number(t.amount).toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
