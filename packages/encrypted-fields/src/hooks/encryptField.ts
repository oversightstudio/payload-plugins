import { encrypt } from '../utils/encrypt'

export const encryptField = (value: unknown, secret: string) => {
  if (value === undefined || value === null) return undefined
  return encrypt(JSON.stringify(value), secret)
}
