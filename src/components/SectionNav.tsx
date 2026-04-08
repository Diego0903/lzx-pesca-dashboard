export type Section = 'marketing' | 'crm' | 'pedidos' | 'usuarios' | 'configuracoes'

interface Props {
  active: Section
  onChange: (s: Section) => void
  showDonoItems?: boolean     // mostra abas "Usuários" e "Configurações" (só Dono)
  pendentesCount?: number     // badge no botão Usuários
}

const BASE_ITEMS: { key: Section; label: string; icon: string }[] = [
  { key: 'marketing', label: 'Marketing', icon: '📊' },
  { key: 'crm',       label: 'CRM',       icon: '👥' },
  { key: 'pedidos',   label: 'Pedidos',   icon: '📦' },
]
const DONO_ITEMS: { key: Section; label: string; icon: string }[] = [
  { key: 'usuarios',     label: 'Usuários',      icon: '🔑' },
  { key: 'configuracoes',label: 'Configurações', icon: '⚙️' },
]

/** Pílula horizontal — visível apenas em desktop */
export default function SectionNav({ active, onChange, showDonoItems, pendentesCount = 0 }: Props) {
  const items = showDonoItems ? [...BASE_ITEMS, ...DONO_ITEMS] : BASE_ITEMS
  return (
    <nav className="section-nav-desktop" aria-label="Seções principais">
      {items.map(it => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          className={active === it.key ? 'active' : ''}
          aria-current={active === it.key ? 'page' : undefined}
          style={{ position: 'relative' }}
        >
          <span aria-hidden="true">{it.icon}</span> {it.label}
          {it.key === 'usuarios' && pendentesCount > 0 && (
            <span style={{
              position: 'absolute',
              top: 2, right: 2,
              background: 'var(--trust-red)',
              color: '#fff',
              borderRadius: 999,
              fontSize: 9,
              fontWeight: 700,
              minWidth: 16, height: 16,
              padding: '0 4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--bg)',
            }}>
              {pendentesCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}

/** Bottom nav fixo — visível apenas em mobile */
export function MobileBottomNav({ active, onChange, showDonoItems, pendentesCount = 0 }: Props) {
  const items = showDonoItems ? [...BASE_ITEMS, ...DONO_ITEMS] : BASE_ITEMS
  return (
    <nav className="bottom-nav" aria-label="Navegação móvel">
      {items.map(it => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          className={active === it.key ? 'active' : ''}
          aria-current={active === it.key ? 'page' : undefined}
          style={{ position: 'relative' }}
        >
          <span className="bottom-nav-icon" aria-hidden="true">{it.icon}</span>
          <span className="bottom-nav-label">{it.label}</span>
          {it.key === 'usuarios' && pendentesCount > 0 && (
            <span style={{
              position: 'absolute',
              top: 4, right: 8,
              background: 'var(--trust-red)',
              color: '#fff',
              borderRadius: 999,
              fontSize: 9,
              fontWeight: 700,
              minWidth: 16, height: 16,
              padding: '0 4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {pendentesCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}
