import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Link, useRoute } from '../router/Router'

export default function LoginPage() {
  const { signIn } = useAuth()
  const { navigate } = useRoute()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signIn(email.trim(), senha)
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    // Redirecionamento real é decidido pelo App.tsx baseado no perfil — só vai pra raiz.
    navigate('/', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div className="glass glass-strong fade-in" style={{ width: '100%', maxWidth: 420, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.webp" alt="LZX Pesca" style={{ height: 48, marginBottom: 16 }} />
          <div className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            LZX Pesca
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Acesse o painel de gestão
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="lp-email">Email</label>
            <input
              id="lp-email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          <div className="field" style={{ marginBottom: 18 }}>
            <label htmlFor="lp-senha">Senha</label>
            <input
              id="lp-senha"
              type="password"
              required
              autoComplete="current-password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(216,86,86,0.1)',
              border: '1px solid rgba(216,86,86,0.3)',
              borderRadius: 10,
              padding: 12,
              fontSize: 12,
              color: 'var(--trust-red)',
              marginBottom: 14,
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !email || !senha}
            style={{ width: '100%', padding: '12px', fontSize: 14 }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{
          marginTop: 22,
          paddingTop: 20,
          borderTop: '1px solid var(--border-soft)',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--text-muted)',
        }}>
          Não tem acesso?{' '}
          <Link to="/solicitar-acesso" style={{ color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>
            Solicitar Acesso
          </Link>
        </div>
      </div>
    </div>
  )
}
