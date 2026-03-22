interface MetricCardProps {
  label: string
  value: string
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function MetricCard({ label, value, subtext, trend }: MetricCardProps) {
  const trendColor = trend === 'up' ? 'var(--income)' : trend === 'down' ? 'var(--expense)' : 'var(--text-secondary)'
  const trendSymbol = trend === 'up' ? '↑' : trend === 'down' ? '↓' : null

  return (
    <div className="card" style={{ padding: '24px' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
        {label}
      </p>
      <p className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
        {trendSymbol && <span style={{ fontSize: '0.9rem', color: trendColor, marginLeft: '6px' }}>{trendSymbol}</span>}
      </p>
      {subtext && <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '6px' }}>{subtext}</p>}
    </div>
  )
}
