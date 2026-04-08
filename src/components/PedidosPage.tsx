import { useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { Lead } from '../data/mockCrm'
import { useCrm } from '../hooks/useCrm'
import { fmtBRL, fmtNum } from '../utils/formatters'
import { exportToCsv, todayStamp } from '../utils/csv'

// PedidoView é uma projeção de Lead — vendas são leads com stage='fechado'.
interface PedidoView {
  id: string
  client: string
  product: string
  category: string
  state: string
  value: number
  date: string  // ISO
  createdByName?: string
}

function leadToPedido(l: Lead): PedidoView {
  return {
    id: l.id,
    client: l.name,
    product: l.product || '—',         // mapper já fez items.map(i=>i.product).join(' · ')
    category: l.category,
    state: l.state,
    value: l.estimatedValue,
    date: l.createdAt ?? l.lastContactAt,
    createdByName: l.createdByName,
  }
}


function buildMonthlyRevenue(pedidos: PedidoView[]) {
  const months: { key: string; label: string; receita: number; pedidos: number }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + '/' + String(d.getFullYear()).slice(-2)
    months.push({ key, label, receita: 0, pedidos: 0 })
  }
  for (const p of pedidos) {
    const d = new Date(p.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const slot = months.find(m => m.key === key)
    if (slot) { slot.receita += p.value; slot.pedidos += 1 }
  }
  return months.map(({ label, receita, pedidos }) => ({ month: label, receita, pedidos }))
}

function buildOrdersByState(pedidos: PedidoView[]) {
  const map = new Map<string, number>()
  for (const p of pedidos) map.set(p.state, (map.get(p.state) ?? 0) + 1)
  return Array.from(map.entries())
    .map(([estado, pedidos]) => ({ estado, pedidos }))
    .sort((a, b) => b.pedidos - a.pedidos)
}

function buildSalesByCategory(pedidos: PedidoView[]) {
  const map = new Map<string, { vendas: number; receita: number }>()
  for (const p of pedidos) {
    const cur = map.get(p.category) ?? { vendas: 0, receita: 0 }
    cur.vendas += 1
    cur.receita += p.value
    map.set(p.category, cur)
  }
  return Array.from(map.entries())
    .map(([categoria, { vendas, receita }]) => ({ categoria, vendas, receita }))
    .sort((a, b) => b.vendas - a.vendas)
}

const CHART_COLORS = ['#c8a55c', '#4d8af5', '#5fb85a', '#9d6fdb', '#ed8936', '#d65656', '#4ea5b8']

interface KpiProps {
  icon: string
  label: string
  value: string
  sub?: string
  color?: string
}

function KpiCard({ icon, label, value, sub, color = 'var(--gold)' }: KpiProps) {
  return (
    <div className="glass glass-hover" style={{ padding: '20px 22px', flex: '1 1 190px', minWidth: 190 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span className="font-display" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontSize: 18, opacity: 0.9 }} aria-hidden="true">{icon}</span>
      </div>
      <div className="font-display tabular" style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, fontWeight: 500 }}>{sub}</div>}
    </div>
  )
}

interface TooltipEntry { name?: string; value?: number; color?: string }
interface TooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string; fmt?: (v: number) => string }

