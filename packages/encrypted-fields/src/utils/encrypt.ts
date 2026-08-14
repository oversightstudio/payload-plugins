import crypto from 'node:crypto'
import {
  authenticatedAlgorithm,
  encryptedValuePrefix,
  keyDerivationDigest,
  keyDerivationInfo,
} from '../consts'

/** Key derivation used by the previously unreleased v2 envelope. */
export const createLegacyAuthenticatedKeyFromSecret = (secret: string): Buffer =>
  crypto.createHash('sha256').update(secret).digest()

export const createKeyFromSecret = (secret: string): Buffer =>
  Buffer.from(
    crypto.hkdfSync(
      keyDerivationDigest,
      Buffer.from(secret, 'utf8'),
      Buffer.alloc(0),
      Buffer.from(keyDerivationInfo, 'utf8'),
      32,
    ),
  )

export const createKeyID = (key: Buffer): string =>
  crypto.createHash('sha256').update(key).digest('base64url').slice(0, 16)

export const createAuthenticatedContext = (context = ''): Buffer =>
  Buffer.from(`${keyDerivationInfo}\0${context}`, 'utf8')

export const encrypt = (text: string, secret: string, context = ''): string => {
  if (!secret) throw new Error('[encrypted-fields] Payload secret is required.')
  const key = createKeyFromSecret(secret)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(authenticatedAlgorithm, key, iv)
  cipher.setAAD(createAuthenticatedContext(context))
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    encryptedValuePrefix,
    createKeyID(key),
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':')
}
