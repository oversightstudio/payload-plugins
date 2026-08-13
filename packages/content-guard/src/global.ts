import type { GlobalConfig, PayloadRequest } from 'payload'
import { CONTENT_GUARD_COOKIE, CONTENT_GUARD_GLOBAL_SLUG } from './constants'
import {
  createAccessToken,
  defaultClientIdentifier,
  isValidOrigin,
  MemoryRateLimiter,
  passwordsMatch,
} from './security'
import type { ContentGuardSettings, ResolvedContentGuardOptions } from './types'

const json = (body: unknown, status: number, headers?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  })

const cookieHeader = (token: string) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${CONTENT_GUARD_COOKIE}=${token}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax${secure}`
}

async function parsePassword(req: PayloadRequest): Promise<null | string> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return null
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > 4096) return null
  if (!req.text) return null

  const raw = await req.text()
  if (raw.length > 4096) return null
  try {
    const value = (JSON.parse(raw) as { password?: unknown }).password
    return typeof value === 'string' && value.length > 0 && value.length <= 1024 ? value : null
  } catch {
    return null
  }
}

export function createContentGuardGlobal({
  adminCollection,
  defaultActive,
  defaultPassword,
  options,
}: {
  adminCollection: string
  defaultActive: boolean
  defaultPassword?: string
  options: ResolvedContentGuardOptions
}): GlobalConfig {
  const limiter = options.rateLimit ? new MemoryRateLimiter(options.rateLimit) : null
  const isAdmin = ({ req }: { req: PayloadRequest }) => req.user?.collection === adminCollection

  return {
    slug: CONTENT_GUARD_GLOBAL_SLUG,
    label: 'Content Guard',
    admin: { group: 'Settings' },
    access: { read: isAdmin, update: isAdmin },
    fields: [
      {
        name: 'active',
        type: 'checkbox',
        defaultValue: defaultActive,
        label: 'Active',
        admin: {
          description:
            'Require the password on wrapped frontend routes. Turning this off preserves the password but does not restore static rendering; disable the plugin in code for that.',
        },
      },
      {
        name: 'password',
        type: 'text',
        defaultValue: defaultPassword,
        label: 'Password',
        admin: {
          description:
            'Visible to Payload admin users so it can be shared with reviewers and clients.',
        },
      },
    ],
    endpoints: [
      {
        method: 'post',
        path: '/unlock',
        handler: async (req) => {
          if (!req.url || !isValidOrigin(req.headers, req.url, options.allowedOrigins)) {
            return json({ error: 'Unable to unlock content.' }, 403)
          }

          const rateLimit = options.rateLimit
          const identifier =
            rateLimit && rateLimit.getClientIdentifier
              ? await rateLimit.getClientIdentifier(req)
              : defaultClientIdentifier(req)
          const retryAfter = limiter?.retryAfter(identifier) ?? 0
          if (retryAfter > 0) {
            return json({ error: 'Too many attempts. Try again later.', retryAfter }, 429, {
              'Retry-After': String(retryAfter),
            })
          }

          const attemptedPassword = await parsePassword(req)
          if (!attemptedPassword) return json({ error: 'Unable to unlock content.' }, 400)

          const settings = (await req.payload.findGlobal({
            slug: CONTENT_GUARD_GLOBAL_SLUG as never,
            overrideAccess: true,
          })) as ContentGuardSettings
          const password = typeof settings.password === 'string' ? settings.password : ''
          if (
            !settings.active ||
            !password ||
            !passwordsMatch(password, attemptedPassword, options.signingSecret)
          ) {
            const nextRetryAfter = limiter?.recordFailure(identifier) ?? 0
            if (nextRetryAfter > 0) {
              return json(
                { error: 'Too many attempts. Try again later.', retryAfter: nextRetryAfter },
                429,
                { 'Retry-After': String(nextRetryAfter) },
              )
            }
            return json({ error: 'Unable to unlock content.' }, 403)
          }

          limiter?.clear(identifier)
          const token = createAccessToken(password, options.signingSecret)
          return json({ unlocked: true }, 200, { 'Set-Cookie': cookieHeader(token) })
        },
      },
    ],
  }
}
