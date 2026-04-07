interface Account {
  id: string
  name: string
  account_status: number
  currency: string
  timezone_name: string
  amount_spent?: string
}

interface Props {
  accounts: Account[]
  selected: string
  onChange: (id: string) => void
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Ativa', color: 'var(--green)' },
  2: { label: 'Desabilitada', color: 'var(--red)' },
  3: { label: 'Não Confirmada', color: 'var(--yellow)' },
  7: { label: 'Em Revisão', color: 'var(--yellow)' },
  9: { label: 'Fechada', color: 'var(--text-muted)' },
  100: { label: 'Pendente', color: 'var(--yellow)' },
  101: { label: 'Pendente Closura', color: 'var(--yellow)' },
  201: { label: 'Limite Gasto', color: 'var(--red)' },
}

export default function AccountSelector({ accounts, selected, onChange }: Props) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, marginBottom: 10, fontSize: 12, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Conta de Anúncio
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {accounts.map(acc => {
          const status = STATUS_MAP[acc.account_status] || { label: `Status ${acc.account_status}`, color: 'var(--text-muted)' }
          const isSelected = acc.id === selected
          return (
            <button
              key={acc.id}
              onClick={() => onChange(acc.id)}
              style={{
                background: isSelected ? 'var(--blue)' : 'var(--surface)',
                border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                borderRadius: 8,
                padding: '10px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--text)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{acc.name}</div>
              <div style={{ fontSize: 12, color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', display: 'flex', gap: 8 }}>
                <span style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : status.color }}>● {status.label}</span>
                <span>{acc.currency}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
