import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PayloadRequest } from 'payload'
import { CONTENT_GUARD_TOKEN_TTL_MS, CONTENT_GUARD_TOKEN_VERSION } from './constants'
import type { ContentGuardRateLimitOptions } from './types'

const MAX_CLOCK_SKEW_MS = 30_000

const digest = (value: string, secret: string) =>
  createHmac('sha256', secret).update(value).digest()

export const passwordsMatch = (actual: string, attempted: string, secret: string): boolean =>
  timingSafeEqual(digest(actual, secret), digest(attempted, secret))

const tokenKey = (password: string, secret: string) =>
  createHmac('sha256', secret).update(`content-guard:${password}`).digest()

export function createAccessToken(password: string, secret: string, issuedAt = Date.now()): string {
  const timestamp = issuedAt.toString()
  const payload = `${CONTENT_GUARD_TOKEN_VERSION}.${timestamp}`
  const signature = createHmac('sha256', tokenKey(password, secret))
    .update(payload)
    .digest('base64url')

  return `${payload}.${signature}`
}

export function verifyAccessToken(
  token: string,
  password: string,
  secret: string,
  now = Date.now(),
): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false

  const [version, rawTimestamp, signature] = parts
  if (version !== CONTENT_GUARD_TOKEN_VERSION || !/^\d{10,16}$/.test(rawTimestamp)) return false

  const issuedAt = Number(rawTimestamp)
  const age = now - issuedAt
  if (
    !Number.isSafeInteger(issuedAt) ||
    age < -MAX_CLOCK_SKEW_MS ||
    age > CONTENT_GUARD_TOKEN_TTL_MS
  ) {
    return false
  }

  const expected = createHmac('sha256', tokenKey(password, secret))
    .update(`${version}.${rawTimestamp}`)
    .digest()

  let received: Buffer
  try {
    received = Buffer.from(signature, 'base64url')
  } catch {
    return false
  }

  return received.length === expected.length && timingSafeEqual(received, expected)
}

export function isValidOrigin(
  headers: Headers,
  requestURL: string,
  allowedOrigins: string[] = [],
): boolean {
  const supplied = headers.get('origin') ?? headers.get('referer')
  if (!supplied) return false

  let suppliedOrigin: string
  let requestOrigin: string
  try {
    suppliedOrigin = new URL(supplied).origin
    requestOrigin = new URL(requestURL).origin
  } catch {
    return false
  }

  const allowed = new Set([requestOrigin])
  for (const origin of allowedOrigins) {
    try {
      allowed.add(new URL(origin).origin)
    } catch {
      // Invalid configured origins are ignored rather than weakening comparison.
    }
  }

  return allowed.has(suppliedOrigin)
}

export function defaultClientIdentifier(req: PayloadRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

type AttemptBucket = { attempts: number[]; touchedAt: number }

export class MemoryRateLimiter {
  private readonly buckets = new Map<string, AttemptBucket>()
  private readonly maxBuckets = 10_000

  constructor(
    private readonly options: Required<
      Pick<ContentGuardRateLimitOptions, 'maxAttempts' | 'windowMs'>
    >,
  ) {}

  retryAfter(identifier: string, now = Date.now()): number {
    const bucket = this.compact(identifier, now)
    if (!bucket || bucket.attempts.length < this.options.maxAttempts) return 0
    return Math.max(1, Math.ceil((bucket.attempts[0] + this.options.windowMs - now) / 1000))
  }

  recordFailure(identifier: string, now = Date.now()): number {
    const bucket = this.compact(identifier, now) ?? { attempts: [], touchedAt: now }
    bucket.attempts.push(now)
    bucket.touchedAt = now
    this.buckets.set(identifier, bucket)
    this.pruneIfNeeded()
    return this.retryAfter(identifier, now)
  }

  clear(identifier: string): void {
    this.buckets.delete(identifier)
  }

  private compact(identifier: string, now: number): AttemptBucket | undefined {
    const bucket = this.buckets.get(identifier)
    if (!bucket) return undefined
    bucket.attempts = bucket.attempts.filter((timestamp) => now - timestamp < this.options.windowMs)
    if (bucket.attempts.length === 0) {
      this.buckets.delete(identifier)
      return undefined
    }
    return bucket
  }

  private pruneIfNeeded(): void {
    if (this.buckets.size <= this.maxBuckets) return
    const oldest = [...this.buckets.entries()]
      .sort(([, left], [, right]) => left.touchedAt - right.touchedAt)
      .slice(0, this.buckets.size - this.maxBuckets)
    for (const [identifier] of oldest) this.buckets.delete(identifier)
  }
}
