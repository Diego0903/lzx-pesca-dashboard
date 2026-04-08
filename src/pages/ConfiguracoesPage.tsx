import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api'

interface TokenStatus {
  is_valid: boolean
  scopes: string[]
  expires_at: number
  application: string
}

interface AdAccount {
  id: string
  name: string
  account_status: number
}

export default function ConfiguracoesPage() {
  const { usuario } = useAuth()
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [renewModal, setRenewModal] = useState(false)
  const [newToken, setNewToken] = useState('')
  const [savingToken, setSavingToken] = useState(false)
  const [tokenSaveResult, setTokenSaveResult] = useState<{ ok: boolean; message: string } | null>(null)

  // Carrega status do token e contas ao montar
  const loadStatus = async () => {
    setLoading(true)
    setTokenError(null)
    try {
      const r = await api.tokenStatus()
      if (r.error) {
        setTokenError(r.error.message)
        setTokenStatus(null)
      } else if (r.data) {
        setTokenStatus(r.data)
      }
      const accs = await api.adAccounts()
      if (!accs.error && accs.data) {
        setAdAccounts((accs.data as AdAccount[]) ?? [])
      }
    } catch (e) {
      setTokenError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStatus() }, [])

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await api.tokenStatus()
      if (r.error) {
        setTestResult({ ok: false, message: `Falhou: ${r.error.message}` })
      } else if (r.data?.is_valid) {
        const accs = await api.adAccounts()
        if (accs.error) {
          setTestResult({ ok: false, message: `Token válido mas sem acesso a contas: ${accs.error.message}` })
        } else {
          const count = (accs.data as unknown[])?.length ?? 0
          setTestResult({ ok: true, message: `Conexão OK. ${count} conta(s) de anúncio acessível(eis).` })
        }
      } else {
        setTestResult({ ok: false, message: 'Token inválido ou expirado.' })
      }
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'Erro' })
    } finally {
      setTesting(false)
    }
  }

  const handleSaveToken = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    if (!newToken.trim()) return

    setSavingToken(true)
    setTokenSaveResult(null)

    const { error: err } = await supabase.from('app_settings').upsert({
      key: 'meta_token',
      value: newToken.trim(),
      updated_by: usuario?.id ?? null,
    }, { onConflict: 'key' })

    setSavingToken(false)

    if (err) {
      setTokenSaveResult({ ok: false, message: `Erro: ${err.message}` })
      return
    }

    setTokenSaveResult({
      ok: true,
      message: 'Token salvo no Supabase. O backend vai usá-lo nas próximas requisições (pode levar alguns segundos).',
    })
    setNewToken('')
    setTimeout(() => {
      setRenewModal(false)
      setTokenSaveResult(null)
      loadStatus()
    }, 3500)
  }

  const fmtExpires = (ts: number) => {
    if (!ts) return '—'
    return new Date(ts * 1000).toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const isExpired = tokenStatus && tokenStatus.expires_at > 0 && tokenStatus.expires_at * 1000 < Date.now()
  const tokenAtivo = tokenStatus?.is_valid && !isExpired

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Configurações
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Painel exclusivo do Dono — gerencie integrações e tokens
        </div>
      </div>

      {/* Seção: Integração Meta Ads */}
      <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              📊 Integração Meta Ads
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Token de acesso à API do Facebook/Instagram Ads
            </div>
          </div>
          <span className={`badge ${tokenAtivo ? 'badge-green' : 'badge-red'}`}>
            {loading ? '⏳ Verificando...' : tokenAtivo ? '🟢 ATIVO' : '🔴 EXPIRADO / INVÁLIDO'}
          </span>
        </div>

        {tokenError && (
          <div style={{ background: 'rgba(216,86,86,0.1)', border: '1px solid rgba(216,86,86,0.3)', borderRadius: 10, padding: 12, fontSize: 12, color: 'var(--trust-red)', marginBottom: 16, lineHeight: 1.5 }}>
            <strong>Erro:</strong> {tokenError}
          </div>
        )}

        {tokenStatus && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 14, marginBottom: 18 }}>
            <div>
              <div className="font-display" style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>App vinculado</div>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{tokenStatus.application || '—'}</div>
            </div>
            <div>
              <div className="font-display" style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>Expira em</div>
              <div className="tabular" style={{ fontSize: 13, color: tokenAtivo ? 'var(--text)' : 'var(--trust-red)', fontWeight: 600 }}>
                {tokenStatus.expires_at === 0 ? 'Não expira (System User)' : fmtExpires(tokenStatus.expires_at)}
              </div>
            </div>
            <div>
              <div className="font-display" style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>Permissões</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {tokenStatus.scopes?.slice(0, 4).join(', ') || '—'}
                {tokenStatus.scopes && tokenStatus.scopes.length > 4 && ` +${tokenStatus.scopes.length - 4}`}
              </div>
            </div>
          </div>
        )}

        {adAccounts.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div className="font-display" style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>Contas de anúncio acessíveis</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {adAccounts.map(acc => (
                <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{acc.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{acc.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {testResult && (
          <div style={{
            background: testResult.ok ? 'rgba(95,184,90,0.1)' : 'rgba(216,86,86,0.1)',
            border: `1px solid ${testResult.ok ? 'rgba(95,184,90,0.3)' : 'rgba(216,86,86,0.3)'}`,
            borderRadius: 10,
            padding: 12,
            fontSize: 12,
            color: testResult.ok ? 'var(--trust-green)' : 'var(--trust-red)',
            marginBottom: 14,
            fontWeight: 500,
          }}>
            {testResult.ok ? '✅' : '❌'} {testResult.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={handleTestConnection} disabled={testing}>
            {testing ? '⏳ Testando...' : '🔌 Testar Conexão'}
          </button>
          <button type="button" className="btn-primary" onClick={() => setRenewModal(true)}>
            🔑 Renovar Token
          </button>
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-soft)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          💡 Para gerar um novo token: <strong>business.facebook.com → Configurações do negócio → Usuários do sistema → seu System User → Gerar novo token</strong>. Selecione o app <em>Claude Gestor - LZX Pesca</em> e marque as permissões <code>ads_read</code>, <code>ads_management</code>, <code>business_management</code>.
        </div>
      </div>

      {/* Modal: renovar token */}
      {renewModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}
          onClick={() => !savingToken && setRenewModal(false)}
        >
          <div className="glass-strong" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border-strong)', borderRadius: 14, padding: 28, maxWidth: 540, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Renovar token da Meta
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
              Cole abaixo o novo token gerado no Business Manager.
              O token vai ser salvo no Supabase e usado pelo backend automaticamente.
            </div>

            <form onSubmit={handleSaveToken}>
              <div className="field" style={{ marginBottom: 14 }}>
                <label htmlFor="rt-token">Novo token de acesso</label>
                <textarea
                  id="rt-token"
                  required
                  rows={5}
                  value={newToken}
                  onChange={e => setNewToken(e.target.value)}
                  placeholder="EAA..."
                  style={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '10px 13px',
                    color: 'var(--text)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    width: '100%',
                    resize: 'vertical',
                    wordBreak: 'break-all',
                  }}
                />
              </div>

              {tokenSaveResult && (
                <div style={{
                  background: tokenSaveResult.ok ? 'rgba(95,184,90,0.1)' : 'rgba(216,86,86,0.1)',
                  border: `1px solid ${tokenSaveResult.ok ? 'rgba(95,184,90,0.3)' : 'rgba(216,86,86,0.3)'}`,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 12,
                  color: tokenSaveResult.ok ? 'var(--trust-green)' : 'var(--trust-red)',
                  marginBottom: 14,
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}>
                  {tokenSaveResult.ok ? '✅' : '❌'} {tokenSaveResult.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setRenewModal(false)} disabled={savingToken}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={savingToken || !newToken.trim()}>
                  {savingToken ? 'Salvando...' : 'Salvar token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
