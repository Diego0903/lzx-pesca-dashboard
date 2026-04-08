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
  const { accountId, since, until, type = 'ads', igUserId, mode = 'technical' } = req.body
  const dateParam = since && until ? { time_range: JSON.stringify({ since, until }) } : { date_preset: 'maximum' }
  const period = since && until ? `${since} até ${until}` : 'Todo o histórico'
  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const isTech = mode === 'technical'
  const toTs = (d, end = false) => d ? Math.floor(new Date(d + (end ? 'T23:59:59' : 'T00:00:00')).getTime() / 1000) : undefined

  try {
    const modeLabel = isTech ? 'Gestor de Tráfego' : 'Relatório Executivo'
    let report = `# ${modeLabel} — LZX Pesca\n**Gerado em:** ${now}  \n**Período:** ${period}\n\n---\n\n`

    // ── META ADS ──────────────────────────────────────────────────
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
        const purchases = (c.actions || []).filter(a => a.action_type === 'purchase').reduce((s, a) => s + parseFloat(a.value), 0)
        acc.purchases += purchases
        return acc
      }, { spend: 0, impressions: 0, clicks: 0, reach: 0, msgs: 0, purchases: 0 })
      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0
      const cpc = totals.clicks > 0 ? (totals.spend / totals.clicks) : 0
      const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions * 1000) : 0

      if (isTech) {
        // ── Técnico: todas as métricas + campanhas detalhadas ──
        report += `## 📊 Meta Ads — ${accRes.name || accountId}\n\n`
        report += `### Consolidado\n`
        report += `| Métrica | Valor |\n|---|---|\n`
        report += `| 💰 Total Investido | R$ ${totals.spend.toFixed(2)} |\n`
        report += `| 👁️ Impressões | ${totals.impressions.toLocaleString('pt-BR')} |\n`
        report += `| 🖱️ Cliques | ${totals.clicks.toLocaleString('pt-BR')} |\n`
        report += `| 📡 Alcance | ${totals.reach.toLocaleString('pt-BR')} |\n`
        report += `| 📊 CTR Médio | ${ctr.toFixed(2)}% |\n`
        report += `| 💳 CPC Médio | R$ ${cpc.toFixed(2)} |\n`
        report += `| 📣 CPM Médio | R$ ${cpm.toFixed(2)} |\n`
        if (totals.msgs > 0) report += `| 💬 Conversas WhatsApp | ${totals.msgs.toFixed(0)} |\n`
        if (totals.purchases > 0) report += `| 🛒 Compras | ${totals.purchases.toFixed(0)} |\n`

        const activeCamps = camps.filter(c => parseFloat(c.spend || '0') > 0)
        if (activeCamps.length > 0) {
          report += `\n### Campanhas (${activeCamps.length} com gasto)\n`
          report += `| Campanha | Gasto | Impressões | Cliques | CTR | CPC | CPM | ROAS |\n`
          report += `|---|---|---|---|---|---|---|---|\n`
          for (const c of activeCamps) {
            const sp = parseFloat(c.spend || '0')
            const ctrC = parseFloat(c.ctr || '0').toFixed(2)
            const cpcC = parseFloat(c.cpc || '0').toFixed(2)
            const cpmC = parseFloat(c.cpm || '0').toFixed(2)
            const roas = c.purchase_roas?.[0]?.value ? parseFloat(c.purchase_roas[0].value).toFixed(2) + 'x' : '—'
            const imp = parseInt(c.impressions || '0').toLocaleString('pt-BR')
            report += `| ${c.campaign_name} | R$ ${sp.toFixed(2)} | ${imp} | ${c.clicks} | ${ctrC}% | R$ ${cpcC} | R$ ${cpmC} | ${roas} |\n`
          }
        }
        report += '\n'
      } else {
        // ── Executivo: linguagem simples, só o essencial ──
        const perfLabel = ctr >= 2 ? '✅ Bom desempenho' : ctr >= 1 ? '🟡 Desempenho razoável' : '🔴 Desempenho abaixo do esperado'
        report += `## 📊 Anúncios no Meta (Facebook e Instagram)\n\n`
        report += `### Resumo do Período\n`
        report += `| | |\n|---|---|\n`
        report += `| 💰 Total investido em anúncios | **R$ ${totals.spend.toFixed(2)}** |\n`
        report += `| 👥 Pessoas alcançadas | **${totals.reach.toLocaleString('pt-BR')}** |\n`
        report += `| 👁️ Vezes que o anúncio foi visto | **${totals.impressions.toLocaleString('pt-BR')}** |\n`
        report += `| 🖱️ Pessoas que clicaram | **${totals.clicks.toLocaleString('pt-BR')}** |\n`
        if (totals.msgs > 0) report += `| 💬 Conversas iniciadas no WhatsApp | **${totals.msgs.toFixed(0)}** |\n`
        if (totals.purchases > 0) report += `| 🛒 Vendas registradas | **${totals.purchases.toFixed(0)}** |\n`
        report += `\n### Avaliação Geral\n`
        report += `${perfLabel}\n\n`
        if (totals.msgs > 0 && totals.spend > 0) {
          const cpp = (totals.spend / totals.msgs).toFixed(2)
          report += `Cada conversa no WhatsApp custou em média **R$ ${cpp}**.\n\n`
        }
        const activeCamps = camps.filter(c => parseFloat(c.spend || '0') > 0)
        if (activeCamps.length > 0) {
          report += `### Campanhas Ativas (${activeCamps.length})\n`
          for (const c of activeCamps) {
            const sp = parseFloat(c.spend || '0')
            const msgs = (c.actions || []).filter(a => a.action_type.includes('messaging')).reduce((s, a) => s + parseFloat(a.value), 0)
            report += `- **${c.campaign_name}** — R$ ${sp.toFixed(2)} investido`
            if (msgs > 0) report += `, ${msgs.toFixed(0)} conversas`
            report += '\n'
          }
          report += '\n'
        }
      }
    }

    // ── INSTAGRAM ────────────────────────────────────────────────
    if (type === 'instagram' || type === 'all') {
      if (!igUserId) {
        report += `## 📸 Instagram\n\n_Acesse a aba Instagram no dashboard e atualize para incluir esses dados._\n\n`
      } else {
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
        const followers = prof.followers_count || 0
        const newFollowers = sumIg('follower_count')

        if (isTech) {
          report += `## 📸 Instagram — @${prof.username}\n\n`
          report += `| Métrica | Valor |\n|---|---|\n`
          report += `| 👥 Total de Seguidores | ${followers.toLocaleString('pt-BR')} |\n`
          report += `| ➕ Novos Seguidores no Período | ${newFollowers.toLocaleString('pt-BR')} |\n`
          report += `| 📡 Alcance | ${sumIg('reach').toLocaleString('pt-BR')} |\n`
          report += `| 👁️ Impressões | ${sumIg('impressions').toLocaleString('pt-BR')} |\n`
          report += `| 🔍 Visitas ao Perfil | ${sumIg('profile_views').toLocaleString('pt-BR')} |\n`
          report += `| 🔗 Cliques no Link da Bio | ${sumIg('website_clicks').toLocaleString('pt-BR')} |\n`
          report += `| ❤️ Curtidas (posts recentes) | ${totalLikes.toLocaleString('pt-BR')} |\n`
          report += `| 💬 Comentários | ${totalComments.toLocaleString('pt-BR')} |\n`
        } else {
          report += `## 📸 Instagram (@${prof.username})\n\n`
          report += `### Resumo do Período\n`
          report += `| | |\n|---|---|\n`
          report += `| 👥 Total de seguidores | **${followers.toLocaleString('pt-BR')}** |\n`
          if (newFollowers > 0) report += `| ➕ Seguidores novos no período | **+${newFollowers.toLocaleString('pt-BR')}** |\n`
          report += `| 👁️ Pessoas que viram o perfil | **${sumIg('reach').toLocaleString('pt-BR')}** |\n`
          report += `| 🔍 Visitas à página do perfil | **${sumIg('profile_views').toLocaleString('pt-BR')}** |\n`
          if (sumIg('website_clicks') > 0) report += `| 🔗 Cliques no link da bio | **${sumIg('website_clicks').toLocaleString('pt-BR')}** |\n`
          report += `| ❤️ Curtidas nos posts | **${totalLikes.toLocaleString('pt-BR')}** |\n`
          report += `| 💬 Comentários nos posts | **${totalComments.toLocaleString('pt-BR')}** |\n`
        }
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
