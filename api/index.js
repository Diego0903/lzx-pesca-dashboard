'use strict'
const express = require('express')
const cors = require('cors')
const { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } = require('fs')
const { join } = require('path')

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

app.get('/api/cached', (_req, res) => {
  try { res.json({ files: readdirSync(DATA_DIR).filter(f => f.endsWith('.json')) }) }
  catch { res.json({ files: [] }) }
})

app.get('/api/cached/:filename', (req, res) => {
  const file = join(DATA_DIR, req.params.filename)
  if (existsSync(file)) res.json(JSON.parse(readFileSync(file, 'utf-8')))
  else res.status(404).json({ error: 'Arquivo não encontrado' })
})

module.exports = app
