import { useEffect } from 'react'
import { useAuth } from './auth/AuthContext'
import { useRoute } from './router/Router'
import LoginPage from './pages/LoginPage'
import SolicitarAcessoPage from './pages/SolicitarAcessoPage'
import CadastrarClientePage from './pages/CadastrarClientePage'
import App from './App'

/**
 * Decide qual tela mostrar baseado em autenticação, status e perfil.
 *
 * Rotas públicas: /login, /solicitar-acesso
 * Rotas autenticadas: /, /dashboard, /crm, /pedidos, /admin/usuarios, /crm/novo-cliente
 *
 * Regras:
 * - Não autenticado → /login (a menos que esteja em /solicitar-acesso)
 * - Autenticado mas status≠ativo → tela de aviso
 * - Funcionário → /crm/novo-cliente (não pode acessar dashboard)
 * - Admin/Dono → dashboard completo (App.tsx)
 * - /admin/usuarios só para Dono
 */
export default function AppRoot() {
  const { loading, isAuthenticated, isActive, perfil, usuario, signOut } = useAuth()
  const { pathname, navigate } = useRoute()

  // Loading inicial — bloqueia render até a sessão ser resolvida
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 13 }}>Carregando...</div>
        </div>
      </div>
    )
  }

  // Rotas públicas (sem auth)
  if (!isAuthenticated) {
    if (pathname === '/solicitar-acesso') return <SolicitarAcessoPage />
    return <LoginPage />
  }

  // Autenticado mas usuario ainda está sendo buscado (undefined = pending)
  if (usuario === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 13 }}>Carregando perfil...</div>
        </div>
      </div>
    )
  }

  // Autenticado mas usuario===null — busca completou e não achou linha em usuarios
  if (!usuario) {
    return <AccessBlocked title="Conta não encontrada" message="Não conseguimos carregar o seu perfil. Tente sair e entrar novamente." onSignOut={signOut} />
  }

  // Autenticado mas status diferente de ativo
  if (!isActive) {
    if (usuario.status === 'pendente') {
      return <AccessBlocked
        title="Aguardando aprovação"
        message="Sua conta foi criada e está aguardando aprovação do administrador. Você receberá acesso assim que for liberada."
        onSignOut={signOut}
      />
    }
    if (usuario.status === 'rejeitado') {
      return <AccessBlocked
        title="Acesso negado"
        message="Sua solicitação foi rejeitada. Entre em contato com o administrador se acredita que isso é um engano."
        onSignOut={signOut}
      />
    }
    if (usuario.status === 'inativo') {
      return <AccessBlocked
        title="Conta desativada"
        message="Sua conta foi desativada. Entre em contato com o administrador para reativar."
        onSignOut={signOut}
      />
    }
  }

  // Funcionário só vê /crm/novo-cliente — qualquer outra rota redireciona pra lá
  if (perfil === 'funcionario') {
    return <FuncionarioRoute pathname={pathname} navigate={navigate} />
  }

  // Admin/Dono → dashboard completo (componente App original)
  // O App.tsx interno vai cuidar de marketing/crm/pedidos via SectionNav.
  // /admin/usuarios é tratado dentro do App porque ele tem o header/layout.
  return <App />
}

function FuncionarioRoute({ pathname, navigate }: { pathname: string; navigate: (p: string, opts?: { replace?: boolean }) => void }) {
  useEffect(() => {
    if (pathname !== '/crm/novo-cliente') navigate('/crm/novo-cliente', { replace: true })
  }, [pathname, navigate])
  return <CadastrarClientePage />
}

function AccessBlocked({ title, message, onSignOut }: { title: string; message: string; onSignOut: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="glass glass-strong fade-in" style={{ width: '100%', maxWidth: 440, padding: 36, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 14 }}>🔒</div>
        <div className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 22 }}>
          {message}
        </div>
        <button type="button" className="btn-secondary" onClick={onSignOut} style={{ padding: '10px 18px' }}>
          Sair
        </button>
      </div>
    </div>
  )
}
