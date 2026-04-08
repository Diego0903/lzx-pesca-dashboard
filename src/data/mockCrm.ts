// Mock data — substituir por backend real quando disponível
// Centraliza Leads, Clientes, Pedidos, Interações e dimensões agregadas

export type LeadStage = 'novo' | 'qualificado' | 'orcamento' | 'negociacao' | 'fechado' | 'perdido'
export type LeadOrigin = 'Google' | 'Instagram' | 'Facebook' | 'Indicação' | 'WhatsApp' | 'Cliente Recorrente' | 'Desconhecido'
export type ContactType = 'WhatsApp' | 'Email' | 'Ligação' | 'Visita'
export type OrderStatus = 'novo' | 'andamento' | 'fechado'
export type ProductCategory = 'Redes' | 'Linhas' | 'Tralhas' | 'Cordas' | 'Boias'
export type BrazilState = 'SC' | 'RS' | 'PR' | 'SP' | 'RJ' | 'MG' | 'BA' | 'PA' | 'CE' | 'Outros'

export interface LeadItem {
  product: string
  category: ProductCategory
  qty: number
  // Sem valor por item — o valor é do pedido inteiro (orderTotal no Lead).
}

export interface Lead {
  id: string
  name: string
  whatsapp: string
  city: string
  state: BrazilState
  // ── Estrutura: múltiplos produtos por lead, valor único do pedido + frete ──
  items: LeadItem[]
  orderTotal: number      // valor do pedido (sem frete) em R$
  shippingValue: number   // frete em R$
  // ── Campos derivados (computed) — mantidos para retro-compat com kanban/lista ──
  product: string         // = items.map(i => i.product).join(' · ')
  category: ProductCategory  // = items[0]?.category ?? 'Redes'
  estimatedQty: number    // = sum(items.qty)
  estimatedValue: number  // = orderTotal + shippingValue
  origin: LeadOrigin
  stage: LeadStage
  lastContactAt: string  // ISO
  nextFollowUpAt?: string
  recurring: boolean
  // ── Auditoria ──
  createdBy?: string       // uuid de usuarios.id
  createdByName?: string   // nome resolvido via embed (denormalized)
  createdAt?: string       // ISO — vem de leads.created_at
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
