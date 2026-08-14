import { decryptValue } from '../utils/values'

export const decryptField = (value: unknown, secrets: string[], context = ''): unknown =>
  decryptValue(value, secrets, context)?.value
