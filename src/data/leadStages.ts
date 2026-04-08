// Single source of truth para os 6 estágios do pipeline de leads.
// Antes estavam triplicados em CrmPage, CadastrarClientePage e useCrm.
import type { LeadStage } from './mockCrm'

export interface StageMeta {
  label: string         // rótulo curto: "Novo", "Fechado"
  longLabel: string     // rótulo longo: "Novo Lead", "Fechado"
  pillClass: string     // classe CSS de badge: "badge-blue", "badge-green"
  color: string         // cor hex usada nas colunas do kanban
}

export const STAGE_META: Record<LeadStage, StageMeta> = {
  novo:        { label: 'Novo',        longLabel: 'Novo Lead',         pillClass: 'badge-blue',   color: '#3b82f6' },
  qualificado: { label: 'Qualificado', longLabel: 'Qualificado',       pillClass: 'badge-blue',   color: '#a855f7' },
  orcamento:   { label: 'Orçamento',   longLabel: 'Orçamento Enviado', pillClass: 'badge-gold',   color: '#c4a35a' },
  negociacao:  { label: 'Negociação',  longLabel: 'Negociação',        pillClass: 'badge-orange', color: '#f97316' },
  fechado:     { label: 'Fechado',     longLabel: 'Fechado',           pillClass: 'badge-green',  color: '#16a34a' },
  perdido:     { label: 'Perdido',     longLabel: 'Perdido',           pillClass: 'badge-red',    color: '#dc2626' },
}

export const STAGE_LIST: LeadStage[] = ['novo','qualificado','orcamento','negociacao','fechado','perdido']
