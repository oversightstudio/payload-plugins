# Content Guard Payload Plugin

## Install

```sh
pnpm add @oversightstudio/content-guard
```

## About

Content Guard is a headless password wall for Payload and Next.js. It registers one Payload global and a secure unlock endpoint, while your application supplies all frontend markup and branding.

It requires no collection, Redis instance, middleware, extra auth setup, or custom API route. Successful unlocks use a signed, expiring, HttpOnly cookie; changing the password invalidates existing cookies automatically.

## Payload Setup

```tsx
import { contentGuardPlugin } from '@oversightstudio/content-guard'
import { buildConfig } from 'payload'

export default buildConfig({
  plugins: [
    contentGuardPlugin({
      defaultPassword: process.env.CONTENT_GUARD_PASSWORD,
      defaultActive: true,
    }),
  ],
})
```

The plugin uses the configured Payload secret for signing by default. Registering it in code intentionally makes wrapped Next.js routes dynamic even when the CMS `Active` toggle is off. Set `enabled: false` in code when a deployment should remain fully static.

## Frontend Setup

Wrap only the server-rendered routes you want to protect. `passwordGate` is your own component; the package ships no UI, styles, icons, or Tailwind dependency.

```tsx
import config from '@payload-config'
import { ContentGuard } from '@oversightstudio/content-guard/next'
import { PasswordGate } from './PasswordGate'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ContentGuard payloadConfig={config} passwordGate={<PasswordGate />}>
      {children}
    </ContentGuard>
  )
}
```

Use the client hook inside your custom gate:

```tsx
'use client'

import { useContentGuard } from '@oversightstudio/content-guard/next'

export function PasswordGate() {
  const { status, unlock } = useContentGuard()

  return (
    <form action={(data) => unlock(String(data.get('password') ?? ''))}>
      <input name="password" type="password" />
      <button disabled={status === 'submitting'}>Enter</button>
      {status === 'invalid-password' && <p>Incorrect password.</p>}
    </form>
  )
}
```

## Options

| Option            | Type                  | Default            | Description                                                                                                          |
| ----------------- | --------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `enabled`         | `boolean`             | `true`             | Register the global and runtime integration. `false` is an exact no-op.                                              |
| `defaultPassword` | `string`              | —                  | Initial plaintext password shown to authorized admin users.                                                          |
| `defaultActive`   | `boolean`             | Password-dependent | Initial state of the guard. Defaults to true when a default password exists.                                         |
| `adminBypass`     | `boolean \| function` | `true`             | Bypass for a signed-in user from Payload's configured admin collection, or replace that rule with a custom function. |
| `noIndex`         | `boolean`             | `true`             | Render `noindex, nofollow` while an active wall protects the route.                                                  |
| `signingSecret`   | `string`              | Payload secret     | Optional signing-secret override.                                                                                    |
| `allowedOrigins`  | `string[]`            | `serverURL`        | Additional exact browser origins allowed to submit passwords.                                                        |
| `rateLimit`       | `false \| object`     | 10 attempts/minute | Configure or disable the bounded in-memory attempt limiter.                                                          |

## Security Model

- Passwords remain plaintext in the Payload global by design so authorized admins can retrieve and share them.
- Passwords and signed tokens are never returned to browser JavaScript.
- Cookies are HttpOnly, SameSite=Lax, and Secure in production, with a 24-hour expiry.
- Tokens are bound to the current password and signing secret, use timing-safe signature checks, and reject expired or implausibly future-dated values.
- Unlock requests enforce exact origins, bounded bodies, generic failure messages, and basic throttling.

The built-in limiter is intentionally dependency-free and process-local. For hostile public traffic or distributed enforcement, place the site behind an edge access product or supply a trusted client-identifier function.
