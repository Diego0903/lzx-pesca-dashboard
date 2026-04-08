import type { LeadStage } from '../data/mockCrm'
import { STAGE_LIST, STAGE_META } from '../data/leadStages'

interface Props {
  value: LeadStage
  onChange: (next: LeadStage) => void
  /** Nome do lead para o aria-label de acessibilidade */
  leadName: string
  disabled?: boolean
  /** "label" usa rótulo curto (default), "longLabel" usa o longo do kanban */
  variant?: 'label' | 'longLabel'
}

/**
 * Select estilizado como badge dourado/colorido. Usado em CrmPage.ClientList,
 * CadastrarClientePage.MeusCadastrosHistory, e em qualquer outro lugar onde
 * o usuário precisa trocar o stage de um lead direto da listagem.
 */
export default function StageBadgeSelect({ value, onChange, leadName, disabled, variant = 'label' }: Props) {
  const meta = STAGE_META[value]
  return (
    <select
      value={value}
      disabled={disabled}
      onClick={e => e.stopPropagation()}
      onChange={e => { e.stopPropagation(); onChange(e.target.value as LeadStage) }}
      className={`badge ${meta.pillClass}`}
      aria-label={`Status do lead ${leadName}`}
      style={{
        padding: '4px 11px',
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        borderRadius: 999,
        cursor: disabled ? 'wait' : 'pointer',
        appearance: 'none',
        WebkitAppearance: 'none',
      }}
    >
      {STAGE_LIST.map(s => (
        <option
          key={s}
          value={s}
          style={{ background: 'var(--surface2)', color: 'var(--text)', textTransform: 'none', letterSpacing: 0 }}
        >
          {STAGE_META[s][variant]}
        </option>
      ))}
    </select>
  )
}
