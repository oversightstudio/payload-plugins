import crypto from 'crypto'
import { createKeyFromSecret } from './encrypt'
import { algorithm } from '../consts'

export const decrypt = (hash: string): string => {
  // Use global secret set by plugin or fall back to environment variable
  const secret = global.PAYLOAD_ENCRYPTED_FIELDS_SECRET || process.env.PAYLOAD_SECRET!
  
  const iv = hash.slice(0, 32)
  const content = hash.slice(32)

  const decipher = crypto.createDecipheriv(
    algorithm,
    createKeyFromSecret(secret),
    Buffer.from(iv, 'hex'),
  )

  const decrypted = Buffer.concat([decipher.update(Buffer.from(content, 'hex')), decipher.final()])

  return decrypted.toString()
}
