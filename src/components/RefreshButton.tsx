import { formatRelativeTime, useNowTick } from '../utils/relativeTime'

interface RefreshButtonProps {
  lastUpdatedAt: Date | null
  loading: boolean
  onRefresh: () => void
  title?: string
}

// Encapsula o tick de 30s aqui — assim só este componente re-renderiza,
// não a árvore inteira do dashboard.
export default function RefreshButton({ lastUpdatedAt, loading, onRefresh, title = 'Atualizar dados agora' }: RefreshButtonProps) {
  useNowTick()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="report-btn-label" style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
        {lastUpdatedAt ? `Atualizado ${formatRelativeTime(lastUpdatedAt)}` : '—'}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        title={title}
        aria-label={title}
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 7,
          width: 34,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: loading ? 'wait' : 'pointer',
          fontSize: 14,
          color: 'var(--text)',
          flexShrink: 0,
          opacity: loading ? 0.6 : 1,
          transition: 'background 0.15s',
        }}
      >
        {loading ? '⏳' : '↻'}
      </button>
    </div>
  )
}
