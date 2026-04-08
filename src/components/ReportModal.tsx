interface Props {
  content: string
  reportHtml?: string
  onClose: () => void
  mode?: 'technical' | 'executive'
}

function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let inTable = false
  let inList = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Table row
    if (/^\|/.test(line)) {
      if (!inTable) { out.push('<table>'); inTable = true }
      if (/^\|[-| ]+\|$/.test(line)) continue // separator row
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      const tag = i > 0 && /^\|[-| ]+\|$/.test(lines[i + 1] || '') ? 'th' : 'td'
      out.push(`<tr>${cells.map(c => `<${tag}>${inlineFormat(c)}</${tag}>`).join('')}</tr>`)
      continue
    } else if (inTable) {
      out.push('</table>')
      inTable = false
    }

    // List item
    if (/^- /.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true }
      out.push(`<li>${inlineFormat(line.slice(2))}</li>`)
      continue
    } else if (inList) {
      out.push('</ul>')
      inList = false
    }

    if (/^# /.test(line))        out.push(`<h1>${inlineFormat(line.slice(2))}</h1>`)
    else if (/^## /.test(line))  out.push(`<h2>${inlineFormat(line.slice(3))}</h2>`)
    else if (/^### /.test(line)) out.push(`<h3>${inlineFormat(line.slice(4))}</h3>`)
    else if (/^---$/.test(line)) out.push('<hr>')
    else if (line.trim() === '') out.push('<br>')
    else                         out.push(`<p>${inlineFormat(line)}</p>`)
  }

  if (inTable) out.push('</table>')
  if (inList) out.push('</ul>')
  return out.join('\n')
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

export default function ReportModal({ content, reportHtml, onClose, mode }: Props) {
  const handleCopy = () => navigator.clipboard.writeText(content)

  const handleDownloadPDF = () => {
    // Executive mode gets its own rich HTML; technical mode converts markdown
    if (reportHtml) {
      const win = window.open('', '_blank')
      if (!win) return
      win.document.write(reportHtml)
      win.document.close()
      win.focus()
      setTimeout(() => { win.print(); win.close() }, 600)
      return
    }
    const html = markdownToHtml(content)
    const logoUrl = `${window.location.origin}/logo.webp`
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório LZX Pesca</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Rubik', 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a1a; line-height: 1.6; }

    /* ── Cabeçalho ── */
    .report-header {
      background: #0d1017;
      padding: 24px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid #c4a35a;
    }
    .report-header-left { display: flex; align-items: center; gap: 16px; }
    .report-header img { height: 48px; }
    .report-header-divider { width: 1px; height: 40px; background: rgba(196,163,90,0.4); }
    .report-header-title { color: #c4a35a; font-size: 14px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .report-header-sub { color: #8a95a8; font-size: 11px; margin-top: 2px; }
    .report-header-date { color: #8a95a8; font-size: 12px; text-align: right; }

    /* ── Conteúdo ── */
    .report-body { padding: 36px 40px; max-width: 820px; margin: 0 auto; }
    h1 { font-size: 20px; color: #8a6200; border-bottom: 2px solid #c4a35a; padding-bottom: 8px; margin-bottom: 16px; margin-top: 28px; }
    h1:first-child { margin-top: 0; }
    h2 { font-size: 15px; color: #0d1017; background: #f5ead5; border-left: 4px solid #c4a35a; padding: 8px 12px; margin-top: 28px; margin-bottom: 12px; border-radius: 0 4px 4px 0; }
    h3 { font-size: 13px; font-weight: 700; color: #333; margin-top: 16px; margin-bottom: 6px; }
    p { margin-bottom: 6px; }
    hr { border: none; border-top: 1px solid #e0d5c0; margin: 20px 0; }
    br { display: block; margin-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 20px; border: 1px solid #e0d5c0; border-radius: 6px; overflow: hidden; }
    th { background: #0d1017; color: #c4a35a; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 12px; text-align: left; }
    td { border-top: 1px solid #ede8de; padding: 7px 12px; font-size: 12px; }
    tr:nth-child(even) td { background: #faf7f2; }
    ul { margin: 8px 0 12px 20px; }
    li { margin-bottom: 4px; }
    strong { font-weight: 600; }
    em { color: #666; font-style: italic; font-size: 12px; }
    code { background: #f0ede8; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 11px; }

    /* ── Rodapé ── */
    .report-footer { background: #0d1017; color: #8a95a8; font-size: 11px; text-align: center; padding: 14px 40px; border-top: 1px solid #c4a35a44; margin-top: 40px; }

    @media print {
      .report-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report-header, .report-footer, h2, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h2 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="report-header-left">
      <img src="${logoUrl}" alt="LZX Pesca" onerror="this.style.display='none'">
      <div class="report-header-divider"></div>
      <div>
        <div class="report-header-title">Dashboard Meta Ads</div>
        <div class="report-header-sub">Relatório de Performance</div>
      </div>
    </div>
    <div class="report-header-date">Gerado em<br><strong style="color:#c4a35a">${today}</strong></div>
  </div>
  <div class="report-body">${html}</div>
  <div class="report-footer">LZX Equipamentos para Pesca — Relatório gerado automaticamente pelo Dashboard Meta Ads</div>
</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 600)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, width: '100%', maxWidth: 800,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            📄 {mode === 'executive' ? 'Relatório Executivo' : 'Relatório Técnico'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCopy} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
              📋 Copiar
            </button>
            <button onClick={handleDownloadPDF} style={{ background: 'var(--gold)', border: 'none', borderRadius: 6, padding: '5px 14px', color: '#1a1500', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              ⬇️ Exportar PDF
            </button>
            <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>
              ✕
            </button>
          </div>
        </div>
        <div style={{ overflow: 'auto', padding: 24, flex: 1 }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
            {content}
          </pre>
        </div>
      </div>
    </div>
  )
}
