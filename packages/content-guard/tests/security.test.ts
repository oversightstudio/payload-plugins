import assert from 'node:assert/strict'
import test from 'node:test'
import { createAccessToken, verifyAccessToken } from '../src/security'
import { isValidOrigin, MemoryRateLimiter, passwordsMatch } from '../src/security'

const secret = 'a sufficiently long payload secret'

test('tokens are signed, expire, and reject future issuance', () => {
  const now = 1_800_000_000_000
  const token = createAccessToken('review-me', secret, now)

  assert.equal(verifyAccessToken(token, 'review-me', secret, now), true)
  assert.equal(verifyAccessToken(token, 'changed', secret, now), false)
  assert.equal(verifyAccessToken(token, 'review-me', 'another-secret', now), false)
  assert.equal(verifyAccessToken(token, 'review-me', secret, now + 7 * 86_400_000), true)
  assert.equal(verifyAccessToken(token, 'review-me', secret, now + 7 * 86_400_000 + 1), false)
  assert.equal(verifyAccessToken(token, 'review-me', secret, now + 3_601_000, 3_600_000), false)
  assert.equal(
    verifyAccessToken(
      createAccessToken('review-me', secret, now + 31_000),
      'review-me',
      secret,
      now,
    ),
    false,
  )
})

test('malformed and tampered tokens never throw', () => {
  const now = Date.now()
  const token = createAccessToken('password', secret, now)
  const malformed = ['', 'v1.nope.signature', `${token}extra`, token.replace(/.$/, 'x')]
  for (const value of malformed)
    assert.equal(verifyAccessToken(value, 'password', secret, now), false)
})

test('password comparison uses keyed constant-length digests', () => {
  assert.equal(passwordsMatch('correct', 'correct', secret), true)
  assert.equal(passwordsMatch('correct', 'incorrect', secret), false)
})

test('origin validation compares exact origins', () => {
  assert.equal(
    isValidOrigin(
      new Headers({ origin: 'https://preview.example.com' }),
      'https://preview.example.com/api',
    ),
    true,
  )
  assert.equal(
    isValidOrigin(
      new Headers({ origin: 'https://preview.example.com.evil.test' }),
      'https://preview.example.com/api',
    ),
    false,
  )
  assert.equal(isValidOrigin(new Headers(), 'https://preview.example.com/api'), false)
  assert.equal(
    isValidOrigin(
      new Headers({ origin: 'https://client.example.com' }),
      'http://internal:3000/api',
      ['https://client.example.com/path'],
    ),
    true,
  )
})

test('rate limiter counts failures, clears successes, and resets after its window', () => {
  const limiter = new MemoryRateLimiter({ maxAttempts: 2, windowMs: 1_000 })
  assert.equal(limiter.recordFailure('client', 1_000), 0)
  assert.equal(limiter.recordFailure('client', 1_100), 1)
  assert.equal(limiter.retryAfter('client', 1_200), 1)
  limiter.clear('client')
  assert.equal(limiter.retryAfter('client', 1_200), 0)
  limiter.recordFailure('client', 1_000)
  assert.equal(limiter.retryAfter('client', 2_001), 0)
})
