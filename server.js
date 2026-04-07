import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const express = require('express')
const cors = require('cors')
const { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } = require('fs')
const { join } = require('path')
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3001
const BASE_URL = 'https://graph.facebook.com/v21.0'

// Token — atualiza aqui quando tiver o token com ads_read
const TOKEN = process.env.META_TOKEN || 'EAAUW2a3lyIkBROAlkZB1CACeTKnl6iQcyQ8ZAMyqk6DZC4HJVpSB8w3eezqZAHCu1ZAg1e3uuvuNYrpS7PWoKtH807IpXM9AjglYDCZBBJvVkG8hCJZClrxQnltHe1SJvHtgzjBgGjYZBPCpLnRyoLOAJeN0L6N53JZCnWY2CZB2NAeNJZADN2UNjZCdZCIQlkyzPMSZCXI74whC8SMGBGWXo7KCARzZAlxMIA7D2BsmEq5B74fvdWehn8hvAoARhsK9I06QuDRduUkBpum013saevPIVvtvkoHIF9BOVxlVcZAZB9lr0driucDMgydeEWXRyb4IhKGcU0yiyQBmmK48My7uVMvZCDj12dfwZDZD'

app.use(cors())
app.use(express.json())

// Garante que os diretórios existam
mkdirSync(join(__dirname, 'data'), { recursive: true })
mkdirSync(join(__dirname, 'reports'), { recursive: true })

async function metaFetch(path, params = {}) {
  // Constrói query string manualmente para preservar a codificação do time_range
  const parts = [`access_token=${encodeURIComponent(TOKEN)}`]
  for (const [k, v] of Object.entries(params)) {
    parts.push(`${k}=${encodeURIComponent(String(v))}`)
  }
  const fullUrl = `${BASE_URL}/${path}?${parts.join('&')}`
  const res = await fetch(fullUrl)
  return res.json()
}

function saveJSON(filename, data) {
  const path = join(__dirname, 'data', filename)
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`[data] Salvo: ${path}`)
  return path
}

// ── Rotas ──────────────────────────────────────────────────────────────────

