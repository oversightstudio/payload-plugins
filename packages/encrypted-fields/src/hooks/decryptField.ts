import { decrypt } from '../utils/decrypt'

export const decryptField = (value: any) => {
  if (value === undefined || value === null) return undefined

  try {
    return JSON.parse(decrypt(value))
  } catch (e) {
    return undefined
  }
}
