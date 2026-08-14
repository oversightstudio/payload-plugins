import crypto from 'node:crypto'
import {
  authenticatedAlgorithm,
  encryptedValuePrefix,
  legacyAlgorithm,
  legacyAuthenticatedValuePrefix,
} from '../consts'
import {
  createAuthenticatedContext,
  createKeyFromSecret,
  createKeyID,
  createLegacyAuthenticatedKeyFromSecret,
} from './encrypt'

const legacyKeyFromSecret = (secret: string): string =>
  crypto.createHash('sha256').update(secret).digest('hex').slice(0, 32)

const decryptLegacy = (hash: string, secret: string): string => {
  const iv = hash.slice(0, 32)
  const content = hash.slice(32)
  if (
    !/^[a-f\d]+$/i.test(hash) ||
    iv.length !== 32 ||
    content.length === 0 ||
    content.length % 2 !== 0
  ) {
    throw new Error('Invalid legacy ciphertext.')
  }
  const decipher = crypto.createDecipheriv(
    legacyAlgorithm,
    legacyKeyFromSecret(secret),
    Buffer.from(iv, 'hex'),
  )
  const decrypted = Buffer.concat([decipher.update(Buffer.from(content, 'hex')), decipher.final()])
  return decrypted.toString()
}

const decryptV2 = (hash: string, secret: string): string => {
  const [version, rawIV, rawAuthTag, rawContent, ...extra] = hash.split(':')
  if (
    extra.length > 0 ||
    version !== legacyAuthenticatedValuePrefix ||
    !/^[a-f\d]{24}$/i.test(rawIV) ||
    !/^[a-f\d]{32}$/i.test(rawAuthTag) ||
    !/^[a-f\d]*$/i.test(rawContent) ||
    rawContent.length % 2 !== 0
  ) {
    throw new Error('Invalid v2 ciphertext.')
  }

  const decipher = crypto.createDecipheriv(
    authenticatedAlgorithm,
    createLegacyAuthenticatedKeyFromSecret(secret),
    Buffer.from(rawIV, 'hex'),
  )
  decipher.setAuthTag(Buffer.from(rawAuthTag, 'hex'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(rawContent, 'hex')),
    decipher.final(),
  ])
  return decrypted.toString()
}

const decryptV3 = (hash: string, secret: string, context: string): string => {
  const [version, rawKeyID, rawIV, rawAuthTag, rawContent, ...extra] = hash.split(':')
  if (
    extra.length > 0 ||
    version !== encryptedValuePrefix ||
    !/^[A-Za-z0-9_-]{16}$/.test(rawKeyID) ||
    !/^[A-Za-z0-9_-]{16}$/.test(rawIV) ||
    !/^[A-Za-z0-9_-]{22}$/.test(rawAuthTag) ||
    !/^[A-Za-z0-9_-]+$/.test(rawContent)
  ) {
    throw new Error('Invalid v3 ciphertext.')
  }

  const key = createKeyFromSecret(secret)
  if (createKeyID(key) !== rawKeyID) throw new Error('Ciphertext uses a different key.')

  const decipher = crypto.createDecipheriv(
    authenticatedAlgorithm,
    key,
    Buffer.from(rawIV, 'base64url'),
  )
  decipher.setAAD(createAuthenticatedContext(context))
  decipher.setAuthTag(Buffer.from(rawAuthTag, 'base64url'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(rawContent, 'base64url')),
    decipher.final(),
  ])
  return decrypted.toString()
}

export const getEncryptedValueVersion = (hash: string): 'legacy' | 'v2' | 'v3' => {
  if (hash.startsWith(`${encryptedValuePrefix}:`)) return 'v3'
  if (hash.startsWith(`${legacyAuthenticatedValuePrefix}:`)) return 'v2'
  return 'legacy'
}

export const decrypt = (hash: string, secret: string, context = ''): string => {
  if (!secret) throw new Error('[encrypted-fields] Payload secret is required.')
  const version = getEncryptedValueVersion(hash)
  if (version === 'v3') return decryptV3(hash, secret, context)
  if (version === 'v2') return decryptV2(hash, secret)
  return decryptLegacy(hash, secret)
}
