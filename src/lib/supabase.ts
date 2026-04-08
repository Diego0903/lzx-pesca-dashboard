import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseEnabled = Boolean(url && anonKey)

export const supabase = supabaseEnabled
  ? createClient(url!, anonKey!, {
      auth: {
        // Persiste sessão em localStorage entre F5 / reabrir browser.
        // O AuthContext força logout extra se "permanecer conectado" expirar.
        persistSession: true,
        autoRefreshToken: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : null
