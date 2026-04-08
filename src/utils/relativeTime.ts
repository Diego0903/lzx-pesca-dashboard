import { useEffect, useState } from 'react'

// Força re-render a cada 30s pra atualizar textos relativos ("há 2 min" → "há 3 min").
export function useNowTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  const elapsed = Date.now() - d.getTime()
  if (elapsed < 0) return 'agora'
  const sec = Math.floor(elapsed / 1000)
  if (sec < 10) return 'agora mesmo'
  if (sec < 60) return `há ${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `há ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `há ${hr} h`
  const days = Math.floor(hr / 24)
  return `há ${days}d`
}