// Status do token
app.get('/api/token-status', async (req, res) => {
  try {
    const data = await metaFetch('debug_token', { input_token: TOKEN })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Contas de anúncio
app.get('/api/ad-accounts', async (req, res) => {
  try {
    const data = await metaFetch('me/adaccounts', {
      fields: 'id,name,account_status,currency,timezone_name,amount_spent,balance,spend_cap',
      limit: 100,
    })
    if (!data.error) saveJSON('ad_accounts.json', data)
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Campanhas de uma conta
app.get('/api/campaigns/:accountId', async (req, res) => {
  const { accountId } = req.params
  try {
    const data = await metaFetch(`${accountId}/campaigns`, {
      fields: 'id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining',
      limit: 100,
    })
    if (!data.error) saveJSON(`campaigns_${accountId}.json`, data)
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Insights de uma campanha (período máximo)
app.get('/api/insights/campaign/:campaignId', async (req, res) => {
  const { campaignId } = req.params
  const { period = 'maximum' } = req.query
  try {
    const data = await metaFetch(`${campaignId}/insights`, {
      fields: [
        'campaign_id', 'campaign_name', 'impressions', 'clicks', 'spend',
        'reach', 'frequency', 'cpm', 'cpc', 'ctr', 'cpp',
        'actions', 'cost_per_action_type',
        'unique_clicks', 'unique_ctr',
        'video_30_sec_watched_actions', 'video_avg_time_watched_actions',
        'website_purchase_roas', 'purchase_roas',
      ].join(','),
      date_preset: period,
      level: 'campaign',
    })
    if (!data.error) saveJSON(`insights_campaign_${campaignId}.json`, data)
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Insights por dia de uma conta (série temporal)
app.get('/api/insights/account/:accountId/timeseries', async (req, res) => {
  const { accountId } = req.params
  const { since, until } = req.query
  const dateParam = since && until
    ? { time_range: JSON.stringify({ since, until }) }
    : { date_preset: 'maximum' }
  try {
    const data = await metaFetch(`${accountId}/insights`, {
      fields: [
        'impressions', 'clicks', 'spend', 'reach',
        'cpm', 'cpc', 'ctr', 'actions', 'cost_per_action_type',
      ].join(','),
      ...dateParam,
      time_increment: 1,
      level: 'account',
      limit: 500,
    })
    if (!data.error && !since) saveJSON(`timeseries_${accountId}.json`, data)
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Insights de TODOS as campanhas de uma conta
app.get('/api/insights/account/:accountId/campaigns', async (req, res) => {
  const { accountId } = req.params
  const { since, until } = req.query
  const dateParam = since && until
    ? { time_range: JSON.stringify({ since, until }) }
    : { date_preset: 'maximum' }
  try {
    const data = await metaFetch(`${accountId}/insights`, {
      fields: [
        'campaign_id', 'campaign_name', 'adset_name', 'impressions',
        'clicks', 'spend', 'reach', 'frequency',
        'cpm', 'cpc', 'ctr', 'cpp',
        'actions', 'cost_per_action_type',
        'unique_clicks', 'unique_ctr',
        'website_purchase_roas', 'purchase_roas',
      ].join(','),
      ...dateParam,
      level: 'campaign',
      limit: 200,
    })
    if (!data.error && !since) saveJSON(`all_campaigns_insights_${accountId}.json`, data)
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Dados brutos existentes em cache
app.get('/api/cached/:filename', (req, res) => {
  const file = join(__dirname, 'data', req.params.filename)
  if (existsSync(file)) {
    res.json(JSON.parse(readFileSync(file, 'utf-8')))
  } else {
    res.status(404).json({ error: 'Arquivo não encontrado' })
  }
})

// Lista todos os arquivos de cache
app.get('/api/cached', (_req, res) => {
  const dir = join(__dirname, 'data')
  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.json'))
    res.json({ files })
  } catch {
    res.json({ files: [] })
  }
})

// Gerar relatório de análise
app.post('/api/generate-report', async (req, res) => {
  const { accountId, since, until } = req.body
  if (!accountId) return res.status(400).json({ error: 'accountId obrigatório' })

  const dateParam = since && until
    ? { time_range: JSON.stringify({ since, until }) }
    : { date_preset: 'maximum' }

  try {
    // Busca dados completos
    const [campaigns, insights] = await Promise.all([
      metaFetch(`${accountId}/campaigns`, {
        fields: 'id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget',
        limit: 100,
      }),
      metaFetch(`${accountId}/insights`, {
        fields: 'campaign_id,campaign_name,impressions,clicks,spend,reach,cpm,cpc,ctr,actions,cost_per_action_type,purchase_roas',
        ...dateParam,
        level: 'campaign',
        limit: 200,
      }),
    ])

    saveJSON(`report_raw_${accountId}.json`, { campaigns, insights, generated_at: new Date().toISOString() })

    const report = generateMarkdownReport(campaigns, insights, accountId)
    const reportPath = join(__dirname, 'reports', `analise_${accountId}_${Date.now()}.md`)
    writeFileSync(reportPath, report, 'utf-8')

    res.json({ success: true, report, reportPath })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

function generateMarkdownReport(campaigns, insights, accountId) {
  const now = new Date().toLocaleString('pt-BR')
  const insightList = insights?.data || []
  const campaignList = campaigns?.data || []

  const totals = insightList.reduce((acc, c) => {
    acc.spend += parseFloat(c.spend || 0)
    acc.impressions += parseInt(c.impressions || 0)
    acc.clicks += parseInt(c.clicks || 0)
    acc.reach += parseInt(c.reach || 0)
    return acc
  }, { spend: 0, impressions: 0, clicks: 0, reach: 0 })

  const avgCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100).toFixed(2) : '0'
  const avgCPC = totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : '0'
  const avgCPM = totals.impressions > 0 ? (totals.spend / totals.impressions * 1000).toFixed(2) : '0'

  let report = `# Relatório de Análise de Campanhas — LZX Pesca
**Conta:** ${accountId}
**Gerado em:** ${now}
**Período:** Máximo (todo o histórico)

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Total Investido | R$ ${totals.spend.toFixed(2)} |
| Total Impressões | ${totals.impressions.toLocaleString('pt-BR')} |
| Total Cliques | ${totals.clicks.toLocaleString('pt-BR')} |
| Alcance Total | ${totals.reach.toLocaleString('pt-BR')} |
| CTR Médio | ${avgCTR}% |
| CPC Médio | R$ ${avgCPC} |
| CPM Médio | R$ ${avgCPM} |
| Total de Campanhas | ${campaignList.length} |

---

## Análise por Campanha

`

  for (const insight of insightList) {
    const ctr = insight.ctr ? parseFloat(insight.ctr).toFixed(2) : 'N/A'
    const cpc = insight.cpc ? `R$ ${parseFloat(insight.cpc).toFixed(2)}` : 'N/A'
    const cpm = insight.cpm ? `R$ ${parseFloat(insight.cpm).toFixed(2)}` : 'N/A'
    const spend = insight.spend ? `R$ ${parseFloat(insight.spend).toFixed(2)}` : 'N/A'
    const roas = insight.purchase_roas?.[0]?.value
      ? parseFloat(insight.purchase_roas[0].value).toFixed(2)
      : 'N/A'

    let status = '🟡 Monitorar'
    const ctrNum = parseFloat(insight.ctr || 0)
    const cpcNum = parseFloat(insight.cpc || 999)
    if (ctrNum >= 2 && cpcNum <= 1.5) status = '🟢 Escalar'
    else if (ctrNum < 0.5 || cpcNum > 5) status = '🔴 Revisar/Pausar'

    report += `### ${insight.campaign_name || insight.campaign_id}
**Status:** ${status}

| Métrica | Valor |
|---------|-------|
| Gasto | ${spend} |
| Impressões | ${parseInt(insight.impressions || 0).toLocaleString('pt-BR')} |
| Cliques | ${parseInt(insight.clicks || 0).toLocaleString('pt-BR')} |
| CTR | ${ctr}% |
| CPC | ${cpc} |
| CPM | ${cpm} |
| ROAS | ${roas} |

`

    // Recomendações automáticas
    report += `**Recomendações:**\n`
    if (ctrNum < 1) report += `- ⚠️ CTR abaixo de 1% — revise o criativo e a copy do anúncio\n`
    if (ctrNum >= 2) report += `- ✅ CTR acima de 2% — bom desempenho, considere escalar o budget\n`
    if (cpcNum > 3) report += `- ⚠️ CPC acima de R$3 — tente refinar a segmentação ou trocar o criativo\n`
    if (cpcNum <= 1) report += `- ✅ CPC eficiente — manter ou aumentar budget gradualmente\n`
    if (roas !== 'N/A' && parseFloat(roas) < 2) report += `- ⚠️ ROAS abaixo de 2x — revisar funil de conversão e página de destino\n`
    if (roas !== 'N/A' && parseFloat(roas) >= 4) report += `- ✅ Excelente ROAS — prioridade máxima de investimento\n`
    report += '\n---\n\n'
  }

  report += `## Recomendações Gerais

1. **Consolidar campanhas de baixo volume** — campanhas com menos de 1.000 impressões têm dados insuficientes para otimização
2. **Testar diferentes formatos** — Reels e Stories tendem a ter CPM mais baixo no nicho de pesca
3. **Públicos lookalike** — com base nos compradores existentes, criar públicos semelhantes de 1-3%
4. **Retargeting** — segmentar visitantes do site que não converteram nos últimos 30 dias
5. **Horários de exibição** — analisar se finais de semana/manhãs têm melhor desempenho para o público de pescadores
6. **Sazonalidade** — mapear picos de temporada de pesca para intensificar investimento nesses períodos

---

*Relatório gerado automaticamente pelo Claude Gestor - LZX Pesca*
`

  return report
}

app.listen(PORT, () => {
  console.log(`\n🎣 LZX Pesca API Server rodando em http://localhost:${PORT}`)
  console.log(`📊 Dashboard em http://localhost:3000\n`)
})
