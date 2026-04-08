import { useMemo, useState, type FormEvent } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type {
  Lead, LeadItem, LeadStage, LeadOrigin, ContactType, Interaction, ProductCategory, BrazilState,
} from '../data/mockCrm'
import { useCrm } from '../hooks/useCrm'
import { fmtBRL, fmtNum } from '../utils/formatters'
import { exportToCsv, todayStamp } from '../utils/csv'
import { STAGE_LIST, STAGE_META } from '../data/leadStages'
import StageBadgeSelect from './StageBadgeSelect'

const STAGES = STAGE_LIST.map(key => ({ key, label: STAGE_META[key].longLabel, color: STAGE_META[key].color }))

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
                  {lead.createdByName && (
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-soft)' }}>
                      por {lead.createdByName}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

interface ItemFormState {
  product: string
  category: ProductCategory
  qty: string
}

interface LeadFormState {
  name: string
  whatsapp: string
  city: string
  state: BrazilState
  origin: LeadOrigin
  items: ItemFormState[]
  orderTotal: string
  shippingValue: string
}

const EMPTY_ITEM: ItemFormState = { product: '', category: 'Redes', qty: '' }

const EMPTY_FORM: LeadFormState = {
  name: '', whatsapp: '', city: '', state: 'SC', origin: 'Desconhecido',
  items: [{ ...EMPTY_ITEM }],
  orderTotal: '',
  shippingValue: '',
}

const ORIGIN_OPTIONS: LeadOrigin[] = ['Google','Instagram','Facebook','WhatsApp','Indicação','Cliente Recorrente','Desconhecido']

interface ListProps {
  leads: Lead[]
  onSelect: (l: Lead) => void
  onDelete: (l: Lead) => void
  onChangeStage: (id: string, stage: LeadStage) => void
}

function ClientList({ leads, onSelect, onDelete, onChangeStage }: ListProps) {
  const [q, setQ] = useState('')
  const [stateFilter, setStateFilter] = useState<BrazilState | 'all'>('all')
  const [catFilter, setCatFilter] = useState<ProductCategory | 'all'>('all')

  const filtered = useMemo(() => leads.filter(l => {
    if (stateFilter !== 'all' && l.state !== stateFilter) return false
    // Multi-categoria: lead casa se QUALQUER item dele tem a categoria escolhida
    if (catFilter !== 'all' && !l.items.some(it => it.category === catFilter)) return false
    if (q) {
      const needle = q.toLowerCase()
      const inName = l.name.toLowerCase().includes(needle)
      const inProduct = l.items.some(it => it.product.toLowerCase().includes(needle))
      if (!inName && !inProduct) return false
    }
    return true
  }), [leads, q, stateFilter, catFilter])

  return (
    <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Manrope','Rubik',sans-serif", fontWeight: 700, fontSize: 12, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Clientes & Leads <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>({filtered.length})</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => exportToCsv(`leads_${todayStamp()}.csv`, filtered, [
              { key: 'name',          label: 'Nome' },
              { key: 'whatsapp',      label: 'WhatsApp' },
              { key: 'city',          label: 'Cidade' },
              { key: 'state',         label: 'Estado' },
              { key: 'category',      label: 'Categoria principal', format: l => l.items[0]?.category ?? l.category },
              { key: 'product',       label: 'Produtos', format: l => l.items.map(i => `${i.product} (${i.qty})`).join(' · ') || l.product },
              { key: 'orderTotal',    label: 'Valor pedido (R$)' },
              { key: 'shippingValue', label: 'Frete (R$)' },
              { key: 'estimatedValue',label: 'Total geral (R$)' },
              { key: 'origin',        label: 'Origem' },
              { key: 'stage',         label: 'Estágio' },
              { key: 'createdByName', label: 'Cadastrado por', format: l => l.createdByName ?? '' },
              { key: 'createdAt',     label: 'Data do cadastro', format: l => l.createdAt ? new Date(l.createdAt).toLocaleDateString('pt-BR') : '' },
              { key: 'lastContactAt', label: 'Último contato', format: l => new Date(l.lastContactAt).toLocaleDateString('pt-BR') },
            ])}
            disabled={filtered.length === 0}
            title="Exportar CSV dos leads visíveis"
          >
            ⬇ CSV
          </button>
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
        {filtered.map(l => {
          const productSummary = l.items.length > 1
            ? `${l.items[0].product} +${l.items.length - 1}`
            : (l.items[0]?.product ?? l.product ?? '—')
          return (
            <div
              key={l.id}
              style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--border)' }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(l)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(l) } }}
                style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', padding: '12px 18px', cursor: 'pointer', color: 'var(--text)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,163,90,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                  <strong style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.name}
                    {l.recurring && <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--gold)', fontWeight: 600 }}>★ Recorrente</span>}
                  </strong>
                  <StageBadgeSelect value={l.stage} onChange={s => onChangeStage(l.id, s)} leadName={l.name} variant="longLabel" />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.city}/{l.state} · {productSummary} · {fmtBRL(l.estimatedValue)}
                </div>
                {l.createdByName && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
                    Cadastrado por <strong style={{ color: 'var(--text-muted)' }}>{l.createdByName}</strong>
                    {l.createdAt && ` · ${new Date(l.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Excluir o lead "${l.name}"?\n\nEssa ação remove o lead e todas as suas interações. Não pode ser desfeita.`)) {
                    onDelete(l)
                  }
                }}
                aria-label={`Excluir lead ${l.name}`}
                title="Excluir lead"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderLeft: '1px solid var(--border)',
                  color: 'var(--trust-red)',
                  cursor: 'pointer',
                  padding: '0 14px',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                🗑️
              </button>
            </div>
          )
        })}
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

  const updateItem = (idx: number, patch: Partial<ItemFormState>) =>
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }))

  const addItem = () =>
    setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))

  const removeItem = (idx: number) =>
    setForm(f => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== idx) : f.items }))

  const orderTotal = parseFloat(form.orderTotal || '0') || 0
  const frete = parseFloat(form.shippingValue || '0') || 0
  const totalGeral = orderTotal + frete

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.whatsapp.trim()) return

    const items: LeadItem[] = form.items
      .map(it => ({
        product: it.product.trim(),
        category: it.category,
        qty: parseInt(it.qty || '0') || 0,
      }))
      .filter(it => it.product.length > 0)

    if (items.length === 0) {
      alert('Adicione pelo menos 1 produto.')
      return
    }

    const newLead: Lead = {
      id: `l${Date.now()}`,
      name: form.name.trim(),
      whatsapp: form.whatsapp.trim(),
      city: form.city.trim(),
      state: form.state,
      items,
      orderTotal,
      shippingValue: frete,
      // Campos derivados
      product: items.map(i => i.product).join(' · '),
      category: items[0].category,
      estimatedQty: items.reduce((s, it) => s + it.qty, 0),
      estimatedValue: totalGeral,
      origin: form.origin,
      stage: 'novo',
      lastContactAt: new Date().toISOString(),
      nextFollowUpAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      recurring: form.origin === 'Cliente Recorrente',
    }
    onCreate(newLead)
    setForm(EMPTY_FORM)
  }

  return (
    <form onSubmit={handleSubmit} className="glass lead-form" style={{ padding: 20 }}>
      <div style={{ fontFamily: "'Manrope','Rubik',sans-serif", fontWeight: 700, fontSize: 12, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
        + Novo Lead
      </div>

      {/* Dados básicos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: 12, marginBottom: 18 }}>
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
          <label htmlFor="lf-origin">Origem</label>
          <select id="lf-origin" value={form.origin} onChange={e => update('origin', e.target.value as LeadOrigin)}>
            {ORIGIN_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Produtos do pedido (lista dinâmica) */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Produtos do pedido
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {form.items.length} {form.items.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {form.items.map((item, idx) => (
            <div
              key={idx}
              className="lead-item-row"
            >
              <div className="field">
                <label htmlFor={`lf-prod-${idx}`}>Produto {idx + 1}</label>
                <input
                  id={`lf-prod-${idx}`}
                  value={item.product}
                  onChange={e => updateItem(idx, { product: e.target.value })}
                  placeholder="Ex: Rede Multifilamento 70mm"
                />
              </div>
              <div className="field">
                <label htmlFor={`lf-cat-${idx}`}>Categoria</label>
                <select
                  id={`lf-cat-${idx}`}
                  value={item.category}
                  onChange={e => updateItem(idx, { category: e.target.value as ProductCategory })}
                >
                  {(['Redes','Linhas','Tralhas','Cordas','Boias'] as ProductCategory[]).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`lf-qty-${idx}`}>Qtd</label>
                <input
                  id={`lf-qty-${idx}`}
                  type="number"
                  min={0}
                  value={item.qty}
                  onChange={e => updateItem(idx, { qty: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                disabled={form.items.length <= 1}
                aria-label={`Remover produto ${idx + 1}`}
                title="Remover este produto"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--trust-red)',
                  cursor: form.items.length <= 1 ? 'not-allowed' : 'pointer',
                  opacity: form.items.length <= 1 ? 0.35 : 1,
                  width: 36,
                  height: 36,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'flex-end',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addItem} className="btn-secondary" style={{ marginTop: 10 }}>
          + Adicionar produto
        </button>
      </div>

      {/* Valor do pedido + Frete + Total */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))',
        gap: 12,
        padding: 14,
        background: 'rgba(200,165,92,0.06)',
        border: '1px solid var(--glass-border)',
        borderRadius: 12,
        marginBottom: 14,
      }}>
        <div className="field">
          <label htmlFor="lf-order-total">Valor do pedido (R$)</label>
          <input
            id="lf-order-total"
            type="number"
            min={0}
            step="0.01"
            value={form.orderTotal}
            onChange={e => update('orderTotal', e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div className="field">
          <label htmlFor="lf-frete">Valor do frete (R$)</label>
          <input
            id="lf-frete"
            type="number"
            min={0}
            step="0.01"
            value={form.shippingValue}
            onChange={e => update('shippingValue', e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div>
          <div className="font-display" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Total geral</div>
          <div className="font-display tabular" style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{fmtBRL(totalGeral)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>pedido + frete</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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

  // Leads agrupados por origem (derivado dos leads reais)
  const leadsBySource = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of leads) map.set(l.origin, (map.get(l.origin) ?? 0) + 1)
    return Array.from(map.entries())
      .map(([source, leads]) => ({ source, leads }))
      .sort((a, b) => b.leads - a.leads)
  }, [leads])

  // Taxa de fechamento por categoria — itera todos os items dos leads
  // (um lead com 3 produtos de 3 categorias diferentes conta em cada uma)
  const closeRateByCategory = useMemo(() => {
    const map = new Map<string, { total: number; fechados: number }>()
    for (const l of leads) {
      const seen = new Set<string>()
      for (const it of l.items) {
        if (seen.has(it.category)) continue  // não conta categoria duplicada no mesmo lead
        seen.add(it.category)
        const cur = map.get(it.category) ?? { total: 0, fechados: 0 }
        cur.total += 1
        if (l.stage === 'fechado') cur.fechados += 1
        map.set(it.category, cur)
      }
    }
    return Array.from(map.entries())
      .map(([categoria, { total, fechados }]) => ({ categoria, taxa: total > 0 ? Math.round((fechados / total) * 100) : 0 }))
      .sort((a, b) => b.taxa - a.taxa)
  }, [leads])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
      {/* KPIs em linha */}
      <div className="glass glass-hover" style={{ padding: '20px 22px' }}>
        <div className="font-display" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pipeline aberto</div>
        <div className="font-display tabular" style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{fmtBRL(totalPipeline)}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>{leads.filter(l => l.stage !== 'perdido' && l.stage !== 'fechado').length} leads ativos</div>
      </div>
      <div className="glass glass-hover" style={{ padding: '20px 22px', borderColor: openOverdue.length > 0 ? 'rgba(216,86,86,0.4)' : undefined }}>
        <div className="font-display" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span aria-hidden="true">⚠</span> Sem contato {'>'}3 dias
        </div>
        <div className="font-display tabular" style={{ fontSize: 28, fontWeight: 700, color: openOverdue.length > 0 ? 'var(--trust-red)' : 'var(--trust-green)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{fmtNum(openOverdue.length)}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>requer follow-up urgente</div>
      </div>
      <div className="glass glass-hover" style={{ padding: '20px 22px' }}>
        <div className="font-display" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total de leads</div>
        <div className="font-display tabular" style={{ fontSize: 28, fontWeight: 700, color: 'var(--trust-blue)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{fmtNum(leads.length)}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>{leads.filter(l => l.recurring).length} recorrentes</div>
      </div>

      {/* Bar chart de origens */}
      {leadsBySource.length > 0 && (
        <div className="glass" style={{ padding: 20, gridColumn: '1 / -1' }}>
          <div style={{ fontFamily: "'Manrope','Rubik',sans-serif", fontWeight: 700, fontSize: 12, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
            Leads por Fonte
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={leadsBySource} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
              <defs>
                <linearGradient id="barBlue" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2e5fcd" stopOpacity={0.85}/>
                  <stop offset="100%" stopColor="#4d8af5" stopOpacity={0.95}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="source" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Manrope', fontWeight: 500 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip
                cursor={{ fill: 'rgba(77,138,245,0.08)' }}
                contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--gold)', borderRadius: 10, fontSize: 12, boxShadow: 'var(--shadow-lg)' }}
              />
              <Bar dataKey="leads" fill="url(#barBlue)" radius={[0, 8, 8, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Close rate por categoria */}
      {closeRateByCategory.length > 0 && (
        <div className="glass" style={{ padding: 20, gridColumn: '1 / -1' }}>
          <div style={{ fontFamily: "'Manrope','Rubik',sans-serif", fontWeight: 700, fontSize: 12, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
            Taxa de Fechamento por Categoria
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={closeRateByCategory} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5fb85a" stopOpacity={0.95}/>
                  <stop offset="100%" stopColor="#3f8a3a" stopOpacity={0.85}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="categoria" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Manrope' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={42} unit="%" />
              <Tooltip cursor={{ fill: 'rgba(95,184,90,0.08)' }} contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--gold)', borderRadius: 10, fontSize: 12, boxShadow: 'var(--shadow-lg)' }} formatter={(v) => `${v}%`} />
              <Bar dataKey="taxa" fill="url(#barGreen)" radius={[8, 8, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default function CrmPage() {
  const { leads, interactions, loading, error, source, createLead, moveLeadStage, addInteraction, deleteLead } = useCrm()
  const [selected, setSelected] = useState<Lead | null>(null)

  // Pick a default selected lead once data lands
  const effectiveSelected = selected ?? leads[0] ?? null

  const handleCreate = (lead: Lead) => {
    // Drop the locally-generated id; Supabase assigns its own UUID
    const { id, ...payload } = lead
    void id
    void createLead(payload)
  }

  const handleDelete = (lead: Lead) => {
    if (selected?.id === lead.id) setSelected(null)
    void deleteLead(lead.id)
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
        <span className={`badge ${source === 'supabase' ? 'badge-green' : 'badge-red'}`}>
          {source === 'supabase' ? '🟢 Supabase conectado' : '🔴 Sem conexão com o banco'}
        </span>
        {error && <span style={{ color: 'var(--trust-red)' }}>· {error}</span>}
      </div>

      {/* Empty state quando não há leads */}
      {leads.length === 0 && source === 'supabase' && (
        <div className="glass" style={{ padding: '60px 24px', textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">👥</div>
          <div style={{ fontFamily: "'Rubik', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
            Nenhum lead cadastrado ainda
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto' }}>
            Use o formulário <strong>"+ Novo Lead"</strong> abaixo para começar a cadastrar clientes. O kanban e os gráficos serão preenchidos automaticamente.
          </div>
        </div>
      )}

      <MiniDashboard leads={leads} />

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Manrope','Rubik',sans-serif", fontWeight: 700, fontSize: 12, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
          Pipeline de Vendas
        </div>
        <Kanban leads={leads} onMove={(id, to) => void moveLeadStage(id, to)} onSelect={setSelected} selectedId={effectiveSelected?.id} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 20 }}>
        <ClientList leads={leads} onSelect={setSelected} onDelete={handleDelete} onChangeStage={(id, stage) => void moveLeadStage(id, stage)} />
        <InteractionTimeline lead={effectiveSelected} interactions={interactions} onAdd={(i) => void addInteraction(i)} />
      </div>

      <NewLeadForm onCreate={handleCreate} />
    </div>
  )
}
