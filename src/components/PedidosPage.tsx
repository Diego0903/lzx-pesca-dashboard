import { useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  mockOrders, monthlyRevenue, salesByCategory, ordersByState,
  dashboardExtraKpis, type OrderStatus,
} from '../data/mockCrm'
import { fmtBRL, fmtNum } from '../utils/formatters'

const STATUS_LABEL: Record<OrderStatus, { label: string; cls: string }> = {
  novo:      { label: 'Novo',        cls: 'badge badge-blue' },
  andamento: { label: 'Em andamento',cls: 'badge badge-orange' },
  fechado:   { label: 'Fechado',     cls: 'badge badge-green' },
}

const CHART_COLORS = ['#c4a35a', '#3b82f6', '#16a34a', '#a855f7', '#f97316', '#ee5a4a']

interface KpiProps {
  icon: string
  label: string
  value: string
  sub?: string
  color?: string
}

function KpiCard({ icon, label, value, sub, color = 'var(--gold)' }: KpiProps) {
  return (
    <div className="glass glass-hover" style={{ padding: '18px 20px', flex: '1 1 180px', minWidth: 180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 20 }} aria-hidden="true">{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>{sub}</div>}
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
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 8

  const filtered = useMemo(
    () => mockOrders.filter(o => statusFilter === 'all' || o.status === statusFilter),
    [statusFilter]
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const totalRevenue = mockOrders.reduce((s, o) => s + o.value, 0)
  const closedCount = mockOrders.filter(o => o.status === 'fechado').length
  const newCount = mockOrders.filter(o => o.status === 'novo').length

  return (
    <div className="fade-in">
      {/* KPIs */}
      <div className="stagger" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <KpiCard icon="💰" label="Receita total" value={fmtBRL(totalRevenue)} sub="período acumulado" color="var(--gold)" />
        <KpiCard icon="📦" label="Pedidos no período" value={fmtNum(mockOrders.length)} sub={`${newCount} novos · ${closedCount} fechados`} color="var(--trust-blue)" />
        <KpiCard icon="🎯" label="Conversão WhatsApp" value={`${dashboardExtraKpis.whatsappConversion}%`} sub="leads que viram pedido" color="var(--trust-green)" />
        <KpiCard icon="🧾" label="Ticket médio" value={fmtBRL(dashboardExtraKpis.ticketMedio)} sub="por pedido fechado" color="var(--purple)" />
        <KpiCard icon="🔥" label="Mais consultado" value={dashboardExtraKpis.topConsultedProduct} sub={`${dashboardExtraKpis.topConsultedCount} consultas esta semana`} color="var(--trust-orange)" />
        <KpiCard icon="⏱️" label="Tempo de resposta" value={`${dashboardExtraKpis.avgResponseMinutes} min`} sub="média no WhatsApp" color="var(--cyan)" />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Receita por mês */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
            Receita Mensal · 6 meses
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyRevenue} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={60} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip fmt={fmtBRL} />} />
              <Line type="monotone" dataKey="receita" name="Receita" stroke="#c4a35a" strokeWidth={3} dot={{ r: 4, fill: '#c4a35a' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição por estado (donut) */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
            Pedidos por Estado
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={ordersByState} dataKey="pedidos" nameKey="estado" cx="50%" cy="50%" innerRadius={56} outerRadius={92} paddingAngle={3}>
                {ordersByState.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />)}
              </Pie>
              <Tooltip content={<ChartTooltip fmt={v => `${v} pedidos`} />} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 — sales by category */}
      <div className="glass" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          Produtos Vendidos por Categoria
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={salesByCategory} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="categoria" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(196,163,90,0.08)' }} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
            <Bar dataKey="vendas" name="Unidades vendidas" fill="#c4a35a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de pedidos */}
      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pedidos Recentes <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12, textTransform: 'none' }}>({filtered.length})</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([
              { k: 'all',       l: 'Todos' },
              { k: 'novo',      l: 'Novos' },
              { k: 'andamento', l: 'Em andamento' },
              { k: 'fechado',   l: 'Fechados' },
            ] as const).map(f => (
              <button
                key={f.k}
                type="button"
                onClick={() => { setStatusFilter(f.k); setPage(0) }}
                className="btn-secondary"
                style={statusFilter === f.k ? { background: 'var(--gold)', color: '#1a1500', borderColor: 'var(--gold)', fontWeight: 700 } : undefined}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Produto</th>
                <th>Estado</th>
                <th className="num">Valor</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{o.client}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{o.product}</td>
                  <td>{o.state}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmtBRL(o.value)}</td>
                  <td><span className={STATUS_LABEL[o.status].cls}>{STATUS_LABEL[o.status].label}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(o.date).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Nenhum pedido com esse filtro.</td></tr>
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
