import type { ParsedTransaction, Category } from '@/types/database'

interface Props {
  rows: ParsedTransaction[]
  categories: Category[]
  onChange: (rows: ParsedTransaction[]) => void
}

export function ImportReviewTable({ rows, categories, onChange }: Props) {
  function updateRow(idx: number, patch: Partial<ParsedTransaction>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  return (
    <div className="card" style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
        <thead>
          <tr style={{ background: 'var(--surface-dim)', borderBottom: '1px solid var(--border)' }}>
            {['Date', 'Description', 'Type', 'Amount', 'Category', 'Status'].map((h) => (
              <th key={h} style={{
                padding: '10px 14px', fontSize: '0.7rem', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--text-secondary)', textAlign: 'left',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.row_id} className="tx-row" style={{
              borderBottom: idx < rows.length - 1 ? '1px solid var(--border)' : 'none',
              background: row.is_duplicate ? '#FFFBEB' : 'transparent',
            }}>
              <td className="mono" style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {row.date}
              </td>
              <td style={{ padding: '10px 14px', fontSize: '0.875rem', color: 'var(--text-primary)', maxWidth: '220px' }}>
                {row.description}
              </td>
              <td style={{ padding: '10px 14px' }}>
                <select value={row.type} onChange={(e) => updateRow(idx, { type: e.target.value as any })} className="input" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="transfer">Transfer</option>
                </select>
              </td>
              <td className="mono" style={{
                padding: '10px 14px', fontSize: '0.875rem', fontWeight: 600,
                color: row.type === 'income' ? 'var(--income)' : 'var(--expense)',
              }}>
                ₱{row.amount.toFixed(2)}
              </td>
              <td style={{ padding: '10px 14px' }}>
                <select value={row.category_id ?? ''} onChange={(e) => updateRow(idx, { category_id: e.target.value || undefined })} className="input" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </td>
              <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                {row.is_duplicate ? (
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#92400E', background: '#FEF3C7', padding: '2px 8px', borderRadius: '12px' }}>
                    Possible duplicate
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--income)' }}>New</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
