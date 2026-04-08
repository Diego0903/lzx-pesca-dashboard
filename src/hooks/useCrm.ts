import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  mockLeads, mockInteractions, mockOrders,
  type Lead, type Interaction, type Order, type LeadStage,
} from '../data/mockCrm'

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
  origin: string | null
  stage: string | null
  last_contact_at: string | null
  next_follow_up_at: string | null
  recurring: boolean | null
  notes: string | null
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
const mapLead = (r: LeadRow): Lead => ({
  id: r.id,
  name: r.name,
  whatsapp: r.whatsapp ?? '',
  city: r.city ?? '',
  state: (r.state as Lead['state']) ?? 'Outros',
  product: r.product ?? '',
  category: (r.category as Lead['category']) ?? 'Redes',
  estimatedQty: r.estimated_qty ?? 0,
  estimatedValue: Number(r.estimated_value ?? 0),
  origin: (r.origin as Lead['origin']) ?? 'Google',
  stage: (r.stage as LeadStage) ?? 'novo',
  lastContactAt: r.last_contact_at ?? new Date().toISOString(),
  nextFollowUpAt: r.next_follow_up_at ?? undefined,
  recurring: Boolean(r.recurring),
})

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
  source: 'supabase' | 'mock'
  reload: () => Promise<void>
  createLead: (lead: Omit<Lead, 'id'>) => Promise<void>
  moveLeadStage: (leadId: string, stage: LeadStage) => Promise<void>
  addInteraction: (i: Omit<Interaction, 'id'>) => Promise<void>
}

export function useCrm(): UseCrmResult {
  const [leads, setLeads] = useState<Lead[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'supabase' | 'mock'>('mock')

  const fallbackToMock = useCallback((reason?: string) => {
    setLeads(mockLeads)
    setInteractions(mockInteractions)
    setOrders(mockOrders)
    setSource('mock')
    if (reason) setError(reason)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    if (!supabase) {
      fallbackToMock()
      setLoading(false)
      return
    }
    try {
      const [leadsRes, intRes, ordRes] = await Promise.all([
        supabase.from('leads').select('*').order('last_contact_at', { ascending: false }),
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
      console.warn('[useCrm] Supabase fetch failed — using mock data:', e)
      fallbackToMock(e instanceof Error ? e.message : 'Falha ao carregar Supabase')
    } finally {
      setLoading(false)
    }
  }, [fallbackToMock])

  useEffect(() => { load() }, [load])

  const createLead: UseCrmResult['createLead'] = useCallback(async (lead) => {
    if (!supabase || source === 'mock') {
      // optimistic local-only
      const local: Lead = { ...lead, id: `local-${Date.now()}` }
      setLeads(prev => [local, ...prev])
      return
    }
    const { data, error: err } = await supabase.from('leads').insert({
      name: lead.name,
      whatsapp: lead.whatsapp,
      city: lead.city,
      state: lead.state,
      product: lead.product,
      category: lead.category,
      estimated_qty: lead.estimatedQty,
      estimated_value: lead.estimatedValue,
      origin: lead.origin,
      stage: lead.stage,
      last_contact_at: lead.lastContactAt,
      next_follow_up_at: lead.nextFollowUpAt ?? null,
      recurring: lead.recurring,
    }).select().single()
    if (err) throw err
    if (data) setLeads(prev => [mapLead(data as LeadRow), ...prev])
  }, [source])

  const moveLeadStage: UseCrmResult['moveLeadStage'] = useCallback(async (leadId, stage) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage, lastContactAt: new Date().toISOString() } : l))
    if (!supabase || source === 'mock') return
    const { error: err } = await supabase
      .from('leads')
      .update({ stage, last_contact_at: new Date().toISOString() })
      .eq('id', leadId)
    if (err) console.warn('[useCrm] moveLeadStage error', err)
  }, [source])

  const addInteraction: UseCrmResult['addInteraction'] = useCallback(async (i) => {
    if (!supabase || source === 'mock') {
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
  }, [source])

  return {
    leads, interactions, orders, loading, error, source,
    reload: load, createLead, moveLeadStage, addInteraction,
  }
}
