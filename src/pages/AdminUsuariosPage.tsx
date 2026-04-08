import { useState } from 'react'
import { useAuth, type UsuarioRow, type UserPerfil } from '../auth/AuthContext'
import { useUsuarios } from '../hooks/useUsuarios'

type Tab = 'pendentes' | 'ativos' | 'rejeitados'

const PERFIL_LABEL: Record<UserPerfil, string> = {
  dono: 'Dono',
  admin: 'Administrador',
  funcionario: 'Funcionário',
}

const PERFIL_BADGE: Record<UserPerfil, string> = {
  dono: 'badge-gold',
  admin: 'badge-blue',
  funcionario: 'badge-muted',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminUsuariosPage() {
  const { user } = useAuth()
  const { loading, error, pendentes, ativos, rejeitados, aprovar, rejeitar, desativar, reativar, alterarPerfil, resetSenha } = useUsuarios(user?.id)
  const [tab, setTab] = useState<Tab>('pendentes')
  const [approveModal, setApproveModal] = useState<UsuarioRow | null>(null)
  const [approvePerfil, setApprovePerfil] = useState<'admin' | 'funcionario'>('funcionario')
  const [busy, setBusy] = useState(false)

  const handleApprove = async () => {
    if (!approveModal) return
    setBusy(true)
    try {
      await aprovar(approveModal.id, approvePerfil)
      setApproveModal(null)
    } catch (e) {
      alert('Erro ao aprovar: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async (u: UsuarioRow) => {
    if (!confirm(`Rejeitar a solicitação de "${u.nome}"?`)) return
    try { await rejeitar(u.id) }
    catch (e) { alert('Erro: ' + (e instanceof Error ? e.message : '')) }
  }

  const handleDeactivate = async (u: UsuarioRow) => {
    if (!confirm(`Desativar o usuário "${u.nome}"?\n\nEle perderá o acesso até ser reativado.`)) return
    try { await desativar(u.id) }
    catch (e) { alert('Erro: ' + (e instanceof Error ? e.message : '')) }
  }

  const handleResetSenha = async (u: UsuarioRow) => {
    if (!confirm(`Enviar email de redefinição de senha para "${u.email}"?`)) return
    try {
      await resetSenha(u.email)
      alert('Email enviado!')
    } catch (e) {
      alert('Erro: ' + (e instanceof Error ? e.message : ''))
    }
  }

  const handleAlterarPerfil = async (u: UsuarioRow) => {
    const novoPerfil: UserPerfil = u.perfil === 'admin' ? 'funcionario' : 'admin'
    if (!confirm(`Alterar perfil de "${u.nome}" para ${PERFIL_LABEL[novoPerfil]}?`)) return
    try { await alterarPerfil(u.id, novoPerfil) }
    catch (e) { alert('Erro: ' + (e instanceof Error ? e.message : '')) }
  }

  if (loading) return (
    <div className="fade-in" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      Carregando usuários...
    </div>
  )

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Gerenciamento de Usuários
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Aprovar, alterar perfis e gerenciar acessos da equipe
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(216,86,86,0.1)', border: '1px solid rgba(216,86,86,0.3)', borderRadius: 10, padding: 12, color: 'var(--trust-red)', fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {([
          { k: 'pendentes' as const, l: 'Pendentes', count: pendentes.length },
          { k: 'ativos' as const,    l: 'Ativos',    count: ativos.length },
          { k: 'rejeitados' as const,l: 'Rejeitados',count: rejeitados.length },
        ]).map(t => (
          <button
            key={t.k}
            type="button"
            onClick={() => setTab(t.k)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${tab === t.k ? 'var(--gold)' : 'transparent'}`,
              padding: '11px 18px',
              cursor: 'pointer',
              color: tab === t.k ? 'var(--gold)' : 'var(--text-muted)',
              fontWeight: tab === t.k ? 700 : 500,
              fontSize: 13,
              fontFamily: "'Manrope','Rubik',sans-serif",
              transition: 'all 0.15s',
              marginBottom: -1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {t.l}
            {t.count > 0 && (
              <span className={`badge ${t.k === 'pendentes' ? 'badge-orange' : 'badge-muted'}`} style={{ padding: '2px 8px', fontSize: 9 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pendentes */}
      {tab === 'pendentes' && (
        <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
          {pendentes.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nenhuma solicitação pendente.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th><th>Email</th><th>Cargo informado</th><th>Solicitado em</th><th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pendentes.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.nome}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td>{u.cargo_informado || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{fmtDate(u.criado_em)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => { setApproveModal(u); setApprovePerfil('funcionario') }}>
                            Aprovar
                          </button>
                          <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: 11, color: 'var(--trust-red)', borderColor: 'rgba(216,86,86,0.3)' }} onClick={() => handleReject(u)}>
                            Rejeitar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Ativos (inclui inativos pra facilitar gestão) */}
      {tab === 'ativos' && (
        <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
          {ativos.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nenhum usuário ativo (além do Dono atual).
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th><th>Email</th><th>Perfil</th><th>Aprovado em</th><th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ativos.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.nome}{u.id === user?.id && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>(você)</span>}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td><span className={`badge ${PERFIL_BADGE[u.perfil]}`}>{PERFIL_LABEL[u.perfil]}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{fmtDate(u.aprovado_em)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {u.perfil !== 'dono' && u.id !== user?.id && (
                          <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => handleAlterarPerfil(u)}>
                              {u.perfil === 'admin' ? '↓ Funcionário' : '↑ Admin'}
                            </button>
                            <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => handleResetSenha(u)}>
                              Resetar Senha
                            </button>
                            <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: 11, color: 'var(--trust-red)', borderColor: 'rgba(216,86,86,0.3)' }} onClick={() => handleDeactivate(u)}>
                              Desativar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Rejeitados (também mostra inativos pra reativação) */}
      {tab === 'rejeitados' && (
        <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
          {rejeitados.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Nenhum usuário rejeitado.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th><th>Email</th><th>Cargo</th><th>Rejeitado em</th><th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rejeitados.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.nome}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td>{u.cargo_informado || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{fmtDate(u.rejeitado_em)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => reativar(u.id)}>
                          Reativar Solicitação
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de aprovação */}
      {approveModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={() => setApproveModal(null)}
        >
          <div className="glass-strong" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border-strong)', borderRadius: 14, padding: 28, maxWidth: 400, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
              Aprovar usuário
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
              <strong style={{ color: 'var(--text)' }}>{approveModal.nome}</strong> · {approveModal.email}
            </div>

            <div className="font-display" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Escolha o nível de acesso
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
              {([
                { k: 'admin' as const, l: '⚙️ Administrador', d: 'Acesso total — dashboard, CRM, pedidos, gráficos' },
                { k: 'funcionario' as const, l: '👤 Funcionário', d: 'Apenas cadastro de novos clientes' },
              ]).map(opt => (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => setApprovePerfil(opt.k)}
                  style={{
                    textAlign: 'left',
                    background: approvePerfil === opt.k ? 'rgba(200,165,92,0.15)' : 'transparent',
                    border: `1px solid ${approvePerfil === opt.k ? 'var(--gold)' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    color: 'var(--text)',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: approvePerfil === opt.k ? 'var(--gold)' : 'var(--text)' }}>{opt.l}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{opt.d}</div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setApproveModal(null)} disabled={busy}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleApprove} disabled={busy}>
                {busy ? 'Aprovando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
