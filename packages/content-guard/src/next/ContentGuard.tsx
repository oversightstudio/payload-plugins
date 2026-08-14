import { cookies, headers as getHeaders } from 'next/headers'
import { getPayload, type SanitizedConfig } from 'payload'
import {
  CONTENT_GUARD_COOKIE,
  CONTENT_GUARD_GLOBAL_SLUG,
  CONTENT_GUARD_RUNTIME_KEY,
} from '../constants'
import { verifyAccessToken } from '../security'
import type { ContentGuardSettings, ResolvedContentGuardOptions } from '../types'
import { ContentGuardProvider } from './ContentGuardProvider'

export type ContentGuardProps = {
  children: React.ReactNode
  passwordGate?: React.ReactNode
  payloadConfig: Promise<SanitizedConfig> | SanitizedConfig
}

export async function ContentGuard({ children, passwordGate, payloadConfig }: ContentGuardProps) {
  const payload = await getPayload({ config: payloadConfig })
  const options = payload.config.custom?.[CONTENT_GUARD_RUNTIME_KEY] as
    ResolvedContentGuardOptions | undefined

  if (!options?.enabled) return <>{children}</>

  // These are intentionally unconditional once the plugin is installed. Next decides
  // static/dynamic rendering at build time, while the CMS Active toggle changes at runtime.
  const [cookieStore, requestHeaders, settings] = await Promise.all([
    cookies(),
    getHeaders(),
    payload.findGlobal({ slug: CONTENT_GUARD_GLOBAL_SLUG as never, overrideAccess: true }),
  ])
  const guard = settings as ContentGuardSettings
  const armed = Boolean(guard.active && guard.password)
  if (!armed) return <>{children}</>

  const robots = options.noIndex ? <meta name="robots" content="noindex, nofollow" /> : null
  let bypassed = false
  if (options.adminBypass) {
    const { user } = await payload.auth({ headers: requestHeaders })
    bypassed =
      typeof options.adminBypass === 'function'
        ? await options.adminBypass({ headers: requestHeaders, payload, user })
        : Boolean(user && user.collection === payload.config.admin.user)
  }

  const token = cookieStore.get(CONTENT_GUARD_COOKIE)?.value
  const unlocked = Boolean(
    token &&
    verifyAccessToken(
      token,
      guard.password as string,
      options.signingSecret,
      Date.now(),
      options.tokenExpiration * 1_000,
    ),
  )
  if (bypassed || unlocked)
    return (
      <>
        {robots}
        {children}
      </>
    )

  if (passwordGate == null) return <>{robots}</>

  const apiRoute = payload.config.routes.api.replace(/\/$/, '')
  return (
    <>
      {robots}
      <ContentGuardProvider endpoint={`${apiRoute}/globals/${CONTENT_GUARD_GLOBAL_SLUG}/unlock`}>
        {passwordGate}
      </ContentGuardProvider>
    </>
  )
}
