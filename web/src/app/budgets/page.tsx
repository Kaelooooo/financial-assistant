'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { BudgetCard } from '@/components/BudgetCard'
import { BudgetForm } from '@/components/BudgetForm'
import { getPeriodWindow } from '@/lib/budget-utils'
import type { Budget, Category } from '@/types/database'

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [spentMap, setSpentMap] = useState<Record<string, number>>({})
  const [showForm, setShowForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [bR, cR] = await Promise.all([
      supabase.from('budgets').select('*, categories(name, color)').eq('active', true),
      supabase.from('categories').select('*').order('name'),
    ])
    const bData = bR.data ?? []
    setBudgets(bData); setCategories(cR.data ?? [])
    const today = new Date()
    const spent = await Promise.all(bData.map(async (b) => {
      const { windowStart, windowEnd } = getPeriodWindow(b.anchor_date, b.period, today)
      const { data } = await supabase.from('transactions').select('amount')
        .eq('type', 'expense').eq('category_id', b.category_id)
        .gte('date', windowStart.toISOString().slice(0, 10))
        .lte('date', windowEnd.toISOString().slice(0, 10))
      return [b.id, (data ?? []).reduce((s, r) => s + Number(r.amount), 0)] as [string, number]
    }))
    setSpentMap(Object.fromEntries(spent))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Budgets
        </h1>
        <button onClick={() => { setShowForm(!showForm); setEditingBudget(null) }} className="btn-primary">
          {showForm ? 'Cancel' : '+ New Budget'}
        </button>
      </div>

      {(showForm || editingBudget) && (
        <div className="card fade-in" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
            {editingBudget ? 'Edit Budget' : 'New Budget'}
          </h2>
          <BudgetForm
            categories={categories}
            budget={editingBudget ?? undefined}
            onSaved={() => { setShowForm(false); setEditingBudget(null); load() }}
            onCancel={() => { setShowForm(false); setEditingBudget(null) }}
          />
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}><p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Loading…</p></div>
      ) : budgets.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '8px' }}>No budgets yet</p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Create a budget to start tracking your spending limits</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {budgets.map((b, i) => (
            <div key={b.id} className={`fade-up delay-${Math.min(i + 1, 6)}`}>
              <BudgetCard budget={b} spent={spentMap[b.id] ?? 0} onDeleted={load} onEdit={(b) => { setEditingBudget(b); setShowForm(false) }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
