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
    let execAds = null
    let execIg = null

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
        // ── Executivo: dados para HTML visual ──
        execAds = { totals, ctr, cpc, cpm, camps }
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
          execIg = { username: prof.username, followers, newFollowers, reach: sumIg('reach'), profileViews: sumIg('profile_views'), websiteClicks: sumIg('website_clicks'), totalLikes, totalComments }
        }
        if (isTech) report += '\n'
      }
    }

    report += `---\n_Relatório gerado automaticamente pelo Dashboard LZX Pesca_\n`

    // ── Gera HTML visual para modo executivo ─────────────────────
    let reportHtml = null
    if (!isTech) {
      const fmtN = n => n.toLocaleString('pt-BR')
      const fmtR = n => `R$ ${n.toFixed(2).replace('.', ',')}`

      const card = (icon, label, value, color = '#8a6200') =>
        `<div class="card"><div class="card-icon">${icon}</div><div class="card-label">${label}</div><div class="card-value" style="color:${color}">${value}</div></div>`

      const bar = (label, value, max, color, fmt) => {
        const pct = max > 0 ? Math.min(value / max * 100, 100) : 0
        return `<div class="bar-row">
          <div class="bar-label">${label}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
          <div class="bar-val">${fmt(value)}</div>
        </div>`
      }

      let adsSection = ''
      if (execAds) {
        const { totals, ctr, camps } = execAds
        const activeCamps = camps.filter(c => parseFloat(c.spend || '0') > 0)
        const ctrColor = ctr >= 2 ? '#3d7a00' : ctr >= 1 ? '#c47a00' : '#c0392b'
        const ctrLabel = ctr >= 2 ? 'Bom ✅' : ctr >= 1 ? 'Razoável 🟡' : 'Baixo 🔴'
        const cpp = totals.msgs > 0 ? totals.spend / totals.msgs : 0
        const ctrPct = Math.min(ctr / 4 * 100, 100)
        const msgsPct = totals.clicks > 0 ? Math.min(totals.msgs / totals.clicks * 100, 100) : 0

        adsSection = `
        <div class="section-title">📊 Anúncios — Facebook & Instagram</div>
        <div class="cards-grid">
          ${card('💰', 'Total Investido', fmtR(totals.spend), '#8a6200')}
          ${card('👥', 'Pessoas Alcançadas', fmtN(totals.reach), '#1a5276')}
          ${card('👁️', 'Vezes que foi visto', fmtN(totals.impressions), '#1a5276')}
          ${card('🖱️', 'Cliques', fmtN(totals.clicks), '#1a5276')}
          ${totals.msgs > 0 ? card('💬', 'Conversas WhatsApp', fmtN(totals.msgs), '#1e8449') : ''}
          ${totals.msgs > 0 ? card('💳', 'Custo por Conversa', fmtR(cpp), '#7d6608') : ''}
        </div>

        <div class="subsection-title">Desempenho dos Anúncios</div>
        <div class="gauge-row">
          <div class="gauge-label">Taxa de cliques (CTR) — <strong style="color:${ctrColor}">${ctr.toFixed(2)}% — ${ctrLabel}</strong></div>
          <div class="gauge-track">
            <div class="gauge-fill" style="width:${ctrPct.toFixed(1)}%;background:${ctrColor}"></div>
            <div class="gauge-target" style="left:50%"></div>
          </div>
          <div class="gauge-hints"><span>0%</span><span style="position:absolute;left:50%;transform:translateX(-50%)">Meta: 2%</span><span>4%+</span></div>
        </div>

        ${totals.msgs > 0 ? `
        <div class="subsection-title">Funil de Conversão</div>
        <div class="funnel">
          ${bar('👁️ Visualizações', totals.impressions, totals.impressions, '#2980b9', fmtN)}
          ${bar('🖱️ Cliques', totals.clicks, totals.impressions, '#8e44ad', fmtN)}
          ${bar('💬 Conversas WhatsApp', totals.msgs, totals.clicks, '#1e8449', fmtN)}
        </div>
        <p class="funnel-note">De cada 100 pessoas que viram o anúncio, <strong>${(totals.clicks / totals.impressions * 100).toFixed(1)}</strong> clicaram e <strong>${(totals.msgs / totals.impressions * 100).toFixed(2)}</strong> iniciaram uma conversa no WhatsApp.</p>
        ` : ''}

        `
      }

      let igSection = ''
      if (execIg) {
        const ig = execIg
        igSection = `
        <div class="page-break"></div>
        <div class="section-title">📸 Instagram — @${ig.username}</div>
        <div class="cards-grid">
          ${card('👥', 'Total de Seguidores', fmtN(ig.followers), '#6c3483')}
          ${ig.newFollowers > 0 ? card('➕', 'Novos Seguidores', `+${fmtN(ig.newFollowers)}`, '#1e8449') : ''}
          ${card('📡', 'Pessoas Alcançadas', fmtN(ig.reach), '#1a5276')}
          ${card('🔍', 'Visitas ao Perfil', fmtN(ig.profileViews), '#1a5276')}
          ${ig.websiteClicks > 0 ? card('🔗', 'Cliques no Link da Bio', fmtN(ig.websiteClicks), '#784212') : ''}
          ${card('❤️', 'Curtidas nos Posts', fmtN(ig.totalLikes), '#c0392b')}
          ${card('💬', 'Comentários', fmtN(ig.totalComments), '#1a5276')}
        </div>

        <div class="subsection-title">Engajamento</div>
        <div class="funnel">
          ${bar('👥 Seguidores', ig.followers, ig.followers, '#6c3483', fmtN)}
          ${bar('📡 Alcance no período', ig.reach, ig.followers, '#2980b9', fmtN)}
          ${bar('🔍 Visitas ao Perfil', ig.profileViews, ig.reach || 1, '#8e44ad', fmtN)}
          ${bar('❤️ Curtidas', ig.totalLikes, ig.reach || 1, '#c0392b', fmtN)}
        </div>`
      }

      reportHtml = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Executivo LZX Pesca</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Rubik','Segoe UI',sans-serif;font-size:13px;color:#1a1a1a;background:#fff}
  .header{background:#0d1017;padding:20px 36px;display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #c4a35a}
  .header-left{display:flex;align-items:center;gap:14px}
  .header img{height:44px}
  .header-div{width:1px;height:36px;background:rgba(196,163,90,0.4)}
  .header-title{color:#c4a35a;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
  .header-sub{color:#8a95a8;font-size:11px;margin-top:2px}
  .header-date{color:#8a95a8;font-size:11px;text-align:right;line-height:1.6}
  .header-date strong{color:#c4a35a;font-size:13px}
  .body{padding:28px 36px;max-width:860px;margin:0 auto}
  .report-title{font-size:20px;font-weight:700;color:#0d1017;margin-bottom:4px}
  .report-period{font-size:12px;color:#7a7060;margin-bottom:28px}
  .section-title{font-size:14px;font-weight:700;color:#fff;background:#0d1017;padding:10px 16px;border-left:4px solid #c4a35a;border-radius:0 6px 6px 0;margin:28px 0 16px;letter-spacing:.04em}
  .subsection-title{font-size:12px;font-weight:600;color:#5a3e00;text-transform:uppercase;letter-spacing:.06em;margin:20px 0 10px;padding-bottom:4px;border-bottom:1px solid #e8dcc8}
  .cards-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px}
  .card{background:#faf7f2;border:1px solid #e8dcc8;border-radius:10px;padding:14px 16px}
  .card-icon{font-size:20px;margin-bottom:6px}
  .card-label{font-size:11px;color:#7a7060;margin-bottom:4px}
  .card-value{font-size:22px;font-weight:700;letter-spacing:-.5px}
  .gauge-row{margin-bottom:16px}
  .gauge-label{font-size:12px;color:#333;margin-bottom:6px}
  .gauge-track{height:14px;background:#e8dcc8;border-radius:7px;position:relative;overflow:visible}
  .gauge-fill{height:100%;border-radius:7px;transition:width .3s}
  .gauge-target{position:absolute;top:-4px;height:22px;width:2px;background:#c4a35a}
  .gauge-hints{display:flex;justify-content:space-between;font-size:10px;color:#999;margin-top:4px;position:relative}
  .funnel{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
  .bar-row{display:grid;grid-template-columns:160px 1fr 100px;align-items:center;gap:8px}
  .bar-label{font-size:12px;color:#333}
  .bar-track{height:18px;background:#e8dcc8;border-radius:4px;overflow:hidden}
  .bar-fill{height:100%;border-radius:4px}
  .bar-val{font-size:12px;font-weight:600;text-align:right;color:#333}
  .funnel-note{font-size:12px;color:#5a5a5a;background:#f5f0e8;border-left:3px solid #c4a35a;padding:10px 14px;border-radius:0 6px 6px 0;margin-top:12px;line-height:1.6}
.page-break{page-break-before:always;margin-top:0}
  .footer{background:#0d1017;color:#8a95a8;font-size:11px;text-align:center;padding:14px;border-top:1px solid rgba(196,163,90,.3);margin-top:40px}
  @media print{
    .header,.section-title,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page-break{page-break-before:always}
    .card{break-inside:avoid}
  }
</style></head><body>
<div class="header">
  <div class="header-left">
    <img src="${`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}`}/logo.webp" alt="LZX" onerror="this.style.display='none'">
    <div class="header-div"></div>
    <div><div class="header-title">Dashboard Meta Ads</div><div class="header-sub">Relatório de Performance</div></div>
  </div>
  <div class="header-date">Gerado em<br><strong>${now}</strong><br><span style="font-size:10px">Período: ${period}</span></div>
</div>
<div class="body">
  <div class="report-title">Relatório Executivo — LZX Pesca</div>
  <div class="report-period">Período: ${period}</div>
  ${adsSection}
  ${igSection}
</div>
<div class="footer">LZX Equipamentos para Pesca — Relatório gerado automaticamente pelo Dashboard Meta Ads</div>
</body></html>`
    }

    res.json({ success: true, report, reportHtml })
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
