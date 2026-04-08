import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type UserPerfil = 'dono' | 'admin' | 'funcionario'
export type UserStatus = 'pendente' | 'ativo' | 'inativo' | 'rejeitado'

export interface UsuarioRow {
  id: string
  nome: string
  email: string
  perfil: UserPerfil
  status: UserStatus
  cargo_informado: string | null
  criado_em: string
  aprovado_em: string | null
  aprovado_por: string | null
  desativado_em: string | null
  rejeitado_em: string | null
}

interface AuthContextValue {
  loading: boolean
  session: Session | null
  user: User | null
  usuario: UsuarioRow | null         // linha em public.usuarios
  isAuthenticated: boolean
  isActive: boolean                  // status === 'ativo'
  perfil: UserPerfil | null
  signIn: (email: string, password: string, keepSignedIn?: boolean) => Promise<{ error?: string }>
  signUp: (params: { nome: string; email: string; password: string; cargoInformado: string }) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  reloadUsuario: () => Promise<void>
}

// Chaves de localStorage usadas para "Permanecer conectado"
const KEEP_KEY = 'lzx-session-keep'         // 'true' = 7 dias, 'false' = 24h
const STARTED_KEY = 'lzx-session-started'   // ISO timestamp do último login
const ONE_DAY_MS  = 24 * 60 * 60 * 1000
const ONE_WEEK_MS = 7  * 24 * 60 * 60 * 1000

/** Verifica se a sessão local expirou pelas regras do "permanecer conectado". */
function isLocalSessionExpired(): boolean {
  try {
    const startedAt = localStorage.getItem(STARTED_KEY)
    if (!startedAt) return false  // Sem timestamp = sessão antiga, não expira
    const keep = localStorage.getItem(KEEP_KEY) === 'true'
    const elapsed = Date.now() - new Date(startedAt).getTime()
    const limit = keep ? ONE_WEEK_MS : ONE_DAY_MS
    return elapsed > limit
  } catch { return false }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [usuario, setUsuario] = useState<UsuarioRow | null>(null)

  const fetchUsuario = useCallback(async (uid: string) => {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    if (error) {
      console.warn('[AuthContext] erro ao buscar usuario:', error.message)
      return null
    }
    return data as UsuarioRow | null
  }, [])

  const reloadUsuario = useCallback(async () => {
    if (!session?.user) { setUsuario(null); return }
    const u = await fetchUsuario(session.user.id)
    setUsuario(u)
  }, [session, fetchUsuario])

  // Inicializa sessão + listener
  useEffect(() => {
    const sb = supabase
    if (!sb) { setLoading(false); return }
    let mounted = true

    // Antes de qualquer coisa: se a sessão local expirou pelas regras do
    // "permanecer conectado", força logout
    if (isLocalSessionExpired()) {
      sb.auth.signOut().finally(() => {
        try {
          localStorage.removeItem(KEEP_KEY)
          localStorage.removeItem(STARTED_KEY)
        } catch {}
      })
    }

    sb.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        const u = await fetchUsuario(data.session.user.id)
        if (mounted) setUsuario(u)
      }
      if (mounted) setLoading(false)
    })

    const { data: sub } = sb.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        const u = await fetchUsuario(newSession.user.id)
        setUsuario(u)
      } else {
        setUsuario(null)
      }
    })

    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [fetchUsuario])

  const signIn: AuthContextValue['signIn'] = async (email, password, keepSignedIn = false) => {
    if (!supabase) return { error: 'Supabase não configurado' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: traduzErroSupabase(error.message) }
    // Salva preferência de duração da sessão (1 semana se "permanecer conectado", 1 dia se não)
    try {
      localStorage.setItem(KEEP_KEY, keepSignedIn ? 'true' : 'false')
      localStorage.setItem(STARTED_KEY, new Date().toISOString())
    } catch {}
    return {}
  }

  const signUp: AuthContextValue['signUp'] = async ({ nome, email, password, cargoInformado }) => {
    if (!supabase) return { error: 'Supabase não configurado' }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, cargo_informado: cargoInformado },
      },
    })
    if (error) return { error: traduzErroSupabase(error.message) }
    // Após signUp, deslogamos imediatamente — usuário precisa esperar aprovação
    await supabase.auth.signOut()
    return {}
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
    setUsuario(null)
    try {
      localStorage.removeItem(KEEP_KEY)
      localStorage.removeItem(STARTED_KEY)
    } catch {}
  }

  const value: AuthContextValue = useMemo(() => ({
    loading,
    session,
    user: session?.user ?? null,
    usuario,
    isAuthenticated: Boolean(session?.user),
    isActive: usuario?.status === 'ativo',
    perfil: usuario?.perfil ?? null,
    signIn,
    signUp,
    signOut,
    reloadUsuario,
  }), [loading, session, usuario, reloadUsuario])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}

// Tradução de mensagens comuns do Supabase Auth
function traduzErroSupabase(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Email ou senha incorretos.'
  if (m.includes('email logins are disabled') || m.includes('email_provider_disabled')) {
    return 'Login por email está desabilitado no Supabase. Vá em Authentication → Providers → Email → ative o toggle "Enable Email provider".'
  }
  if (m.includes('email not confirmed')) return 'Email ainda não confirmado. Aguarde a aprovação do administrador.'
  if (m.includes('user already registered') || m.includes('already exists')) return 'Já existe uma conta com esse email.'
  if (m.includes('password should be') || m.includes('weak password')) return 'A senha precisa ter no mínimo 8 caracteres.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas. Aguarde 1 minuto e tente novamente.'
  if (m.includes('signup') && m.includes('disabled')) return 'Cadastro de novos usuários está desabilitado no Supabase.'
  if (m.includes('email address') && m.includes('invalid')) return 'Email inválido.'
  return `Erro: ${msg}`
}
