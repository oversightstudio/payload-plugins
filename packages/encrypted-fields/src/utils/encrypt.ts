import crypto from 'crypto'
import { algorithm } from '../consts'

export const createKeyFromSecret = (secretKey: string): string =>
  crypto.createHash('sha256').update(secretKey).digest('hex').slice(0, 32)

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(
    algorithm,
    createKeyFromSecret(process.env.PAYLOAD_SECRET!),
    iv,
  )

  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])

  return `${iv.toString('hex')}${encrypted.toString('hex')}`
}
