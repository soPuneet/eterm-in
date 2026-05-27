import { createClient } from '@supabase/supabase-js'

export const supabase = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key || url === 'https://placeholder.supabase.co') {
    console.warn('Supabase server env vars missing — returning mock client')
    return {
      from: () => ({
        select: () => Promise.resolve({ data: null, error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      },
    } as any
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  })
})()