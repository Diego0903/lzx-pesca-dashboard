import type { CampaignInsight } from '../types'
import { fmtBRL, fmtNum } from '../utils/formatters'

interface Props {
  insights: CampaignInsight[]
}

interface CardProps {
  label: string
  value: string
  sub?: string
  color?: string
  icon: string
}

function Card({ label, value, sub, color = 'var(--blue)', icon }: CardProps) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '18px 20px',
      flex: '1 1 150px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function MetricsSummary({ insights }: Props) {
  // Single pass over insights — activeCount merged into reduce
  const totals = insights.reduce((acc, c) => {
    const spend = parseFloat(c.spend || '0')
    acc.spend += spend
    acc.impressions += parseInt(c.impressions || '0')
    acc.clicks += parseInt(c.clicks || '0')
    acc.reach += parseInt(c.reach || '0')
    if (spend > 0) acc.activeCount++

    const purchases = c.actions?.find(a => a.action_type === 'purchase')
    if (purchases) acc.purchases += parseFloat(purchases.value)

    const roas = c.purchase_roas?.[0]?.value
    if (roas) { acc.roasSum += parseFloat(roas); acc.roas_count++ }

    return acc
  }, { spend: 0, impressions: 0, clicks: 0, reach: 0, purchases: 0, roasSum: 0, roas_count: 0, activeCount: 0 })

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0
  const cpc = totals.clicks > 0 ? (totals.spend / totals.clicks) : 0
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions * 1000) : 0
  const avgRoas = totals.roas_count > 0 ? (totals.roasSum / totals.roas_count) : 0
  const cpa = totals.purchases > 0 ? (totals.spend / totals.purchases) : 0

  return (
    <div>
      <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, marginBottom: 12, fontSize: 14, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Métricas Consolidadas
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Card label="Total Investido" value={fmtBRL(totals.spend)} sub={`${totals.activeCount} campanhas ativas`} color="var(--blue)" icon="💰" />
        <Card label="Impressões" value={fmtNum(totals.impressions)} color="var(--purple)" icon="👁️" />
        <Card label="Cliques" value={fmtNum(totals.clicks)} color="var(--cyan)" icon="🖱️" />
        <Card label="Alcance" value={fmtNum(totals.reach)} color="var(--text)" icon="📡" />
        <Card label="CTR Médio" value={`${ctr.toFixed(2)}%`} sub={ctr >= 2 ? '✅ Bom' : ctr >= 1 ? '🟡 Razoável' : '🔴 Baixo'} color={ctr >= 2 ? 'var(--green)' : ctr >= 1 ? 'var(--yellow)' : 'var(--red)'} icon="📊" />
        <Card label="CPC Médio" value={fmtBRL(cpc)} sub={cpc <= 1.5 ? '✅ Eficiente' : cpc <= 3 ? '🟡 Razoável' : '🔴 Caro'} color={cpc <= 1.5 ? 'var(--green)' : cpc <= 3 ? 'var(--yellow)' : 'var(--red)'} icon="💳" />
        <Card label="CPM Médio" value={fmtBRL(cpm)} color="var(--text)" icon="📣" />
        {avgRoas > 0 && <Card label="ROAS Médio" value={`${avgRoas.toFixed(2)}x`} sub={avgRoas >= 4 ? '✅ Excelente' : avgRoas >= 2 ? '🟡 Razoável' : '🔴 Baixo'} color={avgRoas >= 4 ? 'var(--green)' : avgRoas >= 2 ? 'var(--yellow)' : 'var(--red)'} icon="📈" />}
        {cpa > 0 && <Card label="CPA" value={fmtBRL(cpa)} sub="Custo por compra" color="var(--yellow)" icon="🛒" />}
        {totals.purchases > 0 && <Card label="Compras" value={fmtNum(totals.purchases)} color="var(--green)" icon="✅" />}
      </div>
    </div>
  )
}