function ChartTooltip({ active, payload, label, fmt }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-strong" style={{ background: 'var(--surface2)', border: '1px solid var(--gold)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      {label && <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: 8 }}>
          <span>{p.name}:</span>
          <strong>{fmt && typeof p.value === 'number' ? fmt(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function PedidosPage() {
  const { leads, loading, source } = useCrm()
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 8

  const pedidos = useMemo(
    () => leads.filter(l => l.stage === 'fechado').map(leadToPedido),
    [leads]
  )

  const pageCount = Math.max(1, Math.ceil(pedidos.length / PAGE_SIZE))
  const visible = pedidos.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const totalRevenue = pedidos.reduce((s, p) => s + p.value, 0)
  const ticketMedio = pedidos.length > 0 ? totalRevenue / pedidos.length : 0
  const totalLeadsAtivos = leads.filter(l => l.stage !== 'fechado' && l.stage !== 'perdido').length

  const monthlyRevenue   = useMemo(() => buildMonthlyRevenue(pedidos),   [pedidos])
  const ordersByState    = useMemo(() => buildOrdersByState(pedidos),    [pedidos])
  const salesByCategory  = useMemo(() => buildSalesByCategory(pedidos),  [pedidos])

  if (loading) return (
    <div className="fade-in" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      Carregando pedidos...
    </div>
  )

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 16, fontSize: 11, color: 'var(--text-muted)' }}>
        <span className={`badge ${source === 'supabase' ? 'badge-green' : 'badge-red'}`}>
          {source === 'supabase' ? '🟢 Supabase conectado' : '🔴 Sem conexão com o banco'}
        </span>
      </div>

      {/* KPIs */}
      <div className="stagger" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <KpiCard icon="💰" label="Receita total"   value={fmtBRL(totalRevenue)} sub="vendas fechadas" color="var(--gold)" />
        <KpiCard icon="✅" label="Vendas fechadas" value={fmtNum(pedidos.length)} sub={`${totalLeadsAtivos} leads ativos no pipeline`} color="var(--trust-green)" />
        <KpiCard icon="🧾" label="Ticket médio"   value={ticketMedio > 0 ? fmtBRL(ticketMedio) : '—'} sub={ticketMedio > 0 ? 'por venda' : 'sem vendas ainda'} color="var(--purple)" />
      </div>

      {pedidos.length === 0 ? (
        <div className="glass" style={{ padding: '60px 24px', textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">✅</div>
          <div style={{ fontFamily: "'Manrope','Rubik',sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.01em' }}>
            Nenhuma venda fechada ainda
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto' }}>
            Quando um lead for movido para a coluna <strong>Fechado</strong> no kanban do CRM, ele aparece aqui automaticamente.
          </div>
        </div>
      ) : <>
      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Receita por mês */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, fontFamily: "'Manrope','Rubik',sans-serif" }}>
            Receita Mensal · 6 meses
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyRevenue} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="lineGoldGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e0c187" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#8a6e2e" stopOpacity={1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Manrope' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={56} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip fmt={fmtBRL} />} cursor={{ stroke: 'var(--gold)', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Line
                type="monotone"
                dataKey="receita"
                name="Receita"
                stroke="url(#lineGoldGlow)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#c8a55c', strokeWidth: 2, stroke: 'var(--bg)' }}
                activeDot={{ r: 6, fill: '#e0c187', strokeWidth: 2, stroke: 'var(--bg)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição por estado (donut) */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, fontFamily: "'Manrope','Rubik',sans-serif" }}>
            Pedidos por Estado
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={ordersByState} dataKey="pedidos" nameKey="estado" cx="50%" cy="50%" innerRadius={62} outerRadius={96} paddingAngle={4} strokeWidth={2} stroke="var(--bg-elev)">
                {ordersByState.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip fmt={v => `${v} pedidos`} />} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Manrope', fontWeight: 500, paddingTop: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 — sales by category */}
      <div className="glass" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, fontFamily: "'Manrope','Rubik',sans-serif" }}>
          Produtos Vendidos por Categoria
        </div>
        <ResponsiveContainer width="100%" height={270}>
          <BarChart data={salesByCategory} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e0c187" stopOpacity={0.95}/>
                <stop offset="100%" stopColor="#8a6e2e" stopOpacity={0.85}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="categoria" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Manrope' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={48} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(200,165,92,0.08)' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Manrope', fontWeight: 500 }} />
            <Bar dataKey="vendas" name="Unidades vendidas" fill="url(#barGold)" radius={[8, 8, 0, 0]} maxBarSize={56} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      </>}

      {/* Tabela de vendas fechadas */}
      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', flexWrap: 'wrap', gap: 10 }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 12, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Vendas Fechadas <span className="tabular" style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'none', letterSpacing: 0, marginLeft: 4 }}>({pedidos.length})</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => exportToCsv(`vendas_${todayStamp()}.csv`, pedidos, [
              { key: 'client',         label: 'Cliente' },
              { key: 'product',        label: 'Produtos' },
              { key: 'category',       label: 'Categoria' },
              { key: 'state',          label: 'Estado' },
              { key: 'value',          label: 'Valor total (R$)' },
              { key: 'createdByName',  label: 'Cadastrado por', format: p => p.createdByName ?? '' },
              { key: 'date',           label: 'Data',           format: p => new Date(p.date).toLocaleDateString('pt-BR') },
            ])}
            disabled={pedidos.length === 0}
            title="Exportar CSV"
          >
            ⬇ CSV
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Produto</th>
                <th>Estado</th>
                <th className="num">Valor</th>
                <th>Cadastrado por</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{p.client}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.product}</td>
                  <td>{p.state}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmtBRL(p.value)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.createdByName ?? '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Nenhuma venda fechada ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderTop: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Página {page + 1} de {pageCount}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="btn-secondary" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>← Anterior</button>
              <button type="button" className="btn-secondary" disabled={page >= pageCount - 1} onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}>Próxima →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
