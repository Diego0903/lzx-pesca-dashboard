import { useEffect, useRef, useState } from 'react'
import { useAuth, type UserPerfil } from '../auth/AuthContext'

const PERFIL_LABEL: Record<UserPerfil, string> = {
  dono: 'Dono',
  admin: 'Administrador',
  funcionario: 'Funcionário',
}

function initials(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('') || '?'
}

export default function UserMenu() {
  const { usuario, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!usuario) return null

  const handleLogout = async () => {
    if (!confirm('Sair do dashboard?')) return
    await signOut()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Menu do usuário"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 999,
          padding: '4px 12px 4px 4px',
          cursor: 'pointer',
          color: 'var(--text)',
          transition: 'all 0.18s',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'linear-gradient(180deg, var(--gold-light), var(--gold-deep))',
            color: '#1a1500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 11,
            fontFamily: 'var(--font-display)',
            letterSpacing: 0,
          }}
        >
          {initials(usuario.nome)}
        </span>
        <span className="report-btn-label" style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.1, textAlign: 'left' }}>
          <div style={{ color: 'var(--text)' }}>{usuario.nome.split(' ')[0]}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }}>{PERFIL_LABEL[usuario.perfil]}</div>
        </span>
      </button>

      {open && (
        <div
          className="glass-strong"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 200,
            minWidth: 240,
            padding: 14,
            borderRadius: 14,
          }}
        >
          <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--border-soft)', marginBottom: 10 }}>
            <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{usuario.nome}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{usuario.email}</div>
            <div style={{ marginTop: 8 }}>
              <span className={`badge ${usuario.perfil === 'dono' ? 'badge-gold' : usuario.perfil === 'admin' ? 'badge-blue' : 'badge-muted'}`}>
                {PERFIL_LABEL[usuario.perfil]}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid rgba(216,86,86,0.3)',
              borderRadius: 10,
              padding: '9px 12px',
              color: 'var(--trust-red)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(216,86,86,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Sair do Dashboard
          </button>
        </div>
      )}
    </div>
  )
}
