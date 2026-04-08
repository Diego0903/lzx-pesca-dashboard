import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Lead, LeadItem, Interaction, Order, LeadStage, ProductCategory } from '../data/mockCrm'

// ── Row shapes que vêm do Supabase (snake_case) ────────────────
interface LeadRow {
  id: string
  name: string
  whatsapp: string | null
  city: string | null
  state: string | null
  product: string | null
  category: string | null
  estimated_qty: number | null
  estimated_value: number | null
  order_total: number | null
  items: Array<{ product?: string; category?: string; qty?: number }> | null
  shipping_value: number | null
  origin: string | null
  stage: string | null
  last_contact_at: string | null
  next_follow_up_at: string | null
  recurring: boolean | null
  notes: string | null
  created_by: string | null
  created_at: string | null
  creator?: { nome: string } | null
}

interface InteractionRow {
  id: string
  lead_id: string
  type: string
  occurred_at: string
  note: string | null
}

interface OrderRow {
  id: string
  lead_id: string | null
  client: string
  product: string
  category: string | null
  state: string | null
  value: number
  status: string
  ordered_at: string
}

// ── Mappers row → app type ─────────────────────────────────────
const mapLead = (r: LeadRow): Lead => {
  // Items vem do JSONB; se o registro for legacy (sem items), tenta reconstruir
  // a partir dos campos antigos product/category/estimated_qty
  const rawItems = Array.isArray(r.items) ? r.items : []
  const items: LeadItem[] = rawItems.length > 0
    ? rawItems.map(it => ({
        product: String(it.product ?? ''),
        category: (it.category as ProductCategory) ?? 'Redes',
        qty: Number(it.qty ?? 0),
      }))
    : (r.product
        ? [{
            product: r.product,
            category: (r.category as ProductCategory) ?? 'Redes',
            qty: r.estimated_qty ?? 0,
          }]
        : [])

  const shippingValue = Number(r.shipping_value ?? 0)
  // order_total é o valor do pedido sem frete; se não existir (registro antigo),
  // tenta deduzir de estimated_value - shipping_value
  const orderTotal = r.order_total != null
    ? Number(r.order_total)
    : Math.max(0, Number(r.estimated_value ?? 0) - shippingValue)

  return {
    id: r.id,
    name: r.name,
    whatsapp: r.whatsapp ?? '',
    city: r.city ?? '',
    state: (r.state as Lead['state']) ?? 'Outros',
    items,
    orderTotal,
    shippingValue,
    // Campos derivados (mantidos para retro-compat com kanban/lista)
    product: items.map(i => i.product).filter(Boolean).join(' · ') || (r.product ?? ''),
    category: items[0]?.category ?? (r.category as Lead['category']) ?? 'Redes',
    estimatedQty: items.reduce((s, it) => s + it.qty, 0) || (r.estimated_qty ?? 0),
    estimatedValue: orderTotal + shippingValue,
    origin: (r.origin as Lead['origin']) ?? 'Desconhecido',
    stage: (r.stage as LeadStage) ?? 'novo',
    lastContactAt: r.last_contact_at ?? new Date().toISOString(),
    nextFollowUpAt: r.next_follow_up_at ?? undefined,
    recurring: Boolean(r.recurring),
    createdBy: r.created_by ?? undefined,
    createdByName: r.creator?.nome ?? undefined,
    createdAt: r.created_at ?? undefined,
  }
}

const mapInteraction = (r: InteractionRow): Interaction => ({
  id: r.id,
  leadId: r.lead_id,
  type: r.type as Interaction['type'],
  date: r.occurred_at,
  note: r.note ?? '',
})

const mapOrder = (r: OrderRow): Order => ({
  id: r.id,
  client: r.client,
  product: r.product,
  category: (r.category as Order['category']) ?? 'Redes',
  state: (r.state as Order['state']) ?? 'Outros',
  value: Number(r.value),
  status: r.status as Order['status'],
  date: r.ordered_at,
})

// ── Hook principal ─────────────────────────────────────────────
export interface UseCrmResult {
  leads: Lead[]
  interactions: Interaction[]
  orders: Order[]
  loading: boolean
  error: string | null
  source: 'supabase' | 'offline'
  reload: () => Promise<void>
  createLead: (lead: Omit<Lead, 'id'>) => Promise<void>
  moveLeadStage: (leadId: string, stage: LeadStage) => Promise<void>
  addInteraction: (i: Omit<Interaction, 'id'>) => Promise<void>
  deleteLead: (leadId: string) => Promise<void>
}

