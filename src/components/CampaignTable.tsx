import React, { useState, useMemo } from 'react'
import type { CampaignInsight } from '../types'
import { getMessages, getCostPerMsg } from '../utils/campaignMetrics'

interface Props {
  insights: CampaignInsight[]
}

type SortKey = 'spend' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'cpm' | 'roas'

function badge(label: string, color: string, bg: string) {
  return (
    <span style={{
      background: bg,
      color,
      border: `1px solid ${color}40`,
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function getCampaignStatus(c: CampaignInsight) {
  const ctr = parseFloat(c.ctr || '0')
  const cpc = parseFloat(c.cpc || '999')
  const roas = c.purchase_roas?.[0]?.value ? parseFloat(c.purchase_roas[0].value) : null
  if (roas && roas >= 4 && ctr >= 2) return { label: '🚀 Escalar', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' }
  if (ctr >= 2 && cpc <= 1.5) return { label: '✅ Bom', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' }
  if (ctr >= 1 || cpc <= 3) return { label: '🟡 Monitorar', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
  return { label: '🔴 Revisar', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
}

interface Rec { type: 'critical' | 'warning' | 'success' | 'info'; title: string; action: string }
const ICONS = { critical: '🔴', warning: '🟡', success: '🟢', info: '💡' }
const COLORS = {
  critical: { text: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  warning:  { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  success:  { text: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
  info:     { text: '#c4a35a', bg: 'rgba(196,163,90,0.08)', border: 'rgba(196,163,90,0.2)' },
}

function buildRecs(c: CampaignInsight): Rec[] {
  const ctr = parseFloat(c.ctr || '0')
  const cpc = parseFloat(c.cpc || '0')
  const spend = parseFloat(c.spend || '0')
  const impressions = parseInt(c.impressions || '0')
  const roas = c.purchase_roas?.[0]?.value ? parseFloat(c.purchase_roas[0].value) : null
  const msgs = getMessages(c)
  const costPerMsg = getCostPerMsg(c)
  const recs: Rec[] = []

  if (spend === 0) return [{ type: 'info', title: 'Sem gasto registrado', action: 'Campanha pode estar pausada ou sem dados no período selecionado.' }]

  if (ctr < 0.5 && impressions > 5000)
    recs.push({ type: 'critical', title: `CTR crítico (${ctr.toFixed(2)}%)`, action: 'Pause e substitua o criativo. Teste novo ângulo de oferta ou formato (vídeo vs imagem).' })
  else if (ctr < 1 && impressions > 2000)
    recs.push({ type: 'warning', title: `CTR abaixo do ideal (${ctr.toFixed(2)}%)`, action: 'Teste variações de copy e headline. Verifique alinhamento entre público e criativo.' })
  else if (ctr >= 2)
    recs.push({ type: 'success', title: `CTR excelente (${ctr.toFixed(2)}%)`, action: 'Mantenha o criativo. Considere escalar o orçamento em 20-30% a cada 2 dias.' })

  if (cpc > 5 && spend > 50)
    recs.push({ type: 'critical', title: `CPC muito alto (R$ ${cpc.toFixed(2)})`, action: 'Revise a segmentação — público pode estar saturado. Tente público mais amplo ou lookalike 3-5%.' })
  else if (cpc <= 1.5 && cpc > 0)
    recs.push({ type: 'success', title: `CPC eficiente (R$ ${cpc.toFixed(2)})`, action: 'Custo por clique saudável. Monitore frequência para não saturar o público.' })

  if (msgs > 0 && costPerMsg > 3)
    recs.push({ type: 'warning', title: `Custo por conversa alto (R$ ${costPerMsg.toFixed(2)})`, action: 'Compare com as campanhas de melhor CPL. Ajuste segmentação ou troque o criativo.' })
  else if (msgs > 0 && costPerMsg <= 1)
    recs.push({ type: 'success', title: `Custo por conversa excelente (R$ ${costPerMsg.toFixed(2)})`, action: 'Priorize esta campanha. Aumente orçamento gradualmente para escalar os resultados.' })

  if (roas !== null && roas < 1.5 && spend > 100)
    recs.push({ type: 'critical', title: `ROAS negativo (${roas.toFixed(2)}x)`, action: 'Pause imediatamente. Revise página de destino, preço do produto e funil de checkout.' })
  else if (roas !== null && roas >= 4)
    recs.push({ type: 'success', title: `ROAS excelente (${roas.toFixed(2)}x)`, action: 'Prioridade máxima de investimento. Crie lookalike baseado neste público.' })

  const freq = parseFloat(c.frequency || '0')
  if (freq > 3)
    recs.push({ type: 'warning', title: `Frequência alta (${freq.toFixed(1)}x)`, action: 'Público saturando. Renove o criativo ou expanda a segmentação.' })

  if (msgs === 0 && spend > 50)
    recs.push({ type: 'warning', title: 'Sem conversas no WhatsApp', action: 'Verifique se o botão de WhatsApp está ativo no anúncio. Considere trocar objetivo para "Mensagem".' })

  if (recs.length === 0)
    recs.push({ type: 'info', title: 'Desempenho dentro do esperado', action: 'Continue monitorando. Sem alertas críticos no período analisado.' })

  return recs
}

export default function CampaignTable({ insights }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = useMemo(() => [...insights]
    .filter(i => i.campaign_name?.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      const getVal = (c: CampaignInsight): number => {
        if (sortKey === 'roas') return parseFloat(c.purchase_roas?.[0]?.value || '0')
        return parseFloat((c[sortKey as keyof CampaignInsight] as string) || '0')
      }
      const diff = getVal(a) - getVal(b)
      return sortDir === 'asc' ? diff : -diff
    }), [insights, filter, sortKey, sortDir])

  const recsByID = useMemo(() => {
    const map = new Map<string, Rec[]>()
    sorted.forEach(c => map.set(c.campaign_id, buildRecs(c)))
    return map
  }, [sorted])

  const th = (label: string, key: SortKey) => (
    <th onClick={() => handleSort(key)} style={{
      padding: '10px 12px', textAlign: 'right', fontWeight: 600, fontSize: 12,
      color: sortKey === key ? 'var(--gold)' : 'var(--text-muted)',
      cursor: 'pointer', whiteSpace: 'nowrap',
      background: 'var(--surface2)', borderBottom: '1px solid var(--border)', userSelect: 'none',
    }}>
      {label} {sortKey === key ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  )

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      }}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Campanhas <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>({insights.length})</span>
        </div>
        <input
          placeholder="Filtrar por nome..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="campaign-filter"
          style={{
            background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6,
            padding: '6px 12px', color: 'var(--text)', fontSize: 13, outline: 'none',
          }}
        />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                Campanha
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                Status
              </th>
              {th('Gasto', 'spend')}
              {th('Impressões', 'impressions')}
              {th('Cliques', 'clicks')}
              {th('CTR', 'ctr')}
              {th('CPC', 'cpc')}
              {th('CPM', 'cpm')}
              {th('ROAS', 'roas')}
              <th style={{ padding: '10px 12px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const status = getCampaignStatus(c)
              const spend = parseFloat(c.spend || '0')
              const ctr = parseFloat(c.ctr || '0')
              const cpc = parseFloat(c.cpc || '0')
              const cpm = parseFloat(c.cpm || '0')
              const roas = c.purchase_roas?.[0]?.value ? parseFloat(c.purchase_roas[0].value) : null
              const isOpen = expanded.has(c.campaign_id)
              const recs = recsByID.get(c.campaign_id) ?? []
              const hasCritical = recs.some(r => r.type === 'critical')
              const hasWarning = recs.some(r => r.type === 'warning')

              return <React.Fragment key={c.campaign_id}>
                <tr
                  onClick={() => toggleExpand(c.campaign_id)}
                  style={{
                    background: isOpen ? 'rgba(196,163,90,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    borderBottom: isOpen ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <td style={{ padding: '12px 12px', maxWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {hasCritical && <span title="Atenção crítica" style={{ color: 'var(--red)', fontSize: 10 }}>●</span>}
                      {!hasCritical && hasWarning && <span title="Atenção" style={{ color: 'var(--yellow)', fontSize: 10 }}>●</span>}
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.campaign_name}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.campaign_id}</div>
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center' }}>{badge(status.label, status.color, status.bg)}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600 }}>{spend > 0 ? `R$ ${spend.toFixed(2)}` : '-'}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{parseInt(c.impressions || '0').toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{parseInt(c.clicks || '0').toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', color: ctr >= 2 ? 'var(--green)' : ctr >= 1 ? 'var(--yellow)' : ctr > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{ctr > 0 ? `${ctr.toFixed(2)}%` : '-'}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', color: cpc > 0 && cpc <= 1.5 ? 'var(--green)' : cpc > 3 ? 'var(--red)' : 'var(--text)' }}>{cpc > 0 ? `R$ ${cpc.toFixed(2)}` : '-'}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{cpm > 0 ? `R$ ${cpm.toFixed(2)}` : '-'}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', color: roas && roas >= 4 ? 'var(--green)' : roas && roas >= 2 ? 'var(--yellow)' : roas ? 'var(--red)' : 'var(--text-muted)' }}>{roas ? `${roas.toFixed(2)}x` : '-'}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    <span style={{ transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                  </td>
                </tr>

                {/* Accordion de recomendações */}
                {isOpen && (
                  <tr key={`${c.campaign_id}-recs`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td colSpan={10} style={{ padding: '0 12px 14px 36px', background: 'rgba(196,163,90,0.04)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                          Recomendações para esta campanha
                        </div>
                        {recs.map((rec, ri) => {
                          const col = COLORS[rec.type]
                          return (
                            <div key={ri} style={{
                              background: col.bg, border: `1px solid ${col.border}`,
                              borderRadius: 6, padding: '8px 12px',
                              display: 'flex', gap: 10, alignItems: 'flex-start',
                            }}>
                              <span style={{ fontSize: 13, flexShrink: 0 }}>{ICONS[rec.type]}</span>
                              <div>
                                <span style={{ fontWeight: 600, color: col.text, marginRight: 6 }}>{rec.title}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{rec.action}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
