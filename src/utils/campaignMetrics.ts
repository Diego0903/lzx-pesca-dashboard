import type { CampaignInsight } from '../types'

export function getMessages(c: CampaignInsight): number {
  return parseFloat(
    c.actions?.find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || '0'
  )
}

export function getCostPerMsg(c: CampaignInsight): number {
  return parseFloat(
    c.cost_per_action_type?.find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || '0'
  )
}

export function getCostPerMsgColor(costPerMsg: number): string {
  if (costPerMsg <= 1) return '#25D366'
  if (costPerMsg <= 2) return '#86efac'
  if (costPerMsg <= 3) return 'var(--yellow)'
  return 'var(--red)'
}
