import { decrypt } from '../utils/decrypt'

export const decryptField = (value: unknown, secret: string): unknown => {
  if (value === undefined || value === null || typeof value !== 'string') return undefined
  try {
    return JSON.parse(decrypt(value, secret))
  } catch {
    return undefined
  }
}
