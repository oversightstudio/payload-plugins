import type { Payload, PayloadRequest, TypedUser } from 'payload'

export type ContentGuardBypassArgs = {
  headers: Headers
  payload: Payload
  user: null | TypedUser
}

export type ContentGuardBypass = (args: ContentGuardBypassArgs) => boolean | Promise<boolean>

export type ContentGuardRateLimitOptions = {
  /** @default 10 */
  maxAttempts?: number
  /** @default 60000 */
  windowMs?: number
  /** Override client identification for a trusted proxy or edge provider. */
  getClientIdentifier?: (req: PayloadRequest) => Promise<string> | string
}

export type ContentGuardPluginOptions = {
  /** @default true */
  enabled?: boolean
  defaultPassword?: string
  /** Defaults to true when defaultPassword is provided, otherwise false. */
  defaultActive?: boolean
  /** @default true */
  noIndex?: boolean
  /**
   * `true` bypasses the wall for the configured Payload admin collection.
   * A function replaces the built-in policy. `false` disables bypassing.
   * @default true
   */
  adminBypass?: boolean | ContentGuardBypass
  /** Uses Payload's configured secret by default. */
  signingSecret?: string
  /** Additional exact browser origins allowed to submit passwords. */
  allowedOrigins?: string[]
  /** Set false to disable the built-in bounded in-memory limiter. */
  rateLimit?: false | ContentGuardRateLimitOptions
}

export type ResolvedContentGuardOptions = {
  adminBypass: boolean | ContentGuardBypass
  allowedOrigins: string[]
  enabled: true
  noIndex: boolean
  rateLimit:
    | false
    | (Required<Pick<ContentGuardRateLimitOptions, 'maxAttempts' | 'windowMs'>> &
        Pick<ContentGuardRateLimitOptions, 'getClientIdentifier'>)
  signingSecret: string
}

export type ContentGuardSettings = {
  active?: boolean | null
  password?: null | string
}
