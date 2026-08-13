import crypto from 'node:crypto'
import { authenticatedAlgorithm, encryptedValuePrefix, legacyAlgorithm } from '../consts'
import { createKeyFromSecret } from './encrypt'

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

export const decrypt = (hash: string, secret: string): string => {
  if (!secret) throw new Error('[encrypted-fields] Payload secret is required.')
  if (!hash.startsWith(`${encryptedValuePrefix}:`)) return decryptLegacy(hash, secret)

  const [version, rawIV, rawAuthTag, rawContent] = hash.split(':')
  if (
    version !== encryptedValuePrefix ||
    !/^[a-f\d]{24}$/i.test(rawIV) ||
    !/^[a-f\d]{32}$/i.test(rawAuthTag) ||
    !/^[a-f\d]*$/i.test(rawContent) ||
    rawContent.length % 2 !== 0
  ) {
    throw new Error('Invalid authenticated ciphertext.')
  }

  const decipher = crypto.createDecipheriv(
    authenticatedAlgorithm,
    createKeyFromSecret(secret),
    Buffer.from(rawIV, 'hex'),
  )
  decipher.setAuthTag(Buffer.from(rawAuthTag, 'hex'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(rawContent, 'hex')),
    decipher.final(),
  ])
  return decrypted.toString()
}
