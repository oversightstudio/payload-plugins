import crypto from 'node:crypto'
import { authenticatedAlgorithm, encryptedValuePrefix } from '../consts'

export const createKeyFromSecret = (secret: string): Buffer =>
  crypto.createHash('sha256').update(secret).digest()

export const encrypt = (text: string, secret: string): string => {
  if (!secret) throw new Error('[encrypted-fields] Payload secret is required.')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(authenticatedAlgorithm, createKeyFromSecret(secret), iv)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    encryptedValuePrefix,
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}
