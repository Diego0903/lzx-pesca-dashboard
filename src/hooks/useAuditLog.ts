import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { UsuarioRow } from '../auth/AuthContext'

export interface AuditLogRow {
  id: string
  acao: string
  usuario_id: string | null
  usuario_nome: string | null
  alvo_id: string | null
  alvo_nome: string | null
  detalhes: Record<string, unknown> | null
  criado_em: string
}

interface WriteParams {
  acao: string
  alvoId?: string | null
  alvoNome?: string | null
  detalhes?: Record<string, unknown>
}

/** Escreve uma linha no audit_log. Usa o usuário atual como autor. */
export async function writeAuditLog(currentUser: UsuarioRow | null, params: WriteParams) {
  if (!supabase || !currentUser) return
  await supabase.from('audit_log').insert({
    acao: params.acao,
    usuario_id: currentUser.id,
    usuario_nome: currentUser.nome,
    alvo_id: params.alvoId ?? null,
    alvo_nome: params.alvoNome ?? null,
    detalhes: params.detalhes ?? null,
  })
}

/** Hook pra ler logs (usado no painel /admin/usuarios → aba Logs). */
export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('audit_log')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(500)
    if (err) setError(err.message)
    else setLogs((data ?? []) as AuditLogRow[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { logs, loading, error, reload: load }
}
