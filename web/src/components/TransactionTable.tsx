'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Transaction, Category, Account } from '@/types/database'

interface Props {
  transactions: Transaction[]
  categories: Category[]
  accounts: Account[]
  onUpdated?: () => void
}

function DeleteButton({ transactionId, onDeleted }: { transactionId: string; onDeleted?: () => void }) {
  const [confirming, setConfirming] = useState(false)

  async function handleDelete() {
    await supabase.from('transactions').delete().eq('id', transactionId)
    onDeleted?.()
  }

  if (confirming) {
    return (
      <span style={{ display: 'inline-flex', gap: '4px' }}>
        <button onClick={handleDelete} className="btn-danger btn-danger-confirm" title="Confirm delete">Yes</button>
        <button onClick={() => setConfirming(false)} className="btn-danger" title="Cancel">No</button>
      </span>
    )
  }

  return <button onClick={() => setConfirming(true)} className="btn-danger" title="Delete transaction">✕</button>
}

const cellStyle = { padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }

function EditableText({ value, field, transactionId, onUpdated, mono, align, style }: {
  value: string; field: string; transactionId: string; onUpdated?: () => void
  mono?: boolean; align?: 'right' | 'left'; style?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function save() {
    setEditing(false)
    if (draft === value) return
    await supabase.from('transactions').update({ [field]: draft }).eq('id', transactionId)
    onUpdated?.()
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
        className="input"
        style={{ fontSize: '0.8rem', padding: '4px 6px', width: '100%', textAlign: align, ...(mono ? { fontFamily: 'var(--font-mono, monospace)' } : {}), ...style }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{ cursor: 'pointer', borderBottom: '1px dashed var(--text-tertiary)', paddingBottom: '1px', ...style }}
    >
      {value}
    </span>
  )
}

function EditableSelect({ value, options, field, transactionId, onUpdated, placeholder }: {
  value: string | null; options: { id: string; label: string }[]; field: string; transactionId: string; onUpdated?: () => void; placeholder: string
}) {
  const [editing, setEditing] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => { if (editing) selectRef.current?.focus() }, [editing])

  async function handleChange(val: string) {
    setEditing(false)
    await supabase.from('transactions').update({ [field]: val || null }).eq('id', transactionId)
    onUpdated?.()
  }

  if (editing) {
    return (
      <select
        ref={selectRef}
        defaultValue={value ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setEditing(false)}
        className="input"
        style={{ fontSize: '0.8rem', padding: '4px 6px', minWidth: '120px', cursor: 'pointer' }}
      >
        <option value="">— None —</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    )
  }

  const selected = options.find((o) => o.id === value)
  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{ cursor: 'pointer', borderBottom: '1px dashed var(--text-tertiary)', paddingBottom: '1px' }}
    >
      {selected?.label ?? <span style={{ color: 'var(--text-tertiary)' }}>{placeholder}</span>}
    </span>
  )
}

export function TransactionTable({ transactions, categories, accounts, onUpdated }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No transactions found</p>
      </div>
    )
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--surface-dim)', borderBottom: '1px solid var(--border)' }}>
            {['Date', 'Description', 'Category', 'Account', 'Amount', ''].map((h, idx) => (
              <th key={idx} style={{
                padding: '10px 16px',
                fontSize: '0.7rem', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--text-secondary)', textAlign: h === 'Amount' ? 'right' : 'left',
                width: h === '' ? '48px' : undefined,
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => {
            const filteredCats = categories.filter((c) => c.type === (t.type === 'income' ? 'income' : 'expense'))
            return (
              <tr key={t.id} className="tx-row" style={{
                borderBottom: i < transactions.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <td className="mono" style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                  <EditableText value={t.date} field="date" transactionId={t.id} onUpdated={onUpdated} mono />
                </td>
                <td style={{ ...cellStyle, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  <EditableText value={t.description} field="description" transactionId={t.id} onUpdated={onUpdated} />
                </td>
                <td style={cellStyle}>
                  {t.type === 'transfer'
                    ? <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                    : <EditableSelect
                        value={t.category_id}
                        options={filteredCats.map((c) => ({ id: c.id, label: `${c.icon ?? ''} ${c.name}`.trim() }))}
                        field="category_id"
                        transactionId={t.id}
                        onUpdated={onUpdated}
                        placeholder="— Set category"
                      />
                  }
                </td>
                <td style={cellStyle}>
                  <EditableSelect
                    value={t.account_id}
                    options={accounts.map((a) => ({ id: a.id, label: a.name }))}
                    field="account_id"
                    transactionId={t.id}
                    onUpdated={onUpdated}
                    placeholder="— Set account"
                  />
                </td>
                <td className="mono" style={{
                  ...cellStyle, fontSize: '0.875rem', fontWeight: 600,
                  textAlign: 'right', whiteSpace: 'nowrap',
                  color: t.type === 'income' ? 'var(--income)' : t.type === 'transfer' ? 'var(--transfer)' : 'var(--expense)',
                }}>
                  {t.type === 'income' ? '+' : t.type === 'transfer' ? '⇄' : '−'}₱
                  <EditableText
                    value={Number(t.amount).toFixed(2)}
                    field="amount"
                    transactionId={t.id}
                    onUpdated={onUpdated}
                    mono
                    align="right"
                    style={{ display: 'inline', width: 'auto' }}
                  />
                </td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>
                  <DeleteButton transactionId={t.id} onDeleted={onUpdated} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
