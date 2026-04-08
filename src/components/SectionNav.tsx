export type Section = 'marketing' | 'crm' | 'pedidos'

interface Props {
  active: Section
  onChange: (s: Section) => void
}

const ITEMS: { key: Section; label: string; icon: string }[] = [
  { key: 'marketing', label: 'Marketing', icon: '📊' },
  { key: 'crm',       label: 'CRM',       icon: '👥' },
  { key: 'pedidos',   label: 'Pedidos',   icon: '📦' },
]

/** Pílula horizontal — visível apenas em desktop */
export default function SectionNav({ active, onChange }: Props) {
  return (
    <nav className="section-nav-desktop" aria-label="Seções principais">
      {ITEMS.map(it => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          className={active === it.key ? 'active' : ''}
          aria-current={active === it.key ? 'page' : undefined}
        >
          <span aria-hidden="true">{it.icon}</span> {it.label}
        </button>
      ))}
    </nav>
  )
}

/** Bottom nav fixo — visível apenas em mobile */
export function MobileBottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Navegação móvel">
      {ITEMS.map(it => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          className={active === it.key ? 'active' : ''}
          aria-current={active === it.key ? 'page' : undefined}
        >
          <span className="bottom-nav-icon" aria-hidden="true">{it.icon}</span>
          <span className="bottom-nav-label">{it.label}</span>
        </button>
      ))}
    </nav>
  )
}
