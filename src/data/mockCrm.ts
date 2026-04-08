// Mock data — substituir por backend real quando disponível
// Centraliza Leads, Clientes, Pedidos, Interações e dimensões agregadas

export type LeadStage = 'novo' | 'qualificado' | 'orcamento' | 'negociacao' | 'fechado' | 'perdido'
export type LeadOrigin = 'Google' | 'Instagram' | 'Facebook' | 'Indicação' | 'WhatsApp'
export type ContactType = 'WhatsApp' | 'Email' | 'Ligação' | 'Visita'
export type OrderStatus = 'novo' | 'andamento' | 'fechado'
export type ProductCategory = 'Redes' | 'Linhas' | 'Tralhas' | 'Cordas' | 'Boias'
export type BrazilState = 'SC' | 'RS' | 'PR' | 'SP' | 'RJ' | 'MG' | 'BA' | 'PA' | 'CE' | 'Outros'

export interface Lead {
  id: string
  name: string
  whatsapp: string
  city: string
  state: BrazilState
  product: string
  category: ProductCategory
  estimatedQty: number
  estimatedValue: number
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

// ── Leads ───────────────────────────────────────────────────────
export const mockLeads: Lead[] = [
  { id: 'l1', name: 'Marcos Albuquerque', whatsapp: '(48) 99812-4501', city: 'Florianópolis', state: 'SC', product: 'Rede Multifilamento 70mm', category: 'Redes', estimatedQty: 50, estimatedValue: 12500, origin: 'Google', stage: 'novo', lastContactAt: '2026-04-06T14:30:00', nextFollowUpAt: '2026-04-09T10:00:00', recurring: false },
  { id: 'l2', name: 'Pesca Sul Distribuidora', whatsapp: '(51) 99340-7822', city: 'Rio Grande', state: 'RS', product: 'Linha Monofilamento 0.50mm — caixa', category: 'Linhas', estimatedQty: 200, estimatedValue: 28000, origin: 'Indicação', stage: 'qualificado', lastContactAt: '2026-04-05T11:15:00', nextFollowUpAt: '2026-04-08T14:00:00', recurring: true },
  { id: 'l3', name: 'Fernando Tavares', whatsapp: '(41) 98445-2010', city: 'Paranaguá', state: 'PR', product: 'Boia de Sinalização Inflável', category: 'Boias', estimatedQty: 30, estimatedValue: 4200, origin: 'Instagram', stage: 'orcamento', lastContactAt: '2026-04-04T16:00:00', nextFollowUpAt: '2026-04-07T09:00:00', recurring: false },
  { id: 'l4', name: 'Atacadão da Pesca LTDA', whatsapp: '(11) 98765-4321', city: 'Santos', state: 'SP', product: 'Corda Náutica 12mm — bobina', category: 'Cordas', estimatedQty: 1000, estimatedValue: 87000, origin: 'Google', stage: 'negociacao', lastContactAt: '2026-04-03T10:45:00', nextFollowUpAt: '2026-04-10T15:00:00', recurring: true },
  { id: 'l5', name: 'Clube de Pesca Atlântico', whatsapp: '(21) 98271-3344', city: 'Niterói', state: 'RJ', product: 'Tralha de Fundo — kit completo', category: 'Tralhas', estimatedQty: 80, estimatedValue: 9600, origin: 'Facebook', stage: 'fechado', lastContactAt: '2026-04-01T09:30:00', recurring: true },
  { id: 'l6', name: 'João Pescador ME', whatsapp: '(48) 99201-7766', city: 'Itajaí', state: 'SC', product: 'Rede Tarrafa 12mm', category: 'Redes', estimatedQty: 25, estimatedValue: 7500, origin: 'WhatsApp', stage: 'qualificado', lastContactAt: '2026-04-06T08:20:00', nextFollowUpAt: '2026-04-09T11:00:00', recurring: false },
  { id: 'l7', name: 'Mar e Pesca Distribuição', whatsapp: '(31) 99820-4400', city: 'Belo Horizonte', state: 'MG', product: 'Linha Trançada 0.30mm', category: 'Linhas', estimatedQty: 150, estimatedValue: 18750, origin: 'Google', stage: 'novo', lastContactAt: '2026-04-07T13:00:00', recurring: false },
  { id: 'l8', name: 'Náutica Costa Verde', whatsapp: '(71) 99501-2233', city: 'Salvador', state: 'BA', product: 'Boia de Pesca Esportiva', category: 'Boias', estimatedQty: 60, estimatedValue: 5400, origin: 'Instagram', stage: 'perdido', lastContactAt: '2026-03-28T15:10:00', recurring: false },
  { id: 'l9', name: 'Carlos Henrique Souza', whatsapp: '(91) 98112-9087', city: 'Belém', state: 'PA', product: 'Rede de Espera 80mm', category: 'Redes', estimatedQty: 40, estimatedValue: 11200, origin: 'Indicação', stage: 'orcamento', lastContactAt: '2026-04-04T11:30:00', nextFollowUpAt: '2026-04-08T10:30:00', recurring: false },
  { id: 'l10', name: 'Pesca & Cia Ltda', whatsapp: '(85) 99644-2018', city: 'Fortaleza', state: 'CE', product: 'Tralha de Praia Pesada', category: 'Tralhas', estimatedQty: 120, estimatedValue: 14400, origin: 'Facebook', stage: 'negociacao', lastContactAt: '2026-04-02T14:00:00', nextFollowUpAt: '2026-04-09T16:00:00', recurring: true },
  { id: 'l11', name: 'Estaleiro Sul', whatsapp: '(48) 99776-1122', city: 'Itajaí', state: 'SC', product: 'Corda de Amarração 16mm', category: 'Cordas', estimatedQty: 500, estimatedValue: 42500, origin: 'Indicação', stage: 'fechado', lastContactAt: '2026-03-30T09:00:00', recurring: true },
  { id: 'l12', name: 'Pescaria do Norte', whatsapp: '(91) 99880-5544', city: 'Santarém', state: 'PA', product: 'Rede Caceia 100mm', category: 'Redes', estimatedQty: 35, estimatedValue: 9800, origin: 'WhatsApp', stage: 'novo', lastContactAt: '2026-04-07T07:45:00', nextFollowUpAt: '2026-04-10T09:00:00', recurring: false },
]

// ── Interações por lead ─────────────────────────────────────────
export const mockInteractions: Interaction[] = [
  { id: 'i1', leadId: 'l1', type: 'WhatsApp', date: '2026-04-06T14:30:00', note: 'Cliente solicitou catálogo de redes multifilamento. Enviado PDF.' },
  { id: 'i2', leadId: 'l1', type: 'WhatsApp', date: '2026-04-05T10:00:00', note: 'Primeiro contato — interesse em compra para frota de 8 barcos.' },
  { id: 'i3', leadId: 'l2', type: 'Ligação', date: '2026-04-05T11:15:00', note: 'Negociação de prazo de pagamento — cliente recorrente, 45/60/90.' },
  { id: 'i4', leadId: 'l2', type: 'Email', date: '2026-04-04T16:30:00', note: 'Enviado pedido formal por email com NF parcelada.' },
  { id: 'i5', leadId: 'l3', type: 'WhatsApp', date: '2026-04-04T16:00:00', note: 'Solicitou orçamento revisado com 30 unidades.' },
  { id: 'i6', leadId: 'l4', type: 'Visita', date: '2026-04-03T10:45:00', note: 'Visita técnica ao depósito do cliente em Santos. Aprovaram amostra.' },
  { id: 'i7', leadId: 'l5', type: 'WhatsApp', date: '2026-04-01T09:30:00', note: 'Pedido fechado! Entrega prevista para 12/04.' },
  { id: 'i8', leadId: 'l6', type: 'WhatsApp', date: '2026-04-06T08:20:00', note: 'Pediu condições especiais para revenda local.' },
]

// ── Pedidos recentes ────────────────────────────────────────────
export const mockOrders: Order[] = [
  { id: 'o1', client: 'Estaleiro Sul', product: 'Corda Náutica 16mm', category: 'Cordas', state: 'SC', value: 42500, status: 'andamento', date: '2026-04-06' },
  { id: 'o2', client: 'Clube de Pesca Atlântico', product: 'Tralha de Fundo Kit', category: 'Tralhas', state: 'RJ', value: 9600, status: 'fechado', date: '2026-04-05' },
  { id: 'o3', client: 'Pesca Sul Distribuidora', product: 'Linha Mono 0.50mm', category: 'Linhas', state: 'RS', value: 28000, status: 'andamento', date: '2026-04-04' },
  { id: 'o4', client: 'Atacadão da Pesca LTDA', product: 'Corda 12mm bobina', category: 'Cordas', state: 'SP', value: 87000, status: 'novo', date: '2026-04-07' },
  { id: 'o5', client: 'João Pescador ME', product: 'Rede Tarrafa 12mm', category: 'Redes', state: 'SC', value: 7500, status: 'novo', date: '2026-04-07' },
  { id: 'o6', client: 'Pesca & Cia Ltda', product: 'Tralha Praia Pesada', category: 'Tralhas', state: 'CE', value: 14400, status: 'andamento', date: '2026-04-03' },
  { id: 'o7', client: 'Marcos Albuquerque', product: 'Rede Multi 70mm', category: 'Redes', state: 'SC', value: 12500, status: 'novo', date: '2026-04-06' },
  { id: 'o8', client: 'Carlos H. Souza', product: 'Rede Espera 80mm', category: 'Redes', state: 'PA', value: 11200, status: 'andamento', date: '2026-04-04' },
  { id: 'o9', client: 'Mar e Pesca Distribuição', product: 'Linha Trançada 0.30mm', category: 'Linhas', state: 'MG', value: 18750, status: 'novo', date: '2026-04-07' },
  { id: 'o10', client: 'Náutica Itajaí', product: 'Boia Sinalização', category: 'Boias', state: 'SC', value: 3400, status: 'fechado', date: '2026-04-02' },
  { id: 'o11', client: 'Pesqueiro do Vale', product: 'Tralha leve', category: 'Tralhas', state: 'PR', value: 5200, status: 'fechado', date: '2026-04-01' },
  { id: 'o12', client: 'Distribuidora Náutica RS', product: 'Corda 18mm', category: 'Cordas', state: 'RS', value: 36800, status: 'andamento', date: '2026-04-03' },
]

// ── Receita mensal (últimos 6 meses) ────────────────────────────
export const monthlyRevenue = [
  { month: 'Nov/25', receita: 142800, pedidos: 38 },
  { month: 'Dez/25', receita: 178500, pedidos: 47 },
  { month: 'Jan/26', receita: 121400, pedidos: 32 },
  { month: 'Fev/26', receita: 156900, pedidos: 41 },
  { month: 'Mar/26', receita: 198200, pedidos: 53 },
  { month: 'Abr/26', receita: 187650, pedidos: 49 },
]

// ── Produtos mais vendidos por categoria ────────────────────────
export const salesByCategory = [
  { categoria: 'Redes', vendas: 142, receita: 312000 },
  { categoria: 'Linhas', vendas: 215, receita: 184500 },
  { categoria: 'Cordas', vendas: 87, receita: 268400 },
  { categoria: 'Tralhas', vendas: 178, receita: 92800 },
  { categoria: 'Boias', vendas: 64, receita: 38900 },
]

// ── Distribuição de pedidos por estado ──────────────────────────
export const ordersByState = [
  { estado: 'SC', pedidos: 124, value: 124 },
  { estado: 'RS', pedidos: 87,  value: 87 },
  { estado: 'PR', pedidos: 71,  value: 71 },
  { estado: 'Outros', pedidos: 96, value: 96 },
]

// ── Leads por origem (CRM mini-dash) ────────────────────────────
export const leadsBySource = [
  { source: 'Google',     leads: 38 },
  { source: 'Instagram',  leads: 27 },
  { source: 'Indicação',  leads: 22 },
  { source: 'WhatsApp',   leads: 19 },
  { source: 'Facebook',   leads: 14 },
]

// ── Taxa de fechamento por categoria de produto ─────────────────
export const closeRateByCategory = [
  { categoria: 'Cordas',  taxa: 64 },
  { categoria: 'Redes',   taxa: 51 },
  { categoria: 'Linhas',  taxa: 48 },
  { categoria: 'Tralhas', taxa: 39 },
  { categoria: 'Boias',   taxa: 28 },
]

// ── KPIs adicionais (mock derivado) ─────────────────────────────
export const dashboardExtraKpis = {
  whatsappConversion: 14.6,        // %
  ticketMedio: 3825.50,            // R$
  topConsultedProduct: 'Rede Multi 70mm',
  topConsultedCount: 47,
  avgResponseMinutes: 12,
}
