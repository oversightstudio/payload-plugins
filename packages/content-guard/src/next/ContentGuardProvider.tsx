'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type ContentGuardStatus =
  'idle' | 'invalid-password' | 'network-error' | 'rate-limited' | 'submitting'

export type ContentGuardContextValue = {
  retryAfter: null | number
  status: ContentGuardStatus
  unlock: (password: string) => Promise<boolean>
}

const ContentGuardContext = createContext<ContentGuardContextValue | null>(null)

export function ContentGuardProvider({
  children,
  endpoint,
}: {
  children: React.ReactNode
  endpoint: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState<ContentGuardStatus>('idle')
  const [retryAfter, setRetryAfter] = useState<null | number>(null)

  const unlock = useCallback(
    async (password: string): Promise<boolean> => {
      setStatus('submitting')
      setRetryAfter(null)
      try {
        const response = await fetch(endpoint, {
          body: JSON.stringify({ password }),
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })

        if (response.status === 429) {
          const parsed = (await response.json().catch(() => null)) as null | { retryAfter?: number }
          setRetryAfter(parsed?.retryAfter ?? (Number(response.headers.get('Retry-After')) || null))
          setStatus('rate-limited')
          return false
        }
        if (!response.ok) {
          setStatus('invalid-password')
          return false
        }

        setStatus('idle')
        router.refresh()
        return true
      } catch {
        setStatus('network-error')
        return false
      }
    },
    [endpoint, router],
  )

  const value = useMemo(() => ({ retryAfter, status, unlock }), [retryAfter, status, unlock])
  return <ContentGuardContext.Provider value={value}>{children}</ContentGuardContext.Provider>
}

export function useContentGuard(): ContentGuardContextValue {
  const value = useContext(ContentGuardContext)
  if (!value) throw new Error('useContentGuard must be used inside ContentGuard passwordGate.')
  return value
}
