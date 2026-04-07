import express from 'express'
import cors from 'cors'
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const TOKEN = process.env.META_TOKEN
if (!TOKEN) throw new Error('META_TOKEN não definido')

const BASE_URL = 'https://graph.facebook.com/v21.0'
const DATA_DIR = join(__dirname, '..', 'data')
const REPORTS_DIR = join(__dirname, '..', 'reports')

try { mkdirSync(DATA_DIR, { recursive: true }); mkdirSync(REPORTS_DIR, { recursive: true }) } catch {}

const app = express()
app.use(cors())
app.use(express.json())

async function metaFetch(path, params = {}) {
  const parts = [`access_token=${encodeURIComponent(TOKEN)}`]
  for (const [k, v] of Object.entries(params)) {
    parts.push(`${k}=${encodeURIComponent(String(v))}`)
  }
  const res = await fetch(`${BASE_URL}/${path}?${parts.join('&')}`)
  return res.json()
}

function saveJSON(filename, data) {
  try { writeFileSync(join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8') } catch {}
}

app.get('/api/token-status', async (req, res) => {
  try { res.json(await metaFetch('debug_token', { input_token: TOKEN })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/ad-accounts', async (req, res) => {
  try {
    const data = await metaFetch('me/adaccounts', {
      fields: 'id,name,account_status,currency,timezone_name,amount_spent,balance,spend_cap',
      limit: 100,
    })
    if (!data.error) saveJSON('ad_accounts.json', data)
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/campaigns/:accountId', async (req, res) => {
  try {
    const data = await metaFetch(`${req.params.accountId}/campaigns`, {
      fields: 'id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining',
      limit: 100,
    })
    if (!data.error) saveJSON(`campaigns_${req.params.accountId}.json`, data)
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/insights/account/:accountId/timeseries', async (req, res) => {
  const { accountId } = req.params
  const { since, until } = req.query
  const dateParam = since && until ? { time_range: JSON.stringify({ since, until }) } : { date_preset: 'maximum' }
  try {
    const data = await metaFetch(`${accountId}/insights`, {
      fields: ['impressions', 'clicks', 'spend', 'reach', 'cpm', 'cpc', 'ctr', 'actions', 'cost_per_action_type'].join(','),
      ...dateParam, time_increment: 1, level: 'account', limit: 500,
    })
    if (!data.error && !since) saveJSON(`timeseries_${accountId}.json`, data)
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/insights/account/:accountId/campaigns', async (req, res) => {
  const { accountId } = req.params
  const { since, until } = req.query
  const dateParam = since && until ? { time_range: JSON.stringify({ since, until }) } : { date_preset: 'maximum' }
  try {
    const data = await metaFetch(`${accountId}/insights`, {
      fields: [
        'campaign_id', 'campaign_name', 'adset_name', 'impressions',
        'clicks', 'spend', 'reach', 'frequency', 'cpm', 'cpc', 'ctr', 'cpp',
        'actions', 'cost_per_action_type', 'unique_clicks', 'unique_ctr',
        'website_purchase_roas', 'purchase_roas',
      ].join(','),
      ...dateParam, level: 'campaign', limit: 200,
    })
    if (!data.error && !since) saveJSON(`all_campaigns_insights_${accountId}.json`, data)
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/instagram/discover', async (_req, res) => {
  try {
    const data = await metaFetch('me/accounts', {
      fields: 'id,name,instagram_business_account{id,username,name,followers_count,profile_picture_url}',
      limit: 50,
    })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/instagram/profile/:igUserId', async (req, res) => {
  try {
    const data = await metaFetch(req.params.igUserId, {
      fields: 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website',
    })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/instagram/insights/:igUserId', async (req, res) => {
  const { igUserId } = req.params
  const { since, until } = req.query
  // Instagram Insights API requires Unix timestamps
  const toTs = (dateStr, endOfDay = false) => {
    if (!dateStr) return undefined
    const d = new Date(dateStr + (endOfDay ? 'T23:59:59' : 'T00:00:00'))
    return Math.floor(d.getTime() / 1000)
  }
  try {
    const params = {
      metric: 'impressions,reach,profile_views,follower_count,website_clicks',
      period: 'day',
      ...(since ? { since: toTs(since) } : {}),
      ...(until ? { until: toTs(until, true) } : {}),
    }
    const data = await metaFetch(`${igUserId}/insights`, params)
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/instagram/media/:igUserId', async (req, res) => {
  try {
    const data = await metaFetch(`${req.params.igUserId}/media`, {
      fields: 'id,caption,media_type,timestamp,like_count,comments_count,permalink,media_url,thumbnail_url',
      limit: 24,
    })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/instagram/stories/:igUserId', async (req, res) => {
  try {
    const storiesRes = await metaFetch(`${req.params.igUserId}/stories`, {
      fields: 'id,timestamp,media_type,media_url,thumbnail_url',
      limit: 50,
    })
    if (storiesRes.error || !storiesRes.data?.length) {
      return res.json({ data: [] })
    }
    // Fetch insights for each story in parallel
    const withInsights = await Promise.all(
      storiesRes.data.map(async story => {
        try {
          const ins = await metaFetch(`${story.id}/insights`, {
            metric: 'impressions,reach,exits,replies',
          })
          return { ...story, insights: ins.data || [] }
        } catch {
          return { ...story, insights: [] }
        }
      })
    )
    res.json({ data: withInsights })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/generate-report', async (req, res) => {
  const { accountId, since, until, type = 'ads', igUserId } = req.body
  const dateParam = since && until ? { time_range: JSON.stringify({ since, until }) } : { date_preset: 'maximum' }
  const period = since && until ? `${since} até ${until}` : 'Todo o histórico'
  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  try {
    let report = `# Relatório LZX Pesca\n**Gerado em:** ${now}  \n**Período:** ${period}\n\n---\n\n`

    if (type === 'ads' || type === 'all') {
      const [accRes, campRes] = await Promise.all([
        metaFetch(accountId, { fields: 'name,currency,amount_spent' }),
        metaFetch(`${accountId}/insights`, {
          fields: 'campaign_name,impressions,clicks,spend,reach,cpm,cpc,ctr,frequency,actions,cost_per_action_type,purchase_roas',
          ...dateParam, level: 'campaign', limit: 200,
        }),
      ])
      const camps = campRes.data || []
      const totals = camps.reduce((acc, c) => {
        acc.spend += parseFloat(c.spend || '0')
        acc.impressions += parseInt(c.impressions || '0')
        acc.clicks += parseInt(c.clicks || '0')
        acc.reach += parseInt(c.reach || '0')
        const msgs = (c.actions || []).filter(a => a.action_type.includes('messaging')).reduce((s, a) => s + parseFloat(a.value), 0)
        acc.msgs += msgs
        return acc
      }, { spend: 0, impressions: 0, clicks: 0, reach: 0, msgs: 0 })
      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100).toFixed(2) : '0.00'
      const cpc = totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : '0.00'

      report += `## 📊 Meta Ads — ${accRes.name || accountId}\n\n`
      report += `### Consolidado\n`
      report += `| Métrica | Valor |\n|---|---|\n`
      report += `| 💰 Total Investido | R$ ${totals.spend.toFixed(2)} |\n`
      report += `| 👁️ Impressões | ${totals.impressions.toLocaleString('pt-BR')} |\n`
      report += `| 🖱️ Cliques | ${totals.clicks.toLocaleString('pt-BR')} |\n`
      report += `| 📡 Alcance | ${totals.reach.toLocaleString('pt-BR')} |\n`
      report += `| 📊 CTR Médio | ${ctr}% |\n`
      report += `| 💳 CPC Médio | R$ ${cpc} |\n`
      if (totals.msgs > 0) report += `| 💬 Conversas WhatsApp | ${totals.msgs.toFixed(0)} |\n`
      report += `\n### Campanhas\n`
      for (const c of camps) {
        const spend = parseFloat(c.spend || '0')
        if (spend === 0) continue
        const ctrC = parseFloat(c.ctr || '0').toFixed(2)
        const cpcC = parseFloat(c.cpc || '0').toFixed(2)
        const roas = c.purchase_roas?.[0]?.value ? parseFloat(c.purchase_roas[0].value).toFixed(2) : null
        report += `\n**${c.campaign_name}**\n`
        report += `- Gasto: R$ ${spend.toFixed(2)} | Impressões: ${parseInt(c.impressions || '0').toLocaleString('pt-BR')} | Cliques: ${c.clicks} | CTR: ${ctrC}% | CPC: R$ ${cpcC}`
        if (roas) report += ` | ROAS: ${roas}x`
        report += '\n'
      }
      report += '\n'
    }

    if (type === 'instagram' || type === 'all') {
      if (!igUserId) {
        report += `## 📸 Instagram\n\n_ID da conta Instagram não informado._\n\n`
      } else {
        const toTs = (d, end = false) => d ? Math.floor(new Date(d + (end ? 'T23:59:59' : 'T00:00:00')).getTime() / 1000) : undefined
        const [prof, ins, med] = await Promise.all([
          metaFetch(igUserId, { fields: 'username,followers_count,follows_count,media_count' }),
          metaFetch(`${igUserId}/insights`, {
            metric: 'impressions,reach,profile_views,follower_count,website_clicks',
            period: 'day',
            ...(since ? { since: toTs(since) } : {}),
            ...(until ? { until: toTs(until, true) } : {}),
          }),
          metaFetch(`${igUserId}/media`, { fields: 'like_count,comments_count', limit: 50 }),
        ])
        const insArr = ins.data || []
        const sumIg = name => insArr.find(i => i.name === name)?.values.reduce((s, v) => s + v.value, 0) ?? 0
        const totalLikes = (med.data || []).reduce((s, m) => s + m.like_count, 0)
        const totalComments = (med.data || []).reduce((s, m) => s + m.comments_count, 0)

        report += `## 📸 Instagram — @${prof.username}\n\n`
        report += `| Métrica | Valor |\n|---|---|\n`
        report += `| 👥 Seguidores | ${(prof.followers_count || 0).toLocaleString('pt-BR')} |\n`
        report += `| ➕ Novos Seguidores | ${sumIg('follower_count').toLocaleString('pt-BR')} |\n`
        report += `| 📡 Alcance | ${sumIg('reach').toLocaleString('pt-BR')} |\n`
        report += `| 👁️ Impressões | ${sumIg('impressions').toLocaleString('pt-BR')} |\n`
        report += `| 🔍 Visitas ao Perfil | ${sumIg('profile_views').toLocaleString('pt-BR')} |\n`
        report += `| 🔗 Cliques no Site | ${sumIg('website_clicks').toLocaleString('pt-BR')} |\n`
        report += `| ❤️ Curtidas (posts recentes) | ${totalLikes.toLocaleString('pt-BR')} |\n`
        report += `| 💬 Comentários | ${totalComments.toLocaleString('pt-BR')} |\n`
        report += '\n'
      }
    }

    report += `---\n_Relatório gerado automaticamente pelo Dashboard LZX Pesca_\n`
    res.json({ success: true, report })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/cached', (_req, res) => {
  try { res.json({ files: readdirSync(DATA_DIR).filter(f => f.endsWith('.json')) }) }
  catch { res.json({ files: [] }) }
})

app.get('/api/cached/:filename', (req, res) => {
  const file = join(DATA_DIR, req.params.filename)
  if (existsSync(file)) res.json(JSON.parse(readFileSync(file, 'utf-8')))
  else res.status(404).json({ error: 'Arquivo não encontrado' })
})

export default app
