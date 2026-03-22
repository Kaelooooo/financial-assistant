'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Allow reset-password through — user arrives via email link
    if (pathname === '/reset-password') { setReady(true); return }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace('/')
      } else {
        setReady(true)
      }
    })
  }, [router, pathname])

  if (!ready) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {children}
    </div>
  )
}
