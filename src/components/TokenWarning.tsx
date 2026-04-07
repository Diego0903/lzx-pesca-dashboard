interface Props {
  tokenInfo: {
    is_valid: boolean
    scopes: string[]
    expires_at: number
    application: string
  }
}

export default function TokenWarning({ tokenInfo }: Props) {
  const needed = ['ads_read', 'ads_management', 'instagram_basic', 'pages_show_list', 'business_management']
  const have = tokenInfo.scopes
  const missing = needed.filter(s => !have.includes(s))

  return (
    <div style={{
      background: 'rgba(245,158,11,0.08)',
      border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: 12,
      padding: 24,
      marginBottom: 28,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 24, flexShrink: 0 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--yellow)', marginBottom: 8 }}>
            Token sem permissões para Ads
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            O token atual (<strong style={{ color: 'var(--text)' }}>{tokenInfo.application}</strong>) só tem{' '}
            <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4 }}>
              {have.join(', ')}
            </code>
            . Para acessar campanhas, são necessárias permissões adicionais.
          </p>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Permissões faltando:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {missing.map(s => (
                <span key={s} style={{
                  background: 'rgba(239,68,68,0.15)',
                  color: 'var(--red)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: 12,
                  fontFamily: 'monospace',
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div style={{ fontWeight: 600, marginBottom: 10, color: 'var(--text)' }}>Como corrigir:</div>
          <ol style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{
                background: 'var(--yellow)',
                color: '#000',
                borderRadius: '50%',
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 1,
              }}>1</span>
              <span style={{ color: 'var(--text-muted)' }}>
                Acesse o{' '}
                <a href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--blue)' }}>
                  Meta Graph API Explorer
                </a>
              </span>
            </li>
            <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{
                background: 'var(--yellow)',
                color: '#000',
                borderRadius: '50%',
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 1,
              }}>2</span>
              <span style={{ color: 'var(--text-muted)' }}>
                Selecione o app <strong style={{ color: 'var(--text)' }}>Claude Gestor - LZX Pesca</strong> (ID: 1432499064785033)
              </span>
            </li>
            <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{
                background: 'var(--yellow)',
                color: '#000',
                borderRadius: '50%',
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 1,
              }}>3</span>
              <span style={{ color: 'var(--text-muted)' }}>
                Adicione as permissões:{' '}
                {missing.map((s, i) => (
                  <span key={s}>
                    <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>{s}</code>
                    {i < missing.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </span>
            </li>
            <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{
                background: 'var(--yellow)',
                color: '#000',
                borderRadius: '50%',
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 1,
              }}>4</span>
              <span style={{ color: 'var(--text-muted)' }}>
                Clique em <strong style={{ color: 'var(--text)' }}>Generate Access Token</strong>, copie e cole em{' '}
                <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>server.js</code>{' '}
                na variável <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>TOKEN</code>
              </span>
            </li>
            <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{
                background: 'var(--yellow)',
                color: '#000',
                borderRadius: '50%',
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 1,
              }}>5</span>
              <span style={{ color: 'var(--text-muted)' }}>
                Reinicie o servidor com <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>npm run dev</code>
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
