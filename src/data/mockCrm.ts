// Mock data — substituir por backend real quando disponível
// Centraliza Leads, Clientes, Pedidos, Interações e dimensões agregadas

export type LeadStage = 'novo' | 'qualificado' | 'orcamento' | 'negociacao' | 'fechado' | 'perdido'
export type LeadOrigin = 'Google' | 'Instagram' | 'Facebook' | 'Indicação' | 'WhatsApp'
export type ContactType = 'WhatsApp' | 'Email' | 'Ligação' | 'Visita'
export type OrderStatus = 'novo' | 'andamento' | 'fechado'
export type ProductCategory = 'Redes' | 'Linhas' | 'Tralhas' | 'Cordas' | 'Boias'
export type BrazilState = 'SC' | 'RS' | 'PR' | 'SP' | 'RJ' | 'MG' | 'BA' | 'PA' | 'CE' | 'Outros'

export interface LeadItem {
  product: string
  category: ProductCategory
  qty: number
  value: number  // total monetário desta linha (R$)
}

export interface Lead {
  id: string
  name: string
  whatsapp: string
  city: string
  state: BrazilState
  // ── Estrutura nova: múltiplos produtos por lead + frete ──
  items: LeadItem[]
  shippingValue: number   // valor do frete em R$
  // ── Campos derivados (computed) — mantidos para retro-compat com kanban/lista ──
  product: string         // = items.map(i => i.product).join(' · ')
  category: ProductCategory  // = items[0]?.category ?? 'Redes'
  estimatedQty: number    // = sum(items.qty)
  estimatedValue: number  // = sum(items.value) + shippingValue
  origin: LeadOrigin
  stage: LeadStage
  lastContactAt: string  // ISO
  nextFollowUpAt?: string
  recurring: boolean
}

export interface Interaction {
  id: string
  leadId: string
  type: ContactType
  date: string
  note: string
}

export interface Order {
  id: string
  client: string
  product: string
  category: ProductCategory
  state: BrazilState
  value: number
  status: OrderStatus
  date: string
}

// ── Mock data — agora sempre vazio. Dados reais vêm do Supabase. ──
export const mockLeads: Lead[] = []

export const mockInteractions: Interaction[] = []
export const mockOrders: Order[] = []
