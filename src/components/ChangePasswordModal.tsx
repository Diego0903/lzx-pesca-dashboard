import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

interface Props {
  onClose: () => void
}

export default function ChangePasswordModal({ onClose }: Props) {
  const { usuario } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmNext, setConfirmNext] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (next.length < 8) {
      setError('A nova senha precisa ter no mínimo 8 caracteres.')
      return
    }
    if (next === current) {
      setError('A nova senha precisa ser diferente da atual.')
      return
    }
    if (next !== confirmNext) {
      setError('As novas senhas não coincidem.')
      return
    }
    if (!supabase || !usuario) {
      setError('Sessão inválida.')
      return
    }

    setBusy(true)

    // 1) Re-autentica usando a senha atual (Supabase Auth não pede a senha
    //    atual no updateUser, então fazemos signIn pra validar antes)
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: usuario.email,
      password: current,
    })
    if (reauthErr) {
      setBusy(false)
      setError('Senha atual incorreta.')
      return
    }

    // 2) Atualiza para a nova senha
    const { error: updateErr } = await supabase.auth.updateUser({ password: next })
    setBusy(false)

    if (updateErr) {
      setError(updateErr.message)
      return
    }
    setSuccess(true)
    setTimeout(() => onClose(), 1500)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}
      onClick={onClose}
    >
      <div
        className="glass-strong"
        style={{ background: 'var(--surface)', border: '1px solid var(--glass-border-strong)', borderRadius: 14, padding: 28, maxWidth: 420, width: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Trocar minha senha
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
          Para sua segurança, informe a senha atual antes de definir uma nova.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label htmlFor="cp-current">Senha atual</label>
            <input id="cp-current" type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cp-new">Nova senha (mín. 8 caracteres)</label>
            <input id="cp-new" type="password" autoComplete="new-password" required minLength={8} value={next} onChange={e => setNext(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cp-confirm">Confirmar nova senha</label>
            <input id="cp-confirm" type="password" autoComplete="new-password" required minLength={8} value={confirmNext} onChange={e => setConfirmNext(e.target.value)} />
          </div>

          {error && (
            <div style={{ background: 'rgba(216,86,86,0.1)', border: '1px solid rgba(216,86,86,0.3)', borderRadius: 10, padding: 12, fontSize: 12, color: 'var(--trust-red)', lineHeight: 1.5 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(95,184,90,0.1)', border: '1px solid rgba(95,184,90,0.3)', borderRadius: 10, padding: 12, fontSize: 12, color: 'var(--trust-green)', fontWeight: 600 }}>
              ✅ Senha alterada com sucesso!
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={busy || success}>
              {busy ? 'Salvando...' : 'Trocar senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
