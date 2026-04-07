import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { CampaignInsight } from '../types'
import { fmtBRL } from '../utils/formatters'
import { getMessages, getCostPerMsg, getCostPerMsgColor } from '../utils/campaignMetrics'

interface Props {
  insights: CampaignInsight[]
}

const WHATSAPP_GREEN = '#25D366'
const WHATSAPP_DARK = '#128C7E'

export default function WhatsAppSection({ insights }: Props) {
  const campaigns = useMemo(() => insights
    .map(c => ({
      name: c.campaign_name,
      id: c.campaign_id,
      spend: parseFloat(c.spend || '0'),
      messages: getMessages(c),
      costPerMsg: getCostPerMsg(c),
    }))
    .filter(c => c.messages > 0)
    .sort((a, b) => a.costPerMsg - b.costPerMsg),
  [insights])

  const { totalMessages, totalSpendOnMsg } = useMemo(() => campaigns.reduce(
    (acc, c) => { acc.totalMessages += c.messages; acc.totalSpendOnMsg += c.spend; return acc },
    { totalMessages: 0, totalSpendOnMsg: 0 }
  ), [campaigns])

  const avgCostPerMsg = totalMessages > 0 ? totalSpendOnMsg / totalMessages : 0
  const bestCampaign = campaigns[0]
  const worstCampaign = campaigns[campaigns.length - 1]

  const chartData = useMemo(() => campaigns.map(c => ({
    name: c.name.length > 22 ? c.name.slice(0, 22) + '…' : c.name,
    fullName: c.name,
    messages: c.messages,
    costPerMsg: parseFloat(c.costPerMsg.toFixed(2)),
    spend: c.spend,
  })), [campaigns])

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 22 }}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="#25D366"/>
            <path d="M23.5 8.5C21.6 6.6 19.1 5.5 16.4 5.5C10.9 5.5 6.4 10 6.4 15.5C6.4 17.3 6.9 19.1 7.7 20.7L6.3 26.5L12.2 25.1C13.8 25.9 15.1 26.3 16.4 26.3C21.9 26.3 26.4 21.8 26.4 16.3C26.5 13.5 25.4 11 23.5 8.5ZM16.4 24.5C15.2 24.5 14 24.2 12.9 23.6L12.6 23.4L9.1 24.3L10 20.9L9.8 20.6C9.1 19.4 8.7 18.1 8.7 16.6C8.7 12.3 12.2 8.8 16.5 8.8C18.6 8.8 20.5 9.6 22 11.1C23.5 12.6 24.2 14.5 24.2 16.6C24.1 20.9 20.7 24.5 16.4 24.5ZM20.7 18.4C20.5 18.3 19.4 17.7 19.2 17.7C19 17.6 18.9 17.6 18.7 17.8C18.6 18 18.1 18.6 18 18.7C17.9 18.9 17.7 18.9 17.6 18.8C17.4 18.7 16.6 18.4 15.7 17.6C15 17 14.5 16.2 14.4 16C14.3 15.8 14.4 15.7 14.5 15.6L14.8 15.3C14.9 15.2 14.9 15.1 15 15C15.1 14.9 15.1 14.8 15 14.6C14.9 14.5 14.5 13.4 14.3 13C14.1 12.6 13.9 12.7 13.8 12.7H13.5C13.3 12.7 13.1 12.8 12.9 13C12.7 13.2 12.1 13.8 12.1 14.9C12.1 16 12.9 17.1 13 17.2C13.1 17.4 14.5 19.5 16.5 20.4C17 20.6 17.4 20.8 17.7 20.9C18.2 21.1 18.7 21.1 19.1 21C19.5 20.9 20.4 20.4 20.6 19.9C20.8 19.4 20.8 19 20.7 18.9C20.7 18.7 20.8 18.5 20.7 18.4Z" fill="white"/>
          </svg>
        </span>
        <div>
          <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WhatsApp — Conversas Iniciadas</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Principal canal de conversão da LZX Pesca</div>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {/* Cards de resumo */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          {[
            {
              label: 'Total de Conversas',
              value: <span style={{ fontSize: 28, fontWeight: 700, color: WHATSAPP_GREEN }}>{totalMessages.toLocaleString('pt-BR')}</span>,
              sub: 'todo o histórico',
            },
            {
              label: 'Custo Médio / Conversa',
              value: <span style={{ fontSize: 28, fontWeight: 700, color: avgCostPerMsg < 1 ? WHATSAPP_GREEN : avgCostPerMsg < 2.5 ? 'var(--yellow)' : 'var(--red)' }}>{fmtBRL(avgCostPerMsg)}</span>,
              sub: avgCostPerMsg < 1 ? '✅ Muito eficiente' : avgCostPerMsg < 2.5 ? '🟡 Razoável' : '🔴 Alto',
            },
            {
              label: 'Melhor Campanha',
              value: <span style={{ fontSize: 18, fontWeight: 700, color: WHATSAPP_GREEN }}>{bestCampaign ? fmtBRL(bestCampaign.costPerMsg) : '—'}</span>,
              sub: bestCampaign?.name.slice(0, 28) || '—',
              dimBg: false,
            },
            {
              label: 'Pior Campanha',
              value: <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>{worstCampaign ? fmtBRL(worstCampaign.costPerMsg) : '—'}</span>,
              sub: worstCampaign?.name.slice(0, 28) || '—',
              isWorst: true,
            },
          ].map((card, i) => (
            <div key={i} style={{
              flex: '1 1 140px',
              background: card.isWorst ? 'rgba(239,68,68,0.06)' : 'rgba(37,211,102,0.1)',
              border: `1px solid ${card.isWorst ? 'rgba(239,68,68,0.2)' : 'rgba(37,211,102,0.25)'}`,
              borderRadius: 8,
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{card.label}</div>
              {card.value}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Gráfico: mensagens por campanha */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>
            Mensagens Iniciadas por Campanha
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 32, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={160} />
              <Tooltip
                contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                formatter={(value: number, _: string, entry: { payload?: { fullName?: string; spend?: number; costPerMsg?: number } }) => [
                  <div key="tip">
                    <div>{value.toLocaleString('pt-BR')} conversas</div>
                    <div>Gasto: {fmtBRL(entry.payload?.spend ?? 0)}</div>
                    <div>Custo/msg: {fmtBRL(entry.payload?.costPerMsg ?? 0)}</div>
                  </div>,
                  entry.payload?.fullName ?? ''
                ]}
              />
              <Bar dataKey="messages" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={getCostPerMsgColor(entry.costPerMsg)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela ranking */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-muted)' }}>
            Ranking — Custo por Conversa WhatsApp
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {campaigns.map((c, i) => {
              const barColor = getCostPerMsgColor(c.costPerMsg)
              const pct = worstCampaign.costPerMsg > 0
                ? Math.min(100, (c.costPerMsg / worstCampaign.costPerMsg) * 100)
                : 0

              return (
                <div key={c.id} style={{
                  background: 'var(--surface2)',
                  borderRadius: 7,
                  padding: '10px 14px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${pct}%`,
                    background: `${barColor}18`,
                    borderRight: `2px solid ${barColor}40`,
                    transition: 'width 0.5s ease',
                  }} />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', width: 20, textAlign: 'center' }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {c.messages.toLocaleString('pt-BR')} conversas · {fmtBRL(c.spend)} investido
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: barColor }}>
                        {fmtBRL(c.costPerMsg)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>por conversa</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dica */}
        <div style={{
          marginTop: 16,
          background: 'rgba(37,211,102,0.07)',
          border: '1px solid rgba(37,211,102,0.2)',
          borderRadius: 7,
          padding: '10px 14px',
          fontSize: 13,
          color: 'var(--text-muted)',
        }}>
          <strong style={{ color: WHATSAPP_DARK }}>💡 Meta de referência:</strong> Custo por conversa abaixo de R$1,00 é excelente para o nicho de pesca. Acima de R$3,00 indica necessidade de revisar criativo ou segmentação.
        </div>
      </div>
    </div>
  )
}
