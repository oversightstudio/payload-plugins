import type { EncryptedValueMigrationOptions, EncryptedValueVersion } from '../types'
import { decrypt, getEncryptedValueVersion } from './decrypt'
import { encrypt } from './encrypt'

export class EncryptedFieldDecryptionError extends Error {
  override name = 'EncryptedFieldDecryptionError'

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
  }
}

const uniqueSecrets = (secrets: string[]): string[] => [
  ...new Set(secrets.filter((secret) => secret.length > 0)),
]

export const encryptValue = (value: unknown, secret: string, context = ''): string | undefined => {
  if (value === undefined || value === null) return undefined
  return encrypt(JSON.stringify(value), secret, context)
}

export const decryptValue = (
  value: unknown,
  secrets: string[],
  context = '',
): { value: unknown; version: EncryptedValueVersion } | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') {
    throw new EncryptedFieldDecryptionError('Encrypted database value is not a string.')
  }

  const candidates = uniqueSecrets(secrets)
  if (candidates.length === 0) {
    throw new EncryptedFieldDecryptionError('No encryption secret is configured.')
  }

  let cause: unknown
  for (const secret of candidates) {
    try {
      return {
        value: JSON.parse(decrypt(value, secret, context)),
        version: getEncryptedValueVersion(value),
      }
    } catch (error) {
      cause = error
    }
  }

  throw new EncryptedFieldDecryptionError(
    'Ciphertext could not be decrypted with any configured secret.',
    { cause },
  )
}

/** Encrypt an existing plaintext value for use in a data migration. */
export const encryptPlaintextValue = (
  value: unknown,
  options: Pick<EncryptedValueMigrationOptions, 'context' | 'secret'>,
): string | undefined => encryptValue(value, options.secret, options.context)

/**
 * Upgrade a legacy, v2, or old-key ciphertext to the current envelope and secret.
 * The original ciphertext is never modified when decryption fails.
 */
export const migrateEncryptedValue = (
  value: unknown,
  options: EncryptedValueMigrationOptions,
): string | undefined => {
  if (value === undefined || value === null) return undefined
  const decrypted = decryptValue(
    value,
    [options.secret, ...(options.previousSecrets ?? [])],
    options.previousContext ?? options.context,
  )
  return encryptValue(decrypted?.value, options.secret, options.context)
}
