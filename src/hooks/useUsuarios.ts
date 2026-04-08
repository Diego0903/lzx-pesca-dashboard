import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { UsuarioRow, UserPerfil } from '../auth/AuthContext'
import { writeAuditLog } from './useAuditLog'

export interface UseUsuariosResult {
  loading: boolean
  error: string | null
  pendentes: UsuarioRow[]
  ativos: UsuarioRow[]
  rejeitados: UsuarioRow[]
  inativos: UsuarioRow[]
  reload: () => Promise<void>
  aprovar: (id: string, perfil: 'admin' | 'funcionario') => Promise<void>
  rejeitar: (id: string) => Promise<void>
  desativar: (id: string) => Promise<void>
  reativar: (id: string) => Promise<void>
  alterarPerfil: (id: string, novoPerfil: UserPerfil) => Promise<void>
  resetSenha: (email: string) => Promise<void>
}

export function useUsuarios(currentUser: UsuarioRow | null): UseUsuariosResult {
  const currentUserId = currentUser?.id ?? null
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('usuarios')
      .select('*')
      .order('criado_em', { ascending: false })
    if (err) setError(err.message)
    else setUsuarios((data ?? []) as UsuarioRow[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Helper para achar uma linha localmente (pra pegar o nome do alvo no log)
  const find = (id: string) => usuarios.find(u => u.id === id) ?? null

  const aprovar: UseUsuariosResult['aprovar'] = async (id, perfil) => {
    if (!supabase) return
    const target = find(id)
    const { error: err } = await supabase
      .from('usuarios')
      .update({
        status: 'ativo',
        perfil,
        aprovado_em: new Date().toISOString(),
        aprovado_por: currentUserId ?? null,
      })
      .eq('id', id)
    if (err) throw err
    await writeAuditLog(currentUser, {
      acao: 'aprovar',
      alvoId: id,
      alvoNome: target?.nome ?? null,
      detalhes: { perfil },
    })
    await load()
  }

  const rejeitar: UseUsuariosResult['rejeitar'] = async (id) => {
    if (!supabase) return
    const target = find(id)
    const { error: err } = await supabase
      .from('usuarios')
      .update({ status: 'rejeitado', rejeitado_em: new Date().toISOString() })
      .eq('id', id)
    if (err) throw err
    await writeAuditLog(currentUser, {
      acao: 'rejeitar',
      alvoId: id,
      alvoNome: target?.nome ?? null,
    })
    await load()
  }

  const desativar: UseUsuariosResult['desativar'] = async (id) => {
    if (!supabase) return
    const target = find(id)
    const { error: err } = await supabase
      .from('usuarios')
      .update({ status: 'inativo', desativado_em: new Date().toISOString() })
      .eq('id', id)
    if (err) throw err
    await writeAuditLog(currentUser, {
      acao: 'desativar',
      alvoId: id,
      alvoNome: target?.nome ?? null,
    })
    await load()
  }

  const reativar: UseUsuariosResult['reativar'] = async (id) => {
    if (!supabase) return
    const target = find(id)
    const { error: err } = await supabase
      .from('usuarios')
      .update({ status: 'pendente', desativado_em: null, rejeitado_em: null })
      .eq('id', id)
    if (err) throw err
    await writeAuditLog(currentUser, {
      acao: 'reativar',
      alvoId: id,
      alvoNome: target?.nome ?? null,
    })
    await load()
  }

  const alterarPerfil: UseUsuariosResult['alterarPerfil'] = async (id, novoPerfil) => {
    if (!supabase) return
    const target = find(id)
    const perfilAnterior = target?.perfil ?? null
    const { error: err } = await supabase
      .from('usuarios')
      .update({ perfil: novoPerfil })
      .eq('id', id)
    if (err) throw err
    await writeAuditLog(currentUser, {
      acao: 'alterar_perfil',
      alvoId: id,
      alvoNome: target?.nome ?? null,
      detalhes: { de: perfilAnterior, para: novoPerfil },
    })
    await load()
  }

  const resetSenha: UseUsuariosResult['resetSenha'] = async (email) => {
    if (!supabase) return
    const target = usuarios.find(u => u.email === email) ?? null
    const { error: err } = await supabase.auth.resetPasswordForEmail(email)
    if (err) throw err
    await writeAuditLog(currentUser, {
      acao: 'reset_senha',
      alvoId: target?.id ?? null,
      alvoNome: target?.nome ?? email,
    })
  }

  return {
    loading,
    error,
    pendentes: usuarios.filter(u => u.status === 'pendente'),
    ativos:    usuarios.filter(u => u.status === 'ativo'),
    rejeitados:usuarios.filter(u => u.status === 'rejeitado'),
    inativos:  usuarios.filter(u => u.status === 'inativo'),
    reload: load,
    aprovar, rejeitar, desativar, reativar, alterarPerfil, resetSenha,
  }
}
