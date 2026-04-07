export interface AdAccount {
  id: string
  name: string
  account_status: number
  currency: string
  timezone_name: string
  amount_spent?: string
  balance?: string
}

export interface Campaign {
  id: string
  name: string
  status: string
  objective: string
  created_time: string
  start_time?: string
  stop_time?: string
  daily_budget?: string
  lifetime_budget?: string
}

export interface Action {
  action_type: string
  value: string
}

export interface CampaignInsight {
  campaign_id: string
  campaign_name: string
  adset_name?: string
  impressions: string
  clicks: string
  spend: string
  reach: string
  frequency?: string
  cpm?: string
  cpc?: string
  ctr?: string
  cpp?: string
  unique_clicks?: string
  unique_ctr?: string
  actions?: Action[]
  cost_per_action_type?: Action[]
  purchase_roas?: Array<{ action_type: string; value: string }>
}

export interface TimeSeriesPoint {
  date_start: string
  impressions: string
  clicks: string
  spend: string
  reach: string
  cpm?: string
  cpc?: string
  ctr?: string
  actions?: Action[]
}

export interface TokenStatus {
  data: {
    app_id: string
    type: string
    application: string
    expires_at: number
    is_valid: boolean
    scopes: string[]
    user_id: string
  }
}

export type MetricKey = 'spend' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'cpm' | 'reach'

export interface IgProfile {
  id: string
  username: string
  name: string
  biography?: string
  followers_count: number
  follows_count: number
  media_count: number
  profile_picture_url: string
  website?: string
}

export interface IgInsightValue {
  value: number
  end_time: string
}

export interface IgInsight {
  name: string
  period: string
  values: IgInsightValue[]
  title: string
}

export interface IgMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  timestamp: string
  like_count: number
  comments_count: number
  permalink: string
  media_url?: string
  thumbnail_url?: string
}