export function useCrm(): UseCrmResult {
  const [leads, setLeads] = useState<Lead[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'supabase' | 'offline'>('offline')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    if (!supabase) {
      setLeads([]); setInteractions([]); setOrders([])
      setSource('offline')
      setError('Supabase não configurado')
      setLoading(false)
      return
    }
    try {
      const [leadsRes, intRes, ordRes] = await Promise.all([
        // Embed do criador via FK created_by → usuarios.id (para mostrar "cadastrado por X")
        supabase.from('leads').select('*, creator:usuarios!leads_created_by_fkey(nome)').order('last_contact_at', { ascending: false }),
        supabase.from('interactions').select('*').order('occurred_at', { ascending: false }),
        supabase.from('orders').select('*').order('ordered_at', { ascending: false }),
      ])
      if (leadsRes.error) throw leadsRes.error
      if (intRes.error)   throw intRes.error
      if (ordRes.error)   throw ordRes.error

      setLeads((leadsRes.data ?? []).map(mapLead))
      setInteractions((intRes.data ?? []).map(mapInteraction))
      setOrders((ordRes.data ?? []).map(mapOrder))
      setSource('supabase')
    } catch (e) {
      console.warn('[useCrm] Supabase fetch failed:', e)
      setLeads([]); setInteractions([]); setOrders([])
      setSource('offline')
      setError(e instanceof Error ? e.message : 'Falha ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createLead: UseCrmResult['createLead'] = useCallback(async (lead) => {
    if (!supabase) {
      // optimistic local-only when Supabase is unavailable
      const local: Lead = { ...lead, id: `local-${Date.now()}` }
      setLeads(prev => [local, ...prev])
      return
    }
    const totalGeral = lead.orderTotal + lead.shippingValue
    // Pega o user atual pra preencher created_by automaticamente
    const { data: userData } = await supabase.auth.getUser()
    const currentUserId = userData?.user?.id ?? null

    const { data, error: err } = await supabase.from('leads').insert({
      name: lead.name,
      whatsapp: lead.whatsapp,
      city: lead.city,
      state: lead.state,
      // Multi-item structure (sem valor por item)
      items: lead.items,
      order_total: lead.orderTotal,
      shipping_value: lead.shippingValue,
      // Legacy mirror for retro-compat / first item
      product: lead.items.map(i => i.product).filter(Boolean).join(' · ') || lead.product,
      category: lead.items[0]?.category ?? lead.category,
      estimated_qty: lead.items.reduce((s, it) => s + it.qty, 0),
      estimated_value: totalGeral,
      origin: lead.origin,
      stage: lead.stage,
      last_contact_at: lead.lastContactAt,
      next_follow_up_at: lead.nextFollowUpAt ?? null,
      recurring: lead.recurring,
      created_by: currentUserId,
    }).select('*, creator:usuarios!leads_created_by_fkey(nome)').single()
    if (err) throw err
    if (data) setLeads(prev => [mapLead(data as LeadRow), ...prev])
  }, [])

  const deleteLead: UseCrmResult['deleteLead'] = useCallback(async (leadId) => {
    // Optimistic remove from UI
    setLeads(prev => prev.filter(l => l.id !== leadId))
    setInteractions(prev => prev.filter(i => i.leadId !== leadId))
    if (!supabase) return
    // ON DELETE CASCADE no schema apaga as interactions automaticamente.
    // Orders.lead_id usa ON DELETE SET NULL — pedidos ficam órfãos por design.
    const { error: err } = await supabase.from('leads').delete().eq('id', leadId)
    if (err) {
      console.warn('[useCrm] deleteLead error', err)
      throw err
    }
  }, [])

  const moveLeadStage: UseCrmResult['moveLeadStage'] = useCallback(async (leadId, stage) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage, lastContactAt: new Date().toISOString() } : l))
    if (!supabase) return
    const { error: err } = await supabase
      .from('leads')
      .update({ stage, last_contact_at: new Date().toISOString() })
      .eq('id', leadId)
    if (err) console.warn('[useCrm] moveLeadStage error', err)
  }, [])

  const addInteraction: UseCrmResult['addInteraction'] = useCallback(async (i) => {
    if (!supabase) {
      const local: Interaction = { ...i, id: `local-${Date.now()}` }
      setInteractions(prev => [local, ...prev])
      setLeads(prev => prev.map(l => l.id === i.leadId ? { ...l, lastContactAt: i.date } : l))
      return
    }
    const { data, error: err } = await supabase.from('interactions').insert({
      lead_id: i.leadId,
      type: i.type,
      occurred_at: i.date,
      note: i.note,
    }).select().single()
    if (err) throw err
    if (data) {
      setInteractions(prev => [mapInteraction(data as InteractionRow), ...prev])
      // update lead's last contact
      await supabase.from('leads').update({ last_contact_at: i.date }).eq('id', i.leadId)
      setLeads(prev => prev.map(l => l.id === i.leadId ? { ...l, lastContactAt: i.date } : l))
    }
  }, [])

  return {
    leads, interactions, orders, loading, error, source,
    reload: load, createLead, moveLeadStage, addInteraction, deleteLead,
  }
}
