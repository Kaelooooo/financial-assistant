// web/src/lib/supabase.ts
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// For Client Components only (browser). Safe as a singleton because it runs client-side.
// DO NOT import in Server Components or middleware — use createSupabaseServerClient instead.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// For Server Components and Route Handlers — pass the cookie store from headers().
// Note: this is read-only (setAll is a no-op). Use the middleware's own client for cookie writes.
export function createSupabaseServerClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })
}
