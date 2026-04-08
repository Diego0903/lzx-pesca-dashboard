import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { fmtBRL } from '../utils/formatters'
import type { LeadItem, ProductCategory, BrazilState, LeadOrigin } from '../data/mockCrm'

interface ItemRow {
  product: string
  category: ProductCategory
  qty: string
}

const EMPTY_ITEM: ItemRow = { product: '', category: 'Redes', qty: '' }
const ORIGIN_OPTIONS: LeadOrigin[] = ['Google','Instagram','Facebook','WhatsApp','Indicação','Cliente Recorrente','Desconhecido']
const STATE_OPTIONS: BrazilState[] = ['SC','RS','PR','SP','RJ','MG','BA','PA','CE','Outros']
const CAT_OPTIONS: ProductCategory[] = ['Redes','Linhas','Tralhas','Cordas','Boias']

export default function CadastrarClientePage() {
  const { usuario, signOut } = useAuth()
  const [form, setForm] = useState({
    nome: '', whatsapp: '', city: '', state: 'SC' as BrazilState, origin: 'Desconhecido' as LeadOrigin,
    items: [{ ...EMPTY_ITEM }] as ItemRow[],
    orderTotal: '', shippingValue: '',
  })
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const orderTotal = parseFloat(form.orderTotal || '0') || 0
  const frete = parseFloat(form.shippingValue || '0') || 0
  const totalGeral = orderTotal + frete

  const updateItem = (idx: number, patch: Partial<ItemRow>) =>
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }))
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))
  const removeItem = (idx: number) => setForm(f => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== idx) : f.items }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.nome.trim() || !form.whatsapp.trim()) {
      setError('Preencha nome e WhatsApp.')
      return
    }
    const items: LeadItem[] = form.items
      .map(it => ({ product: it.product.trim(), category: it.category, qty: parseInt(it.qty || '0') || 0 }))
      .filter(it => it.product.length > 0)
    if (items.length === 0) {
      setError('Adicione pelo menos 1 produto.')
      return
    }
    if (!supabase) {
      setError('Sem conexão com o banco.')
      return
    }

    setBusy(true)
    const { error: err } = await supabase.from('leads').insert({
      name: form.nome.trim(),
      whatsapp: form.whatsapp.trim(),
      city: form.city.trim(),
      state: form.state,
      items,
      order_total: orderTotal,
      shipping_value: frete,
      product: items.map(i => i.product).join(' · '),
      category: items[0].category,
      estimated_qty: items.reduce((s, it) => s + it.qty, 0),
      estimated_value: totalGeral,
      origin: form.origin,
      stage: 'novo',
      last_contact_at: new Date().toISOString(),
      next_follow_up_at: new Date(Date.now() + 2 * 86400000).toISOString(),
      recurring: form.origin === 'Cliente Recorrente',
      created_by: usuario?.id ?? null,
    })
    setBusy(false)

    if (err) {
      setError('Erro ao cadastrar: ' + err.message)
      return
    }
    setSuccess(true)
    setForm({
      nome: '', whatsapp: '', city: '', state: 'SC', origin: 'Desconhecido',
      items: [{ ...EMPTY_ITEM }], orderTotal: '', shippingValue: '',
    })
    setTimeout(() => setSuccess(false), 3500)
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
      {/* Mini header */}
      <div className="glass-strong" style={{
        padding: '12px 18px', borderRadius: 14, marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.webp" alt="LZX" style={{ height: 30 }} />
          <div>
            <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              LZX Pesca · Cadastro
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {usuario?.nome ?? '—'}
            </div>
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={signOut}>
          Sair
        </button>
      </div>

      <div className="glass lead-form fade-in" style={{ padding: 24, maxWidth: 720, width: '100%', margin: '0 auto', flex: 1 }}>
        <div className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Cadastrar novo cliente
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 22 }}>
          Preencha os dados do cliente e do pedido. Os campos marcados são obrigatórios.
        </div>

        <form onSubmit={handleSubmit}>
          {/* Dados básicos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: 12, marginBottom: 18 }}>
            <div className="field">
              <label htmlFor="cc-nome">Nome do cliente *</label>
              <input id="cc-nome" required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Cliente ou empresa" />
            </div>
            <div className="field">
              <label htmlFor="cc-wa">WhatsApp *</label>
              <input id="cc-wa" required value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <div className="field">
              <label htmlFor="cc-city">Cidade</label>
              <input id="cc-city" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="cc-state">Estado</label>
              <select id="cc-state" value={form.state} onChange={e => setForm({ ...form, state: e.target.value as BrazilState })}>
                {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cc-origin">Origem</label>
              <select id="cc-origin" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value as LeadOrigin })}>
                {ORIGIN_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Itens */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="font-display" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Produtos do pedido
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{form.items.length} {form.items.length === 1 ? 'item' : 'itens'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {form.items.map((item, idx) => (
                <div key={idx} className="lead-item-row">
                  <div className="field">
                    <label htmlFor={`cc-prod-${idx}`}>Produto {idx + 1}</label>
                    <input id={`cc-prod-${idx}`} value={item.product} onChange={e => updateItem(idx, { product: e.target.value })} placeholder="Ex: Rede 70mm" />
                  </div>
                  <div className="field">
                    <label htmlFor={`cc-cat-${idx}`}>Categoria</label>
                    <select id={`cc-cat-${idx}`} value={item.category} onChange={e => updateItem(idx, { category: e.target.value as ProductCategory })}>
                      {CAT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={`cc-qty-${idx}`}>Qtd</label>
                    <input id={`cc-qty-${idx}`} type="number" min={0} value={item.qty} onChange={e => updateItem(idx, { qty: e.target.value })} />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={form.items.length <= 1}
                    aria-label={`Remover produto ${idx + 1}`}
                    style={{
                      background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
                      color: 'var(--trust-red)',
                      cursor: form.items.length <= 1 ? 'not-allowed' : 'pointer',
                      opacity: form.items.length <= 1 ? 0.35 : 1,
                      width: 36, height: 36, fontSize: 14, alignSelf: 'flex-end',
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="btn-secondary" style={{ marginTop: 10 }}>
              + Adicionar produto
            </button>
          </div>

          {/* Totais */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: 12,
            padding: 14, background: 'rgba(200,165,92,0.06)', border: '1px solid var(--glass-border)', borderRadius: 12, marginBottom: 16,
          }}>
            <div className="field">
              <label htmlFor="cc-order">Valor do pedido (R$)</label>
              <input id="cc-order" type="number" min={0} step="0.01" value={form.orderTotal} onChange={e => setForm({ ...form, orderTotal: e.target.value })} placeholder="0,00" />
            </div>
            <div className="field">
              <label htmlFor="cc-frete">Valor do frete (R$)</label>
              <input id="cc-frete" type="number" min={0} step="0.01" value={form.shippingValue} onChange={e => setForm({ ...form, shippingValue: e.target.value })} placeholder="0,00" />
            </div>
            <div>
              <div className="font-display" style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>Total geral</div>
              <div className="font-display tabular" style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{fmtBRL(totalGeral)}</div>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(216,86,86,0.1)', border: '1px solid rgba(216,86,86,0.3)', borderRadius: 10, padding: 12, fontSize: 12, color: 'var(--trust-red)', marginBottom: 14, lineHeight: 1.5 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(95,184,90,0.1)', border: '1px solid rgba(95,184,90,0.3)', borderRadius: 10, padding: 12, fontSize: 12, color: 'var(--trust-green)', marginBottom: 14, fontWeight: 600 }}>
              ✅ Cliente cadastrado com sucesso!
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Salvando...' : 'Cadastrar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
