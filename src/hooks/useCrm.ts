import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Lead, LeadItem, Interaction, LeadStage, ProductCategory } from '../data/mockCrm'

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

// ── Hook principal ─────────────────────────────────────────────
export interface UseCrmResult {
  leads: Lead[]
  interactions: Interaction[]
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'supabase' | 'offline'>('offline')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    if (!supabase) {
      setLeads([]); setInteractions([])
      setSource('offline')
      setError('Supabase não configurado')
      setLoading(false)
      return
    }
    const sb = supabase
    try {
      // Não usamos embed PostgREST (creator:usuarios!fk) aqui por causa de
      // travamentos misteriosos no schema cache — fazemos o join em JS abaixo.
      const [leadsRes, intRes] = await Promise.all([
        sb.from('leads').select('*').order('last_contact_at', { ascending: false }),
        sb.from('interactions').select('*').order('occurred_at', { ascending: false }),
      ])
      if (leadsRes.error) throw leadsRes.error
      if (intRes.error)   throw intRes.error

      // Resolve nomes dos criadores em uma query batch (.in)
      const creatorIds = Array.from(new Set(
        (leadsRes.data ?? [])
          .map(l => l.created_by)
          .filter((x): x is string => !!x)
      ))
      const creatorMap = new Map<string, string>()
      if (creatorIds.length > 0) {
        const { data: creatorRows, error: cErr } = await sb
          .from('usuarios')
          .select('id, nome')
          .in('id', creatorIds)
        if (!cErr && creatorRows) {
          for (const r of creatorRows as Array<{ id: string; nome: string }>) {
            creatorMap.set(r.id, r.nome)
          }
        }
      }

      const leadsWithCreator = (leadsRes.data ?? []).map(l => ({
        ...l,
        creator: l.created_by ? { nome: creatorMap.get(l.created_by) ?? '' } : null,
      }))

      setLeads(leadsWithCreator.map(mapLead))
      setInteractions((intRes.data ?? []).map(mapInteraction))
      setSource('supabase')
    } catch (e) {
      console.warn('[useCrm] Supabase fetch failed:', e)
      setLeads([]); setInteractions([])
      setSource('offline')
      setError(e instanceof Error ? e.message : 'Falha ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  // Mantém a referência atual do `load` num ref pra permitir que o efeito de
  // realtime tenha deps `[]` — assim o canal é criado uma única vez por hook,
  // sem teardown/recreate a cada re-render.
  const loadRef = useRef(load)
  useEffect(() => { loadRef.current = load }, [load])

  useEffect(() => { load() }, [load])

  // Sincronização em tempo real entre clientes.
  // Tenta Realtime primeiro; se falhar (ex: publication não habilitada no Postgres),
  // faz fallback automático pra polling de 30 segundos. Assim a sincronização
  // funciona mesmo se a migration 007_enable_realtime.sql não tiver sido aplicada.
  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let pollingInterval: ReturnType<typeof setInterval> | null = null

    const debouncedReload = () => {
      if (debounceTimer) return
      debounceTimer = setTimeout(() => { debounceTimer = null; loadRef.current() }, 250)
    }

    const startPollingFallback = () => {
      if (pollingInterval) return
      console.warn('[useCrm] Realtime indisponível — usando polling 30s')
      pollingInterval = setInterval(() => loadRef.current(), 30000)
    }

    const channel = sb
      .channel('crm-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' },        debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interactions' }, debouncedReload)
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          startPollingFallback()
        }
      })

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      if (pollingInterval) clearInterval(pollingInterval)
      sb.removeChannel(channel)
    }
  }, [])

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
    }).select('*').single()
    if (err) throw err
    if (data) {
      // Resolve nome do criador localmente (em vez de embed PostgREST)
      let creatorName: string | undefined
      if (currentUserId) {
        const { data: u } = await supabase.from('usuarios').select('nome').eq('id', currentUserId).maybeSingle()
        creatorName = u?.nome ?? undefined
      }
      const enriched: LeadRow = {
        ...(data as LeadRow),
        creator: creatorName ? { nome: creatorName } : null,
      }
      setLeads(prev => [mapLead(enriched), ...prev])
    }
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
    leads, interactions, loading, error, source,
    reload: load, createLead, moveLeadStage, addInteraction, deleteLead,
  }
}
