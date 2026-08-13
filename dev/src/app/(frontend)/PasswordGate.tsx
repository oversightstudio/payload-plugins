'use client'

import { useContentGuard } from '@oversightstudio/content-guard/next'
import { useState } from 'react'

/** Test-harness UI only. The published package deliberately ships no password-card UI. */
export function PasswordGate() {
  const { retryAfter, status, unlock } = useContentGuard()
  const [password, setPassword] = useState('')

  return (
    <main style={{ display: 'grid', minHeight: '100vh', placeItems: 'center' }}>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (await unlock(password)) setPassword('')
        }}
      >
        <h1>Client review</h1>
        <label htmlFor="content-guard-password">Password</label>
        <input
          autoComplete="current-password"
          id="content-guard-password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <button disabled={status === 'submitting'} type="submit">
          {status === 'submitting' ? 'Unlocking…' : 'Unlock'}
        </button>
        {status === 'invalid-password' ? <p role="alert">Incorrect password.</p> : null}
        {status === 'network-error' ? <p role="alert">Network error.</p> : null}
        {status === 'rate-limited' ? (
          <p role="alert">Too many attempts. Try again in {retryAfter ?? 60} seconds.</p>
        ) : null}
      </form>
    </main>
  )
}
