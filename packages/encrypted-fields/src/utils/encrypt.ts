import crypto from 'crypto'
import { algorithm } from '../consts'

// Add global type definition
declare global {
  var PAYLOAD_ENCRYPTED_FIELDS_SECRET: string | undefined
}

export const createKeyFromSecret = (secretKey: string): string =>
  crypto.createHash('sha256').update(secretKey).digest('hex').slice(0, 32)

export const encrypt = (text: string): string => {
  // Use global secret set by plugin or fall back to environment variable
  const secret = global.PAYLOAD_ENCRYPTED_FIELDS_SECRET || process.env.PAYLOAD_SECRET!
  
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(
    algorithm,
    createKeyFromSecret(secret),
    iv,
  )

  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])

  return `${iv.toString('hex')}${encrypted.toString('hex')}`
}
