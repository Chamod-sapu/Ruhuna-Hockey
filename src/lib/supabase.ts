import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  console.warn('Supabase env vars missing. Copy .env.example to .env and fill them in.')
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-key')
export const MEDIA_BUCKET = 'hockey-media'
