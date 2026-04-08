import { createContext, useContext, type ReactNode } from 'react'
import { useCrm, type UseCrmResult } from '../hooks/useCrm'

const CrmContext = createContext<UseCrmResult | null>(null)

// Single useCrm instance shared across header/CrmPage/PedidosPage to avoid
// duplicate Realtime subscriptions and redundant fetches.
export function CrmProvider({ children }: { children: ReactNode }) {
  const crm = useCrm()
  return <CrmContext.Provider value={crm}>{children}</CrmContext.Provider>
}

export function useCrmContext(): UseCrmResult {
  const ctx = useContext(CrmContext)
  if (!ctx) throw new Error('useCrmContext precisa estar dentro de <CrmProvider>')
  return ctx
}
