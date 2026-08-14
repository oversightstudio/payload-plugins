# Content Guard Payload Plugin

## Install

```sh
pnpm add @oversightstudio/content-guard
```

## About

Content Guard is a headless password wall for Payload and Next.js, built for staging sites, client previews, and private works in progress. Payload admins control the wall from the CMS, while your application supplies the complete frontend experience.

The package deliberately ships with no form, styles, icons, Tailwind dependency, or other UI stack. It also requires no collection, Redis instance, middleware, extra auth setup, or custom API route.

## What It Adds

- A `Content Guard` Payload global with an `Active` toggle and plaintext `Password` field.
- A secure password-unlock endpoint registered under Payload's API route.
- A Next.js server component that protects only the layouts or pages you wrap.
- A client hook for submitting passwords from your own branded gate.
- A signed, expiring, HttpOnly access cookie that is invalidated when the password changes.
- An authenticated Payload admin bypass and `noindex, nofollow`, both enabled by default.

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

The global appears in the Payload admin panel after the plugin is registered. The wall protects content only when `Active` is enabled and a password is present. Authorized admins can view and change the plaintext password there, which is intentional for agency and client handoff workflows.

The plugin uses the configured Payload secret for cookie signing by default, so no additional secret is required.

## Frontend Setup

Wrap any route or layout you want to protect. Wrapping a layout protects every route below it, so you can guard a single page, a section of the site, or the entire site from the root layout. The recommended setup binds your Payload config and branded password gate once in a project-level component.

Anything wrapped by `ContentGuard` becomes dynamically server-rendered because the guard must read Payload settings, request headers, and cookies for each request. This is also true while the CMS `Active` toggle is off. If a deployment must remain statically rendered, set the plugin's code-level `enabled` option to `false`.

### 1. Create Your Site Guard

The password gate is a client component because it handles form state and submits the password:

```tsx
// components/PasswordGate.tsx
'use client'

import { useContentGuard } from '@oversightstudio/content-guard/client'

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

The site guard is a server component that binds the Payload config and your gate. Keeping it separate from the client component ensures the Payload config never enters the browser bundle:

```tsx
// components/SiteContentGuard.tsx
import config from '@payload-config'
import { ContentGuard } from '@oversightstudio/content-guard/next'
import { PasswordGate } from './PasswordGate'

export function SiteContentGuard({ children }: { children: React.ReactNode }) {
  return (
    <ContentGuard payloadConfig={config} passwordGate={<PasswordGate />}>
      {children}
    </ContentGuard>
  )
}
```

`ContentGuard` places your gate inside its client provider. You own the gate's markup, accessibility, messaging, branding, and styling.

### 2. Use It

Wrap a layout or server-rendered page. Nothing else needs to know about the Payload config or password gate:

```tsx
// app/(frontend)/layout.tsx
import { SiteContentGuard } from '@/components/SiteContentGuard'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SiteContentGuard>{children}</SiteContentGuard>
}
```

To show a branded "no access" screen instead, replace `PasswordGate` in `SiteContentGuard` with a static component that does not call `useContentGuard()`.

Omit `passwordGate` to render no visible content for blocked visitors. This is useful for admin-only interface elements when the guard is active and has a password; authenticated Payload admins still see the children through the default admin bypass:

```tsx
<ContentGuard payloadConfig={config}>
  <AdminBar />
</ContentGuard>
```

## Rendering Behavior

Wrapping a page with `ContentGuard` makes that page dynamic. Wrapping a layout makes every route below that layout dynamic. The guard reads Payload settings, request headers, and cookies on the server for each request, so Next.js cannot statically render anything inside that boundary.

The CMS `Active` toggle controls whether visitors are currently blocked; it does not restore static rendering when switched off. Next.js determines the route's rendering behavior from the code used by the route.

Set `enabled: false` in the Payload plugin configuration when a deployment should remain fully static. This makes the plugin an exact no-op; removing only the frontend wrapper is not required.

## Options

| Option            | Type                  | Default            | Description                                                                                                          |
| ----------------- | --------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `enabled`         | `boolean`             | `true`             | Register the global and runtime integration. `false` is an exact no-op.                                              |
| `defaultPassword` | `string`              | —                  | Initial plaintext password shown to authorized admins in the global.                                                 |
| `defaultActive`   | `boolean`             | Password-dependent | Initial `Active` value. Defaults to true when a default password exists.                                             |
| `adminBypass`     | `boolean \| function` | `true`             | Bypass for a signed-in user from Payload's configured admin collection, or replace that rule with a custom function. |
| `noIndex`         | `boolean`             | `true`             | Render `noindex, nofollow` while an active wall protects the route.                                                  |
| `signingSecret`   | `string`              | Payload secret     | Optional signing-secret override.                                                                                    |
| `tokenExpiration` | `number`              | `604800`           | Access-token and cookie lifetime in seconds (7 days by default).                                                     |
| `allowedOrigins`  | `string[]`            | `serverURL`        | Additional exact browser origins allowed to submit passwords.                                                        |
| `rateLimit`       | `false \| object`     | 10 attempts/minute | Configure or disable the bounded in-memory attempt limiter.                                                          |

## Security Model

- Passwords remain plaintext in the Payload global by design so authorized admins can retrieve and share them.
- Passwords and signed tokens are never returned to browser JavaScript.
- Cookies are HttpOnly, SameSite=Lax, and Secure in production, with a configurable 7-day expiry by default.
- Tokens are bound to the current password and signing secret, use timing-safe signature checks, and reject expired or implausibly future-dated values.
- Unlock requests enforce exact origins, bounded bodies, generic failure messages, and basic throttling.

The built-in limiter is intentionally dependency-free and process-local. For hostile public traffic or distributed enforcement, place the site behind an edge access product or supply a trusted client-identifier function.
