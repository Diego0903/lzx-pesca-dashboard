import { useState, useEffect } from 'react'
import { api } from '../api'
import type { IgProfile, IgInsight, IgMedia } from '../types'
import type { DateRange } from './DateFilter'
import { fmtNum } from '../utils/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  dateRange: DateRange
}

function MetricCard({ label, value, icon, color = 'var(--blue)' }: { label: string; value: string; icon: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '18px 20px',
      flex: '1 1 150px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.5px' }}>{value}</div>
    </div>
  )
}

function MediaCard({ media }: { media: IgMedia }) {
  const thumb = media.thumbnail_url || media.media_url
  const date = (() => {
    try { return format(parseISO(media.timestamp), "d 'de' MMM", { locale: ptBR }) }
    catch { return '' }
  })()

  return (
    <a href={media.permalink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        {/* Thumbnail */}
        <div style={{ position: 'relative', paddingTop: '100%', background: 'var(--bg)' }}>
          {thumb ? (
            <img
              src={thumb}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
              {media.media_type === 'VIDEO' ? '🎬' : '🖼️'}
            </div>
          )}
          {/* Type badge */}
          <div style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.6)', borderRadius: 4,
            padding: '2px 6px', fontSize: 10, color: '#fff', fontWeight: 600,
          }}>
            {media.media_type === 'VIDEO' ? '▶ Vídeo' : media.media_type === 'CAROUSEL_ALBUM' ? '⊞ Carrossel' : '📷 Foto'}
          </div>
        </div>
        {/* Info */}
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{date}</div>
          {media.caption && (
            <div style={{
              fontSize: 12, color: 'var(--text)', marginBottom: 8,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {media.caption}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>❤️ {fmtNum(media.like_count)}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>💬 {fmtNum(media.comments_count)}</span>
          </div>
        </div>
      </div>
    </a>
  )
}

export default function InstagramInsights({ dateRange }: Props) {
  const [igUserId, setIgUserId] = useState<string>('')
  const [profile, setProfile] = useState<IgProfile | null>(null)
  const [insights, setInsights] = useState<IgInsight[]>([])
  const [media, setMedia] = useState<IgMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Discover Instagram account once
  useEffect(() => {
    api.igDiscover().then(res => {
      const page = res.data?.find(p => p.instagram_business_account)
      if (page?.instagram_business_account) {
        setIgUserId(page.instagram_business_account.id)
      } else {
        setError('Nenhuma conta Instagram Business encontrada vinculada à página.')
        setLoading(false)
      }
    }).catch(e => {
      setError(e.message)
      setLoading(false)
    })
  }, [])

  // Fetch data when IG account found or date range changes
  useEffect(() => {
    if (!igUserId) return
    setLoading(true)
    setError(null)

    const since = dateRange.since || undefined
    const until = dateRange.until || undefined

    Promise.all([
      api.igProfile(igUserId),
      api.igInsights(igUserId, since, until),
      api.igMedia(igUserId),
    ]).then(([prof, ins, med]) => {
      setProfile(prof)
      setInsights((ins.data || []) as IgInsight[])
      setMedia((med.data || []) as IgMedia[])
    }).catch(e => {
      setError(e.message)
    }).finally(() => setLoading(false))
  }, [igUserId, dateRange])

  // Sum insight values over the period
  const sumMetric = (name: string) =>
    insights.find(i => i.name === name)?.values.reduce((s, v) => s + v.value, 0) ?? 0

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      Carregando dados do Instagram...
    </div>
  )

  if (error) return (
    <div style={{
      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: 8, padding: 16, color: 'var(--red)',
    }}>
      <strong>Erro:</strong> {error}
    </div>
  )

  return (
    <div>
      {/* Profile header */}
      {profile && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <img
            src={profile.profile_picture_url}
            alt={profile.username}
            style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid var(--gold)', objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 2 }}>
              @{profile.username}
            </div>
            {profile.name && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{profile.name}</div>
            )}
            <div style={{ display: 'flex', gap: 20 }}>
              <span style={{ fontSize: 13 }}>
                <strong style={{ color: 'var(--text)' }}>{fmtNum(profile.followers_count)}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>seguidores</span>
              </span>
              <span style={{ fontSize: 13 }}>
                <strong style={{ color: 'var(--text)' }}>{fmtNum(profile.follows_count)}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>seguindo</span>
              </span>
              <span style={{ fontSize: 13 }}>
                <strong style={{ color: 'var(--text)' }}>{fmtNum(profile.media_count)}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>publicações</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Metrics cards */}
      <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, marginBottom: 12, fontSize: 14, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Métricas do Período
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
        {profile && <MetricCard label="Seguidores" value={fmtNum(profile.followers_count)} icon="👥" color="var(--purple)" />}
        <MetricCard label="Impressões" value={fmtNum(sumMetric('impressions'))} icon="👁️" color="var(--blue)" />
        <MetricCard label="Alcance" value={fmtNum(sumMetric('reach'))} icon="📡" color="var(--cyan)" />
        <MetricCard label="Visitas ao Perfil" value={fmtNum(sumMetric('profile_views'))} icon="🔍" color="var(--yellow)" />
      </div>

      {/* Recent posts */}
      {media.length > 0 && (
        <>
          <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 600, marginBottom: 12, fontSize: 14, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Publicações Recentes
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {media.map(m => <MediaCard key={m.id} media={m} />)}
          </div>
        </>
      )}
    </div>
  )
}
