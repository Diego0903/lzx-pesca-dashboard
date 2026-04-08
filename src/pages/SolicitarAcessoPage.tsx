import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Link } from '../router/Router'

export default function SolicitarAcessoPage() {
  const { signUp } = useAuth()
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmarSenha: '', cargo: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (form.senha.length < 8) {
      setError('A senha precisa ter no mínimo 8 caracteres.')
      return
    }
    if (form.senha !== form.confirmarSenha) {
      setError('As senhas não coincidem.')
      return
    }
    if (!form.nome.trim() || !form.email.trim() || !form.cargo.trim()) {
      setError('Preencha todos os campos.')
      return
    }

    setLoading(true)
    const { error: err } = await signUp({
      nome: form.nome.trim(),
      email: form.email.trim(),
      password: form.senha,
      cargoInformado: form.cargo.trim(),
    })
    setLoading(false)

    if (err) {
      setError(err)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="glass glass-strong fade-in" style={{ width: '100%', maxWidth: 460, padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>✅</div>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Solicitação enviada!
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 22 }}>
            Sua solicitação foi enviada. Aguarde a aprovação do administrador.
            Você receberá acesso assim que o cadastro for liberado.
          </div>
          <Link to="/login" className="btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            Voltar para Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="glass glass-strong fade-in lead-form" style={{ width: '100%', maxWidth: 480, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/logo.webp" alt="LZX Pesca" style={{ height: 44, marginBottom: 14 }} />
          <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Solicitar Acesso
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Preencha seus dados para pedir aprovação
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label htmlFor="sa-nome">Nome completo</label>
            <input id="sa-nome" required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Seu nome" />
          </div>
          <div className="field">
            <label htmlFor="sa-email">Email</label>
            <input id="sa-email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="seu@email.com" />
          </div>
          <div className="field">
            <label htmlFor="sa-cargo">Cargo / função</label>
            <input id="sa-cargo" required value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} placeholder="Ex: Vendedor, Atendente, Gerente" />
          </div>
          <div className="field">
            <label htmlFor="sa-senha">Senha (mín. 8 caracteres)</label>
            <input id="sa-senha" type="password" required minLength={8} value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} placeholder="••••••••" />
          </div>
          <div className="field">
            <label htmlFor="sa-conf">Confirmar senha</label>
            <input id="sa-conf" type="password" required minLength={8} value={form.confirmarSenha} onChange={e => setForm({ ...form, confirmarSenha: e.target.value })} placeholder="••••••••" />
          </div>

          {error && (
            <div style={{
              background: 'rgba(216,86,86,0.1)',
              border: '1px solid rgba(216,86,86,0.3)',
              borderRadius: 10,
              padding: 12,
              fontSize: 12,
              color: 'var(--trust-red)',
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '12px', fontSize: 14, marginTop: 4 }}>
            {loading ? 'Enviando...' : 'Solicitar Acesso'}
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border-soft)', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          Já tem acesso?{' '}
          <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>
            Fazer Login
          </Link>
        </div>
      </div>
    </div>
  )
}
