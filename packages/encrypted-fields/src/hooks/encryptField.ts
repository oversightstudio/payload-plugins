import { encrypt } from '../utils/encrypt'

export const encryptField = (value: any) => {
  if (value === undefined || value === null) return undefined

  return encrypt(JSON.stringify(value))
}
