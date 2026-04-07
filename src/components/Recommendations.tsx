import type { CampaignInsight } from '../types'

interface Props {
  insights: CampaignInsight[]
}

interface Rec {
  type: 'critical' | 'warning' | 'success' | 'info'
  campaign?: string
  title: string
  description: string
  action: string
}

const ICONS = { critical: '🔴', warning: '🟡', success: '🟢', info: '💡' }
const COLORS = {
  critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', text: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b' },
  success: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', text: '#22c55e' },
  info: { bg: 'rgba(79,142,247,0.08)', border: 'rgba(79,142,247,0.2)', text: '#4f8ef7' },
}

function buildRecommendations(insights: CampaignInsight[]): Rec[] {
  const recs: Rec[] = []

  for (const c of insights) {
    const ctr = parseFloat(c.ctr || '0')
    const cpc = parseFloat(c.cpc || '0')
    const spend = parseFloat(c.spend || '0')
    const impressions = parseInt(c.impressions || '0')
    const roas = c.purchase_roas?.[0]?.value ? parseFloat(c.purchase_roas[0].value) : null
    const name = c.campaign_name || c.campaign_id

    if (spend === 0) continue

    if (ctr < 0.5 && impressions > 5000) {
      recs.push({
        type: 'critical',
        campaign: name,
        title: 'CTR Crítico',
        description: `CTR de ${ctr.toFixed(2)}% com ${impressions.toLocaleString('pt-BR')} impressões. O criativo não está engajando o público.`,
        action: 'Pause e substitua o criativo. Teste um novo ângulo de oferta ou formato (vídeo vs imagem).',
      })
    } else if (ctr < 1 && impressions > 2000) {
      recs.push({
        type: 'warning',
        campaign: name,
        title: 'CTR Abaixo do Ideal',
        description: `CTR de ${ctr.toFixed(2)}%. Benchmarks do nicho de pesca geralmente ficam entre 1.5-3%.`,
        action: 'Teste variações de copy e headline. Verifique se o público está alinhado com o criativo.',
      })
    }

    if (ctr >= 2 && cpc > 0 && cpc <= 1.5) {
      recs.push({
        type: 'success',
        campaign: name,
        title: 'Alta Performance — Escalar',
        description: `CTR ${ctr.toFixed(2)}% e CPC R$${cpc.toFixed(2)}. Campanha com excelente eficiência.`,
        action: 'Aumente o budget em 20-30% a cada 2-3 dias para escalar sem quebrar o aprendizado.',
      })
    }

    if (cpc > 5 && spend > 50) {
      recs.push({
        type: 'critical',
        campaign: name,
        title: 'CPC Muito Alto',
        description: `CPC de R$${cpc.toFixed(2)} com R$${spend.toFixed(2)} investido. Custo por clique insustentável.`,
        action: 'Revise a segmentação — público pode estar saturado. Tente público mais amplo ou lookalike de 3-5%.',
      })
    }

    if (roas !== null && roas < 1.5 && spend > 100) {
      recs.push({
        type: 'critical',
        campaign: name,
        title: 'ROAS Negativo',
        description: `ROAS de ${roas.toFixed(2)}x. Campanha está gerando prejuízo.`,
        action: 'Pause imediatamente. Revise página de destino, preço do produto e funil de checkout.',
      })
    }

    if (roas !== null && roas >= 4) {
      recs.push({
        type: 'success',
        campaign: name,
        title: `ROAS Excelente (${roas.toFixed(2)}x)`,
        description: `Para cada R$1 investido, retorna R$${roas.toFixed(2)}.`,
        action: 'Prioridade máxima. Escale gradualmente e crie campanhas lookalike baseadas neste público.',
      })
    }
  }

  // Recomendações gerais baseadas no conjunto todo
  const totalSpend = insights.reduce((s, c) => s + parseFloat(c.spend || '0'), 0)
  const totalImpressions = insights.reduce((s, c) => s + parseInt(c.impressions || '0'), 0)
  const avgFrequency = insights.reduce((s, c) => s + parseFloat(c.frequency || '0'), 0) / (insights.length || 1)

  if (avgFrequency > 3) {
    recs.push({
      type: 'warning',
      title: 'Frequência Alta — Saturação',
      description: `Frequência média de ${avgFrequency.toFixed(1)}x. O público está vendo os anúncios muitas vezes.`,
      action: 'Expanda o público, renove os criativos ou pause campanhas para reset de frequência (7-14 dias).',
    })
  }

  const lowImpCampaigns = insights.filter(c => parseInt(c.impressions || '0') < 500 && parseFloat(c.spend || '0') > 0)
  if (lowImpCampaigns.length > 2) {
    recs.push({
      type: 'info',
      title: `${lowImpCampaigns.length} Campanhas com Volume Baixo`,
      description: 'Campanhas com menos de 500 impressões têm dados estatisticamente insignificantes.',
      action: 'Consolide essas campanhas em conjuntos maiores ou aumente o orçamento mínimo para R$15-20/dia.',
    })
  }

  if (totalSpend > 0 && totalImpressions > 0) {
    recs.push({
      type: 'info',
      title: 'Teste A/B de Criativos',
      description: 'Recomendação estrutural para todas as campanhas ativas.',
      action: 'Mantenha 2-3 criativos por conjunto de anúncios. Pause os que tiverem CTR 30% abaixo da média após 3 dias.',
    })

    recs.push({
      type: 'info',
      title: 'Sazonalidade do Nicho Pesca',
      description: 'Picos de temporada podem aumentar ou reduzir drasticamente a eficiência.',
      action: 'Prepare criativos sazonais (temporada de pesca, feriados, férias). Aumente budget 2-3x nos períodos de pico.',
    })
  }

  return recs
}

export default function Recommendations({ insights }: Props) {
  const recs = buildRecommendations(insights)
  const criticals = recs.filter(r => r.type === 'critical')
  const rest = recs.filter(r => r.type !== 'critical')

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Recomendações Inteligentes
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {criticals.length > 0 && (
            <span style={{
              background: 'rgba(239,68,68,0.15)',
              color: 'var(--red)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 12,
              fontWeight: 600,
            }}>
              {criticals.length} crítica{criticals.length !== 1 ? 's' : ''}
            </span>
          )}
          <span style={{
            background: 'rgba(79,142,247,0.15)',
            color: 'var(--blue)',
            border: '1px solid rgba(79,142,247,0.3)',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 12,
          }}>
            {recs.length} total
          </span>
        </div>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[...criticals, ...rest].map((rec, i) => {
          const c = COLORS[rec.type]
          return (
            <div key={i} style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{ICONS[rec.type]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: c.text }}>{rec.title}</span>
                    {rec.campaign && (
                      <span style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '1px 7px',
                        fontSize: 11,
                        maxWidth: 260,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {rec.campaign}
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: 13 }}>{rec.description}</p>
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: 13,
                    color: 'var(--text)',
                  }}>
                    <strong style={{ color: c.text }}>Ação: </strong>{rec.action}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
