interface Props {
  content: string
  onClose: () => void
}

export default function ReportModal({ content, onClose }: Props) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_lzx_pesca_${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        width: '100%',
        maxWidth: 800,
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>📄 Relatório de Análise</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCopy} style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '5px 12px',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: 13,
            }}>
              📋 Copiar
            </button>
            <button onClick={handleDownload} style={{
              background: 'var(--blue)',
              border: 'none',
              borderRadius: 6,
              padding: '5px 12px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}>
              ⬇️ Baixar .md
            </button>
            <button onClick={onClose} style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '5px 10px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 16,
            }}>
              ✕
            </button>
          </div>
        </div>
        <div style={{
          overflow: 'auto',
          padding: 24,
          flex: 1,
        }}>
          <pre style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: 13,
            color: 'var(--text)',
            lineHeight: 1.7,
          }}>
            {content}
          </pre>
        </div>
      </div>
    </div>
  )
}
