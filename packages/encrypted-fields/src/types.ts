import type { Field } from 'payload'

export type SupportedEncryptedFieldType =
  | 'checkbox'
  | 'code'
  | 'date'
  | 'email'
  | 'json'
  | 'number'
  | 'radio'
  | 'select'
  | 'text'
  | 'textarea'

/** A supported Payload field before its database representation is encrypted. */
export type EncryptedFieldOptions = Extract<Field, { type: SupportedEncryptedFieldType }>

export type DecryptionErrorBehavior = 'throw' | 'undefined'

export type EncryptedFieldConfig = {
  /**
   * Optional stable authenticated context. Use this to prevent ciphertext from being
   * moved between logical fields. Changing it requires re-encrypting existing values.
   */
  context?: string

  /** @default 'throw' */
  onDecryptionError?: DecryptionErrorBehavior

  /** Old secrets accepted for reads during a rotation. New writes use `secret`. */
  previousSecrets?: string[]

  /** Custom current secret. Defaults to the configured Payload secret. */
  secret?: string
}

export type EncryptedValueMigrationOptions = {
  context?: string
  /** Context currently authenticating the source value when it differs from `context`. */
  previousContext?: string
  previousSecrets?: string[]
  secret: string
}

export type EncryptedValueVersion = 'legacy' | 'v2' | 'v3'
