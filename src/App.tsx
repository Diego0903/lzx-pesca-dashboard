import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import TokenWarning from './components/TokenWarning'
import AccountSelector from './components/AccountSelector'
import MetricsSummary from './components/MetricsSummary'
import CampaignTable from './components/CampaignTable'
import TimeSeriesChart from './components/TimeSeriesChart'
import ReportModal from './components/ReportModal'
import WhatsAppSection from './components/WhatsAppSection'
import DateFilter, { type DateRange } from './components/DateFilter'
import InstagramInsights from './components/InstagramInsights'
import type { CampaignInsight, TimeSeriesPoint } from './types'

interface TokenInfo {
  is_valid: boolean
  scopes: string[]
  expires_at: number
  application: string
}

interface AdAccountRaw {
  id: string
  name: string
  account_status: number
  currency: string
  timezone_name: string
  amount_spent?: string
}

const REQUIRED_SCOPES = ['ads_read', 'ads_management']

export default function App() {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AdAccountRaw[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [insights, setInsights] = useState<CampaignInsight[]>([])
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [reportContent, setReportContent] = useState('')
  const [generatingReport, setGeneratingReport] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({ since: '', until: '', preset: 'maximum' })
  const [activeTab, setActiveTab] = useState<'ads' | 'instagram'>('ads')

  // Verifica token ao montar
  useEffect(() => {
    api.tokenStatus()
      .then(r => setTokenInfo(r.data))
      .catch(e => setTokenError(e.message))
  }, [])

  // Busca contas quando token OK
  useEffect(() => {
    if (!tokenInfo?.is_valid) return
    const hasAds = REQUIRED_SCOPES.some(s => tokenInfo.scopes.includes(s))
    if (!hasAds) return

    api.adAccounts().then(r => {
      if (r.error) {
        setInsightsError(r.error.message)
        return
      }
      const all = (r.data || []) as AdAccountRaw[]
      const list = all.filter(a => a.name === 'LZX 01')
      setAccounts(list)
      if (list.length > 0) setSelectedAccount(list[0].id)
    })
  }, [tokenInfo])

  // Busca insights quando conta selecionada
  const loadAccountData = useCallback(async (accountId: string, range?: DateRange) => {
    setLoading(true)
    setInsightsError(null)
    const since = range?.since || undefined
    const until = range?.until || undefined
    try {
      const [insightsRes, tsRes] = await Promise.all([
        api.accountInsights(accountId, since, until),
        api.timeSeries(accountId, since, until),
      ])
      if (insightsRes.error) {
        setInsightsError(insightsRes.error.message)
      } else {
        setInsights((insightsRes.data || []) as CampaignInsight[])
      }
      if (!tsRes.error) {
        setTimeSeries((tsRes.data || []) as TimeSeriesPoint[])
      }
    } catch (e) {
      setInsightsError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedAccount) loadAccountData(selectedAccount, dateRange)
  }, [selectedAccount, dateRange, loadAccountData])

  const handleGenerateReport = async () => {
    setGeneratingReport(true)
    try {
      const res = await api.generateReport(selectedAccount, dateRange.since || undefined, dateRange.until || undefined)
      setReportContent(res.report)
      setShowReport(true)
    } catch (e) {
      alert('Erro ao gerar relatório: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setGeneratingReport(false)
    }
  }

  const hasAdsAccess = tokenInfo?.is_valid && REQUIRED_SCOPES.some(s => tokenInfo.scopes.includes(s))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid rgba(196,163,90,0.2)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 64,
      }}>
        {/* Logo + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img
            src="/logo.webp"
            alt="LZX Pesca"
            style={{ height: 36, objectFit: 'contain', display: 'block' }}
          />
          <div style={{
            width: 1,
            height: 32,
            background: 'rgba(196,163,90,0.25)',
          }} />
          <div>
            <div style={{
              fontFamily: "'Rubik', sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--gold)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Dashboard Meta Ads
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              Gestão de Campanhas
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {tokenInfo && (
            <span style={{
              background: tokenInfo.is_valid ? 'rgba(136,200,0,0.12)' : 'rgba(238,90,74,0.12)',
              color: tokenInfo.is_valid ? 'var(--green)' : 'var(--red)',
              border: `1px solid ${tokenInfo.is_valid ? 'rgba(136,200,0,0.3)' : 'rgba(238,90,74,0.3)'}`,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
            }}>
              {tokenInfo.is_valid ? '● Conectado' : '● Desconectado'}
            </span>
          )}
          {hasAdsAccess && (
            <DateFilter value={dateRange} onChange={setDateRange} />
          )}
          {selectedAccount && hasAdsAccess && (
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              style={{
                background: 'var(--gold)',
                color: '#1a1500',
                border: 'none',
                borderRadius: 6,
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: generatingReport ? 0.6 : 1,
                fontFamily: "'Rubik', sans-serif",
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {generatingReport ? 'Gerando...' : '📄 Relatório'}
            </button>
          )}
        </div>
      </header>

      <main style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Aviso de permissões */}
        {tokenInfo && !hasAdsAccess && (
          <TokenWarning tokenInfo={tokenInfo} />
        )}

        {tokenError && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            color: 'var(--red)',
          }}>
            Erro ao conectar com a API: {tokenError}. Certifique-se de que o servidor está rodando.
          </div>
        )}

        {/* Seletor de conta */}
        {hasAdsAccess && accounts.length > 0 && (
          <AccountSelector
            accounts={accounts}
            selected={selectedAccount}
            onChange={setSelectedAccount}
          />
        )}

        {/* Abas */}
        {hasAdsAccess && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
            {([
              { key: 'ads', label: '📊 Meta Ads' },
              { key: 'instagram', label: '📸 Instagram' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab.key ? 'var(--gold)' : 'transparent'}`,
                  padding: '10px 18px',
                  cursor: 'pointer',
                  color: activeTab === tab.key ? 'var(--gold)' : 'var(--text-muted)',
                  fontWeight: activeTab === tab.key ? 700 : 400,
                  fontSize: 14,
                  fontFamily: "'Rubik', sans-serif",
                  transition: 'all 0.15s',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            Carregando dados da conta...
          </div>
        )}

        {/* Erro de insights */}
        {insightsError && !loading && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            color: 'var(--red)',
          }}>
            <strong>Erro ao buscar dados:</strong> {insightsError}
          </div>
        )}

        {/* Aba Meta Ads */}
        {activeTab === 'ads' && !loading && selectedAccount && hasAdsAccess && (
          <>
            <MetricsSummary insights={insights} />
            <div style={{ marginTop: 24 }}>
              <WhatsAppSection insights={insights} />
            </div>
            <div style={{ marginTop: 24 }}>
              <TimeSeriesChart data={timeSeries} />
            </div>
            <div style={{ marginTop: 24 }}>
              <CampaignTable insights={insights} />
            </div>
          </>
        )}

        {/* Aba Instagram */}
        {activeTab === 'instagram' && hasAdsAccess && (
          <InstagramInsights dateRange={dateRange} />
        )}

        {/* Estado inicial sem acesso */}
        {!hasAdsAccess && !tokenError && tokenInfo && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔑</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
              Aguardando token com permissões corretas
            </div>
            <div style={{ maxWidth: 480 }}>
              Siga as instruções acima para gerar um token com <code>ads_read</code> e o dashboard
              será preenchido automaticamente.
            </div>
          </div>
        )}
      </main>

      {showReport && (
        <ReportModal content={reportContent} onClose={() => setShowReport(false)} />
      )}
    </div>
  )
}
