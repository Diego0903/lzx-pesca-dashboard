import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TimeSeriesPoint } from '../types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  data: TimeSeriesPoint[]
}

type MetricDef = {
  key: keyof TimeSeriesPoint
  label: string
  color: string
  format: (v: number) => string
}

const METRICS: MetricDef[] = [
  { key: 'spend', label: 'Gasto (R$)', color: '#4f8ef7', format: v => `R$ ${v.toFixed(2)}` },
  { key: 'impressions', label: 'Impressões', color: '#a855f7', format: v => v.toLocaleString('pt-BR') },
  { key: 'clicks', label: 'Cliques', color: '#06b6d4', format: v => v.toLocaleString('pt-BR') },
  { key: 'ctr', label: 'CTR (%)', color: '#22c55e', format: v => `${v.toFixed(2)}%` },
  { key: 'cpc', label: 'CPC (R$)', color: '#f59e0b', format: v => `R$ ${v.toFixed(2)}` },
  { key: 'cpm', label: 'CPM (R$)', color: '#ef4444', format: v => `R$ ${v.toFixed(2)}` },
]

export default function TimeSeriesChart({ data }: Props) {
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(new Set(['spend', 'ctr']))

  if (!data.length) return null

  const chartData = data.map(d => ({
    date: d.date_start,
    dateLabel: (() => {
      try { return format(parseISO(d.date_start), 'd MMM', { locale: ptBR }) }
      catch { return d.date_start }
    })(),
    spend: parseFloat(d.spend || '0'),
    impressions: parseInt(d.impressions || '0'),
    clicks: parseInt(d.clicks || '0'),
    ctr: parseFloat(d.ctr || '0'),
    cpc: parseFloat(d.cpc || '0'),
    cpm: parseFloat(d.cpm || '0'),
    reach: parseInt(d.reach || '0'),
  }))

  const toggle = (key: string) => {
    setActiveMetrics(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const activeList = METRICS.filter(m => activeMetrics.has(m.key as string))

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 20px 12px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evolução Temporal <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>({data.length} dias)</span></div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {METRICS.map(m => (
            <button
              key={m.key as string}
              onClick={() => toggle(m.key as string)}
              style={{
                background: activeMetrics.has(m.key as string) ? `${m.color}25` : 'transparent',
                border: `1px solid ${activeMetrics.has(m.key as string) ? m.color : 'var(--border)'}`,
                borderRadius: 5,
                padding: '3px 10px',
                cursor: 'pointer',
                color: activeMetrics.has(m.key as string) ? m.color : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
          />
          {activeList.map(m => (
            <Line
              key={m.key as string}
              type="monotone"
              dataKey={m.key as string}
              stroke={m.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name={m.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
