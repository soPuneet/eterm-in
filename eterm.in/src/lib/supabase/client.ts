import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
 
cd /workspaces/eterm-in/eterm.in

cat > src/lib/supabase/client.ts << 'EOF'
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    console.warn('Supabase env vars missing — returning null client')
    return null as any
  }
  
  return createBrowserClient(url, key)
}
