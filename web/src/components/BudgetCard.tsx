'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Budget } from '@/types/database'
import { getPeriodWindow } from '@/lib/budget-utils'

interface Props { budget: Budget; spent: number; onDeleted?: () => void; onEdit?: (budget: Budget) => void }

export function BudgetCard({ budget, spent, onDeleted, onEdit }: Props) {
  const [confirming, setConfirming] = useState(false)

  async function handleDelete() {
    await supabase.from('budgets').delete().eq('id', budget.id)
    onDeleted?.()
  }
  const pct = Math.min((spent / budget.amount) * 100, 100)
  const over = spent > budget.amount
  const { windowStart, windowEnd } = getPeriodWindow(budget.anchor_date, budget.period)
  const catName = (budget.categories as any)?.name ?? 'Unknown'
  const remaining = budget.amount - spent

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 })

  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{catName}</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
            {windowStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {windowEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <span style={{
          fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '20px',
          background: over ? '#FEF2F2' : '#F0FDF4',
          color: over ? 'var(--expense)' : 'var(--income)',
        }}>
          {over ? 'Over budget' : 'On track'}
        </span>
      </div>

      <div style={{ height: '4px', background: 'var(--surface-dim)', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: over ? 'var(--expense)' : 'var(--income)',
          borderRadius: '2px',
          animation: 'fillBar 0.7s ease both',
          animationDelay: '0.1s',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="mono" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          ₱{fmt(spent)}
          <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '4px' }}>
            of ₱{fmt(budget.amount)}
          </span>
        </span>
        <span style={{ fontSize: '0.75rem', color: over ? 'var(--expense)' : 'var(--income)', fontWeight: 500 }}>
          {over ? `₱${fmt(Math.abs(remaining))} over` : `₱${fmt(remaining)} left`}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
        {confirming ? (
          <>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: 'auto', alignSelf: 'center' }}>Delete?</span>
            <button onClick={handleDelete} className="btn-danger btn-danger-confirm">Yes</button>
            <button onClick={() => setConfirming(false)} className="btn-danger">No</button>
          </>
        ) : (
          <>
            <button onClick={() => onEdit?.(budget)} className="btn-danger" style={{ color: 'var(--text-secondary)' }}>Edit</button>
            <button onClick={() => setConfirming(true)} className="btn-danger">Delete</button>
          </>
        )}
      </div>
    </div>
  )
}
