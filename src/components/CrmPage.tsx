import { useMemo, useState, type FormEvent } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  leadsBySource, closeRateByCategory,
  type Lead, type LeadStage, type LeadOrigin, type ContactType, type Interaction, type ProductCategory, type BrazilState,
} from '../data/mockCrm'
import { useCrm } from '../hooks/useCrm'
import { fmtBRL, fmtNum } from '../utils/formatters'

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'novo',        label: 'Novo Lead',        color: '#3b82f6' },
  { key: 'qualificado', label: 'Qualificado',      color: '#a855f7' },
  { key: 'orcamento',   label: 'Orçamento Enviado', color: '#c4a35a' },
  { key: 'negociacao',  label: 'Negociação',       color: '#f97316' },
  { key: 'fechado',     label: 'Fechado',          color: '#16a34a' },
  { key: 'perdido',     label: 'Perdido',          color: '#dc2626' },
]

function isOverdue(iso?: string) {
  if (!iso) return false
  return new Date(iso).getTime() < Date.now()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface KanbanProps {
  leads: Lead[]
  onMove: (leadId: string, to: LeadStage) => void
  onSelect: (lead: Lead) => void
  selectedId?: string
}

function Kanban({ leads, onMove, onSelect, selectedId }: KanbanProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<LeadStage | null>(null)

  const byStage = useMemo(() => {
    const map = new Map<LeadStage, Lead[]>()
    STAGES.forEach(s => map.set(s.key, []))
    leads.forEach(l => map.get(l.stage)?.push(l))
    return map
  }, [leads])

  return (
    <div className="kanban" role="list" aria-label="Pipeline de vendas">
      {STAGES.map(stage => {
        const list = byStage.get(stage.key) ?? []
        const total = list.reduce((s, l) => s + l.estimatedValue, 0)
        return (
          <div
            key={stage.key}
            className={`kanban-col${overCol === stage.key ? ' drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setOverCol(stage.key) }}
            onDragLeave={() => setOverCol(c => c === stage.key ? null : c)}
            onDrop={e => {
              e.preventDefault()
              setOverCol(null)
              if (dragId) onMove(dragId, stage.key)
              setDragId(null)
            }}
          >
            <div className="kanban-col-header" style={{ color: stage.color }}>
              <span>{stage.label}</span>
              <span style={{ color: 'var(--text-muted)' }}>{list.length}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              {fmtBRL(total)}
            </div>
            {list.map(lead => {
              const overdue = isOverdue(lead.nextFollowUpAt)
              return (
                <div
                  key={lead.id}
                  className={`kanban-card${dragId === lead.id ? ' dragging' : ''}`}
                  draggable
                  onDragStart={() => setDragId(lead.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => onSelect(lead)}
                  style={selectedId === lead.id ? { borderColor: 'var(--gold)', boxShadow: '0 0 0 2px rgba(196,163,90,0.25)' } : undefined}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, color: 'var(--text)' }}>{lead.name}</strong>
                    {lead.recurring && <span className="badge badge-gold" style={{ fontSize: 9, padding: '2px 6px' }}>★</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                    {lead.product}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{fmtBRL(lead.estimatedValue)}</span>
                    <span style={{ color: overdue ? 'var(--trust-red)' : 'var(--text-muted)' }}>
                      {overdue ? '⚠ vencido' : fmtDate(lead.lastContactAt)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

interface LeadFormState {
  name: string; whatsapp: string; city: string; state: BrazilState
  product: string; category: ProductCategory; estimatedQty: string; origin: LeadOrigin
}

const EMPTY_FORM: LeadFormState = {
  name: '', whatsapp: '', city: '', state: 'SC',
  product: '', category: 'Redes', estimatedQty: '', origin: 'Google',
}

interface ListProps {
  leads: Lead[]
  onSelect: (l: Lead) => void
}

function ClientList({ leads, onSelect }: ListProps) {
  const [q, setQ] = useState('')
  const [stateFilter, setStateFilter] = useState<BrazilState | 'all'>('all')
  const [catFilter, setCatFilter] = useState<ProductCategory | 'all'>('all')

  const filtered = useMemo(() => leads.filter(l => {
    if (stateFilter !== 'all' && l.state !== stateFilter) return false
    if (catFilter !== 'all' && l.category !== catFilter) return false
    if (q && !l.name.toLowerCase().includes(q.toLowerCase()) && !l.product.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [leads, q, stateFilter, catFilter])

  return (
    <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Clientes & Leads <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12, textTransform: 'none' }}>({filtered.length})</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Buscar por nome ou produto..."
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ flex: '2 1 200px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', minWidth: 0 }}
          />
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value as BrazilState | 'all')} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 13 }}>
            <option value="all">Todos estados</option>
            {(['SC','RS','PR','SP','RJ','MG','BA','PA','CE','Outros'] as BrazilState[]).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value as ProductCategory | 'all')} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 13 }}>
            <option value="all">Todas categorias</option>
            {(['Redes','Linhas','Tralhas','Cordas','Boias'] as ProductCategory[]).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {filtered.map(l => (
          <button
            key={l.id}
            type="button"
            onClick={() => onSelect(l)}
            style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', padding: '12px 18px', cursor: 'pointer', color: 'var(--text)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,163,90,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <strong style={{ fontSize: 13 }}>{l.name}</strong>
              <span className={`badge ${l.recurring ? 'badge-gold' : 'badge-blue'}`}>
                {l.recurring ? 'Recorrente' : 'Novo'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {l.city}/{l.state} · {l.product} · {fmtBRL(l.estimatedValue)}
            </div>
          </button>
        ))}
        {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum cliente encontrado.</div>}
      </div>
    </div>
  )
}

interface TimelineProps {
  lead: Lead | null
  interactions: Interaction[]
  onAdd: (interaction: Omit<Interaction, 'id'>) => void
}

function InteractionTimeline({ lead, interactions, onAdd }: TimelineProps) {
  const [type, setType] = useState<ContactType>('WhatsApp')
  const [note, setNote] = useState('')

  if (!lead) {
    return (
      <div className="glass" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Selecione um lead no Kanban ou na lista para ver o histórico.
      </div>
    )
  }

  const list = interactions.filter(i => i.leadId === lead.id).sort((a, b) => b.date.localeCompare(a.date))
  const overdue = isOverdue(lead.nextFollowUpAt)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    onAdd({ leadId: lead.id, type, date: new Date().toISOString(), note: note.trim() })
    setNote('')
  }

  return (
    <div className="glass" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{lead.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {lead.whatsapp} · {lead.city}/{lead.state} · Origem: {lead.origin}
          </div>
        </div>
        {lead.nextFollowUpAt && (
          <span className={overdue ? 'badge badge-red' : 'badge badge-blue'}>
            Próximo contato: {fmtDateTime(lead.nextFollowUpAt)}
          </span>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={type} onChange={e => setType(e.target.value as ContactType)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 12 }}>
          {(['WhatsApp','Email','Ligação','Visita'] as ContactType[]).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          type="text"
          placeholder="Observação da interação..."
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{ flex: 1, minWidth: 0, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12, outline: 'none' }}
        />
        <button type="submit" className="btn-primary" disabled={!note.trim()}>+ Adicionar</button>
      </form>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 18 }}>
        <div style={{ position: 'absolute', left: 6, top: 4, bottom: 4, width: 1, background: 'var(--border)' }} />
        {list.map(it => (
          <div key={it.id} style={{ position: 'relative', marginBottom: 14 }}>
            <div style={{ position: 'absolute', left: -16, top: 4, width: 9, height: 9, borderRadius: '50%', background: 'var(--gold)', border: '2px solid var(--surface)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)' }}>{it.type}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDateTime(it.date)}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>{it.note}</div>
          </div>
        ))}
        {list.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12, paddingLeft: 4 }}>Sem interações registradas ainda.</div>}
      </div>
    </div>
  )
}

interface FormProps {
  onCreate: (lead: Lead) => void
}

function NewLeadForm({ onCreate }: FormProps) {
  const [form, setForm] = useState<LeadFormState>(EMPTY_FORM)
  const update = <K extends keyof LeadFormState>(k: K, v: LeadFormState[K]) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.whatsapp.trim()) return
    const qty = parseInt(form.estimatedQty || '0') || 0
    const newLead: Lead = {
      id: `l${Date.now()}`,
      name: form.name.trim(),
      whatsapp: form.whatsapp.trim(),
      city: form.city.trim(),
      state: form.state,
      product: form.product.trim(),
      category: form.category,
      estimatedQty: qty,
      estimatedValue: qty * 250, // estimativa rápida
      origin: form.origin,
      stage: 'novo',
      lastContactAt: new Date().toISOString(),
      nextFollowUpAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      recurring: false,
    }
    onCreate(newLead)
    setForm(EMPTY_FORM)
  }

  return (
    <form onSubmit={handleSubmit} className="glass" style={{ padding: 20 }}>
      <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
        + Novo Lead
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="field">
          <label htmlFor="lf-name">Nome</label>
          <input id="lf-name" required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Cliente ou empresa" />
        </div>
        <div className="field">
          <label htmlFor="lf-wa">WhatsApp</label>
          <input id="lf-wa" required value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="(00) 00000-0000" />
        </div>
        <div className="field">
          <label htmlFor="lf-city">Cidade</label>
          <input id="lf-city" value={form.city} onChange={e => update('city', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="lf-state">Estado</label>
          <select id="lf-state" value={form.state} onChange={e => update('state', e.target.value as BrazilState)}>
            {(['SC','RS','PR','SP','RJ','MG','BA','PA','CE','Outros'] as BrazilState[]).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lf-product">Produto de interesse</label>
          <input id="lf-product" value={form.product} onChange={e => update('product', e.target.value)} placeholder="Ex: Rede 70mm" />
        </div>
        <div className="field">
          <label htmlFor="lf-cat">Categoria</label>
          <select id="lf-cat" value={form.category} onChange={e => update('category', e.target.value as ProductCategory)}>
            {(['Redes','Linhas','Tralhas','Cordas','Boias'] as ProductCategory[]).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lf-qty">Quantidade estimada</label>
          <input id="lf-qty" type="number" min={0} value={form.estimatedQty} onChange={e => update('estimatedQty', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="lf-origin">Origem</label>
          <select id="lf-origin" value={form.origin} onChange={e => update('origin', e.target.value as LeadOrigin)}>
            {(['Google','Instagram','Facebook','Indicação','WhatsApp'] as LeadOrigin[]).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn-primary">Salvar lead</button>
      </div>
    </form>
  )
}

function MiniDashboard({ leads }: { leads: Lead[] }) {
  const openOverdue = leads.filter(l => {
    if (l.stage === 'fechado' || l.stage === 'perdido') return false
    const days = (Date.now() - new Date(l.lastContactAt).getTime()) / 86400000
    return days > 3
  })
  const totalPipeline = leads.filter(l => l.stage !== 'perdido' && l.stage !== 'fechado').reduce((s, l) => s + l.estimatedValue, 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
      {/* KPIs em linha */}
      <div className="glass" style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6 }}>Pipeline aberto</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--gold)' }}>{fmtBRL(totalPipeline)}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{leads.filter(l => l.stage !== 'perdido' && l.stage !== 'fechado').length} leads ativos</div>
      </div>
      <div className="glass" style={{ padding: '18px 20px', borderColor: openOverdue.length > 0 ? 'rgba(220,38,38,0.4)' : undefined }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden="true">⚠</span> Sem contato {'>'}3 dias
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: openOverdue.length > 0 ? 'var(--trust-red)' : 'var(--trust-green)' }}>{fmtNum(openOverdue.length)}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>requer follow-up urgente</div>
      </div>
      <div className="glass" style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6 }}>Total de leads</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--trust-blue)' }}>{fmtNum(leads.length)}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{leads.filter(l => l.recurring).length} recorrentes</div>
      </div>

      {/* Bar chart de origens */}
      <div className="glass" style={{ padding: 20, gridColumn: '1 / -1' }}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          Leads por Fonte
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={leadsBySource} layout="vertical" margin={{ top: 4, right: 12, left: 12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="source" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
            <Tooltip
              cursor={{ fill: 'rgba(196,163,90,0.06)' }}
              contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--gold)', borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="leads" fill="#3b82f6" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Close rate por categoria */}
      <div className="glass" style={{ padding: 20, gridColumn: '1 / -1' }}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          Taxa de Fechamento por Categoria
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={closeRateByCategory} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="categoria" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} unit="%" />
            <Tooltip cursor={{ fill: 'rgba(196,163,90,0.06)' }} contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--gold)', borderRadius: 8, fontSize: 12 }} formatter={(v) => `${v}%`} />
            <Bar dataKey="taxa" fill="#16a34a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function CrmPage() {
  const { leads, interactions, loading, error, source, createLead, moveLeadStage, addInteraction } = useCrm()
  const [selected, setSelected] = useState<Lead | null>(null)

  // Pick a default selected lead once data lands
  const effectiveSelected = selected ?? leads[0] ?? null

  const handleCreate = (lead: Lead) => {
    // Drop the locally-generated id; Supabase assigns its own UUID
    const { id, ...payload } = lead
    void id
    void createLead(payload)
  }

  if (loading) return (
    <div className="fade-in" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      Carregando dados do CRM...
    </div>
  )

  return (
    <div className="fade-in">
      {/* Source banner */}
      <div style={{ marginBottom: 16, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`badge ${source === 'supabase' ? 'badge-green' : 'badge-orange'}`}>
          {source === 'supabase' ? '🟢 Supabase conectado' : '🟡 Modo offline (dados de exemplo)'}
        </span>
        {error && <span style={{ color: 'var(--trust-red)' }}>· {error}</span>}
      </div>

      <MiniDashboard leads={leads} />

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          Pipeline de Vendas
        </div>
        <Kanban leads={leads} onMove={(id, to) => void moveLeadStage(id, to)} onSelect={setSelected} selectedId={effectiveSelected?.id} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 20 }}>
        <ClientList leads={leads} onSelect={setSelected} />
        <InteractionTimeline lead={effectiveSelected} interactions={interactions} onAdd={(i) => void addInteraction(i)} />
      </div>

      <NewLeadForm onCreate={handleCreate} />
    </div>
  )
}
