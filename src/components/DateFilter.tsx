import { useState } from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface DateRange {
  since: string  // YYYY-MM-DD
  until: string  // YYYY-MM-DD
  preset: string
}

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
const today = () => new Date()

const PRESETS = [
  { label: 'Hoje', key: 'today', range: () => ({ since: fmt(today()), until: fmt(today()) }) },
  { label: '7 dias', key: '7d', range: () => ({ since: fmt(subDays(today(), 6)), until: fmt(today()) }) },
  { label: '14 dias', key: '14d', range: () => ({ since: fmt(subDays(today(), 13)), until: fmt(today()) }) },
  { label: '30 dias', key: '30d', range: () => ({ since: fmt(subDays(today(), 29)), until: fmt(today()) }) },
  { label: 'Este mês', key: 'this_month', range: () => ({ since: fmt(startOfMonth(today())), until: fmt(today()) }) },
  { label: 'Mês passado', key: 'last_month', range: () => ({ since: fmt(startOfMonth(subMonths(today(), 1))), until: fmt(endOfMonth(subMonths(today(), 1))) }) },
  { label: 'Este ano', key: 'this_year', range: () => ({ since: fmt(startOfYear(today())), until: fmt(today()) }) },
  { label: 'Máximo', key: 'maximum', range: () => ({ since: '', until: '' }) },
]

function fmtDisplay(date: string) {
  if (!date) return '—'
  try {
    return format(new Date(date + 'T12:00:00'), "dd 'de' MMM yyyy", { locale: ptBR })
  } catch { return date }
}

export default function DateFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [customSince, setCustomSince] = useState(value.since)
  const [customUntil, setCustomUntil] = useState(value.until)

  const handlePreset = (p: typeof PRESETS[0]) => {
    const r = p.range()
    setCustomSince(r.since)
    setCustomUntil(r.until)
    onChange({ ...r, preset: p.key })
    if (p.key !== 'custom') setOpen(false)
  }

  const handleCustomApply = () => {
    if (!customSince || !customUntil) return
    onChange({ since: customSince, until: customUntil, preset: 'custom' })
    setOpen(false)
  }

  const currentPreset = PRESETS.find(p => p.key === value.preset)
  const displayLabel = value.preset === 'maximum'
    ? 'Todo o histórico'
    : value.preset === 'custom' || !currentPreset
    ? `${fmtDisplay(value.since)} → ${fmtDisplay(value.until)}`
    : currentPreset.label

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--surface2)',
          border: `1px solid ${open ? 'var(--gold)' : 'var(--border)'}`,
          borderRadius: 7,
          padding: '7px 14px',
          color: open ? 'var(--gold)' : 'var(--text)',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}
      >
        <span>📅</span>
        <span>{displayLabel}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Overlay para fechar */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 199 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 200,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 16,
            width: 300,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            {/* Presets */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Períodos rápidos
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PRESETS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => handlePreset(p)}
                    style={{
                      background: value.preset === p.key ? 'var(--gold)' : 'var(--surface2)',
                      border: `1px solid ${value.preset === p.key ? 'var(--gold)' : 'var(--border)'}`,
                      borderRadius: 5,
                      padding: '4px 10px',
                      color: value.preset === p.key ? '#1a1500' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: value.preset === p.key ? 600 : 400,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divisor */}
            <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

            {/* Período personalizado */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Período personalizado
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>De</div>
                  <input
                    type="date"
                    value={customSince}
                    onChange={e => { setCustomSince(e.target.value) }}
                    style={{
                      width: '100%',
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '6px 8px',
                      color: 'var(--text)',
                      fontSize: 13,
                      outline: 'none',
                      colorScheme: 'dark',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Até</div>
                  <input
                    type="date"
                    value={customUntil}
                    onChange={e => { setCustomUntil(e.target.value) }}
                    style={{
                      width: '100%',
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '6px 8px',
                      color: 'var(--text)',
                      fontSize: 13,
                      outline: 'none',
                      colorScheme: 'dark',
                    }}
                  />
                </div>
                <button
                  onClick={handleCustomApply}
                  disabled={!customSince || !customUntil}
                  style={{
                    background: 'var(--gold)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '7px 14px',
                    color: '#1a1500',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: (!customSince || !customUntil) ? 0.4 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
