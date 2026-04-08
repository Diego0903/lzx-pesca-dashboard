import { useState } from 'react'

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

export default function SectionNav({ active, onChange }: Props) {
  const [open, setOpen] = useState(false)

  const handleClick = (s: Section) => {
    onChange(s)
    setOpen(false)
  }

  return (
    <nav className={`section-nav ${open ? 'open' : ''}`} aria-label="Seções principais">
      <button
        type="button"
        className="section-nav-mobile-toggle btn-secondary"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label="Alternar menu"
        style={{ borderRadius: 8 }}
      >
        ☰ Menu
      </button>
      {ITEMS.map(it => (
        <button
          key={it.key}
          type="button"
          onClick={() => handleClick(it.key)}
          className={active === it.key ? 'active' : ''}
          aria-current={active === it.key ? 'page' : undefined}
        >
          <span aria-hidden="true">{it.icon}</span> {it.label}
        </button>
      ))}
    </nav>
  )
}
