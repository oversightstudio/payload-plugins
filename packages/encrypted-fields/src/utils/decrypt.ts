import crypto from 'crypto'
import { createKeyFromSecret } from './encrypt'
import { algorithm } from '../consts'

export const decrypt = (hash: string): string => {
  const iv = hash.slice(0, 32)
  const content = hash.slice(32)

  const decipher = crypto.createDecipheriv(
    algorithm,
    createKeyFromSecret(process.env.PAYLOAD_SECRET!),
    Buffer.from(iv, 'hex'),
  )

  const decrypted = Buffer.concat([decipher.update(Buffer.from(content, 'hex')), decipher.final()])

  return decrypted.toString()
}
