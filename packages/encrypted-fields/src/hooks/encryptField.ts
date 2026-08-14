import { encryptValue } from '../utils/values'

export const encryptField = (value: unknown, secret: string, context = '') =>
  encryptValue(value, secret, context)
