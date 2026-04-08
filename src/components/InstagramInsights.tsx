import { useState, useEffect, useMemo } from 'react'
import { api } from '../api'
import type { IgProfile, IgInsight, IgMedia, IgStory } from '../types'
import type { DateRange } from './DateFilter'
import { fmtNum } from '../utils/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  dateRange: DateRange
  onIgUserId?: (id: string) => void
}

function MetricCard({ label, value, icon, color = 'var(--blue)', sub }: { label: string; value: string; icon: string; color?: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 22px',
      minHeight: 110,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span className="font-display" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div className="font-display tabular" style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
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
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <div style={{ position: 'relative', paddingTop: '100%', background: 'var(--bg)' }}>
          {thumb ? (
            <img src={thumb} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
              {media.media_type === 'VIDEO' ? '🎬' : '🖼️'}
            </div>
          )}
          <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 6px', fontSize: 10, color: '#fff', fontWeight: 600 }}>
            {media.media_type === 'VIDEO' ? '▶ Vídeo' : media.media_type === 'CAROUSEL_ALBUM' ? '⊞ Carrossel' : '📷 Foto'}
          </div>
        </div>
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{date}</div>
          {media.caption && (
            <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
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

export default function InstagramInsights({ dateRange, onIgUserId }: Props) {
  const [igUserId, setIgUserId] = useState<string>('')
  const [profile, setProfile] = useState<IgProfile | null>(null)
  const [insights, setInsights] = useState<IgInsight[]>([])
  const [media, setMedia] = useState<IgMedia[]>([])
  const [stories, setStories] = useState<IgStory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.igDiscover().then(res => {
      const page = res.data?.find(p => p.instagram_business_account)
      if (page?.instagram_business_account) {
        setIgUserId(page.instagram_business_account.id)
        onIgUserId?.(page.instagram_business_account.id)
      } else {
        setError('Nenhuma conta Instagram Business encontrada vinculada à página.')
        setLoading(false)
      }
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [])

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
      api.igStories(igUserId),
    ]).then(([prof, ins, med, stor]) => {
      setProfile(prof)
      setInsights((ins.data || []) as IgInsight[])
      setMedia((med.data || []) as IgMedia[])
      setStories((stor.data || []) as IgStory[])
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [igUserId, dateRange])

  const sumMetric = (name: string) =>
    insights.find(i => i.name === name)?.values.reduce((s, v) => s + v.value, 0) ?? 0

  const totalLikes = useMemo(() => media.reduce((s, m) => s + m.like_count, 0), [media])
  const totalComments = useMemo(() => media.reduce((s, m) => s + m.comments_count, 0), [media])

  const storyImpressions = useMemo(() =>
    stories.reduce((s, st) => {
      const imp = st.insights.find(i => i.name === 'impressions')
      return s + (imp?.values[0]?.value ?? 0)
    }, 0), [stories])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      Carregando dados do Instagram...
    </div>
  )

  if (error) return (
    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 16, color: 'var(--red)' }}>
      <strong>Erro:</strong> {error}
    </div>
  )

  return (
    <div>
      {/* Profile header */}
      {profile && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, boxShadow: 'var(--shadow-sm)' }}>
          <img src={profile.profile_picture_url} alt={profile.username} style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid var(--gold)', objectFit: 'cover', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 2 }}>@{profile.username}</div>
            {profile.name && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{profile.name}</div>}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13 }}><strong style={{ color: 'var(--text)' }}>{fmtNum(profile.followers_count)}</strong><span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>seguidores</span></span>
              <span style={{ fontSize: 13 }}><strong style={{ color: 'var(--text)' }}>{fmtNum(profile.follows_count)}</strong><span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>seguindo</span></span>
              <span style={{ fontSize: 13 }}><strong style={{ color: 'var(--text)' }}>{fmtNum(profile.media_count)}</strong><span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>publicações</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 15, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Métricas do Período
      </div>
      <div className="kpi-strip kpi-strip-4" style={{ marginBottom: 32 }}>
        {profile && <MetricCard label="Seguidores" value={fmtNum(profile.followers_count)} icon="👥" color="var(--purple)" />}
        <MetricCard label="Novos Seguidores" value={fmtNum(sumMetric('follower_count'))} icon="➕" color="var(--green)" sub="no período selecionado" />
        <MetricCard label="Alcance" value={fmtNum(sumMetric('reach'))} icon="📡" color="var(--cyan)" />
        <MetricCard label="Impressões" value={fmtNum(sumMetric('impressions'))} icon="👁️" color="var(--blue)" />
        <MetricCard label="Visitas ao Perfil" value={fmtNum(sumMetric('profile_views'))} icon="🔍" color="var(--yellow)" />
        <MetricCard label="Cliques no Site" value={fmtNum(sumMetric('website_clicks'))} icon="🔗" color="var(--text)" />
        <MetricCard label="Curtidas (posts)" value={fmtNum(totalLikes)} icon="❤️" color="var(--red)" sub={`${media.length} posts recentes`} />
        <MetricCard label="Comentários" value={fmtNum(totalComments)} icon="💬" color="var(--gold)" sub={`${media.length} posts recentes`} />
        {stories.length > 0 && <MetricCard label="Visualiz. Stories" value={fmtNum(storyImpressions)} icon="🎭" color="var(--purple)" sub={`${stories.length} stories ativos`} />}
      </div>

      {/* Recent posts */}
      {media.length > 0 && (
        <>
          <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 15, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Publicações Recentes
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {media.map(m => <MediaCard key={m.id} media={m} />)}
          </div>
        </>
      )}
    </div>
  )
}
