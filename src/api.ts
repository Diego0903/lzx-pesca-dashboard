const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function dateParams(since?: string, until?: string) {
  if (!since || !until) return ''
  return `since=${since}&until=${until}`
}

export const api = {
  tokenStatus: () => get<{ data: { is_valid: boolean; scopes: string[]; expires_at: number; application: string } }>('/token-status'),
  adAccounts: () => get<{ data?: unknown[]; error?: { message: string } }>('/ad-accounts'),
  campaigns: (accountId: string) => get<{ data?: unknown[]; error?: { message: string } }>(`/campaigns/${accountId}`),
  accountInsights: (accountId: string, since?: string, until?: string) => {
    const q = dateParams(since, until)
    return get<{ data?: unknown[]; error?: { message: string } }>(`/insights/account/${accountId}/campaigns${q ? '?' + q : ''}`)
  },
  timeSeries: (accountId: string, since?: string, until?: string) => {
    const q = dateParams(since, until)
    return get<{ data?: unknown[]; error?: { message: string } }>(`/insights/account/${accountId}/timeseries${q ? '?' + q : ''}`)
  },
  generateReport: (accountId: string, since?: string, until?: string, type?: string, igUserId?: string, mode?: string) =>
    post<{ success: boolean; report: string; reportHtml?: string }>('/generate-report', { accountId, since, until, type, igUserId, mode }),
  igDiscover: () => get<{ data?: Array<{ id: string; name: string; instagram_business_account?: { id: string; username: string; name: string; followers_count: number; profile_picture_url: string } }> }>('/instagram/discover'),
  igProfile: (igUserId: string) => get<{ id: string; username: string; name: string; biography?: string; followers_count: number; follows_count: number; media_count: number; profile_picture_url: string; website?: string }>(`/instagram/profile/${igUserId}`),
  igInsights: (igUserId: string, since?: string, until?: string) => {
    const q = dateParams(since, until)
    return get<{ data?: unknown[]; error?: { message: string } }>(`/instagram/insights/${igUserId}${q ? '?' + q : ''}`)
  },
  igMedia: (igUserId: string) => get<{ data?: unknown[]; error?: { message: string } }>(`/instagram/media/${igUserId}`),
  igStories: (igUserId: string) => get<{ data?: unknown[]; error?: { message: string } }>(`/instagram/stories/${igUserId}`),
}
