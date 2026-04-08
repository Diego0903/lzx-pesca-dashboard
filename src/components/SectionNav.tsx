export type Section = 'marketing' | 'crm' | 'pedidos' | 'usuarios' | 'configuracoes'

interface Props {
  active: Section
  onChange: (s: Section) => void
  /** Mostra aba "Usuários" — apenas Dono */
  showUsuariosItem?: boolean
  /** Mostra aba "Configurações" — apenas Dono */
  showConfigItem?: boolean
  pendentesCount?: number     // badge no botão Usuários
}

const BASE_ITEMS: { key: Section; label: string; icon: string }[] = [
  { key: 'marketing', label: 'Marketing', icon: '📊' },
  { key: 'crm',       label: 'CRM',       icon: '👥' },
  { key: 'pedidos',   label: 'Pedidos',   icon: '📦' },
]
const USUARIOS_ITEM = { key: 'usuarios' as const,     label: 'Usuários',      icon: '🔑' }
const CONFIG_ITEM   = { key: 'configuracoes' as const, label: 'Configurações', icon: '⚙️' }

function buildItems(showUsuarios: boolean, showConfig: boolean) {
  const items: { key: Section; label: string; icon: string }[] = [...BASE_ITEMS]
  if (showUsuarios) items.push(USUARIOS_ITEM)
  if (showConfig)   items.push(CONFIG_ITEM)
  return items
}

/** Pílula horizontal — visível apenas em desktop */
export default function SectionNav({ active, onChange, showUsuariosItem = false, showConfigItem = false, pendentesCount = 0 }: Props) {
  const items = buildItems(showUsuariosItem, showConfigItem)
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
export function MobileBottomNav({ active, onChange, showUsuariosItem = false, showConfigItem = false, pendentesCount = 0 }: Props) {
  const items = buildItems(showUsuariosItem, showConfigItem)
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
