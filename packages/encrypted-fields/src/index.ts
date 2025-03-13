import type { Config, CollectionConfig } from 'payload'
import { encryptedField, EncryptedFieldOptions } from './fields/encryptedField'
import { processCollection } from './utils/processCollection'

export { encryptedField } from './fields/encryptedField'

export interface EncryptedFieldsPluginOptions {
  /**
   * Enable or disable the plugin
   * @default true
   */
  enabled?: boolean

  /**
   * Collections to encrypt fields in
   * @example ['users', 'customers']
   */
  collections?: string[]

  /**
   * Field types to encrypt
   * If not specified, all supported field types will be encrypted
   * @example ['text', 'email']
   */
  fieldTypes?: Array<EncryptedFieldOptions['type']>

  /**
   * Field names to exclude from encryption
   * @example ['id', 'createdAt', 'updatedAt']
   */
  excludeFields?: string[]

  /**
   * Secret key used for encryption
   * If not specified, falls back to process.env.PAYLOAD_SECRET
   * @example 'your-secret-key-here'
   */
  secret?: string
}

const defaultOptions: Partial<EncryptedFieldsPluginOptions> = {
  enabled: true,
  excludeFields: ['id', 'createdAt', 'updatedAt'],
}

const supportedFieldTypes: Array<EncryptedFieldOptions['type']> = [
  'text',
  'number',
  'select',
  'checkbox',
  'email',
  'date',
  'json',
  'textarea',
  'code',
  'radio',
]

export const encryptedFieldsPlugin =
  (pluginOptions: EncryptedFieldsPluginOptions = {}) =>
  (incomingConfig: Config): Config => {
    const options = { ...defaultOptions, ...pluginOptions }

    // If plugin is disabled, return unmodified config
    if (options.enabled === false) {
      return incomingConfig
    }

    // Create a copy of the config to modify
    const config = { ...incomingConfig }

    // Check for encryption secret - either from options or environment variable
    const secret = options.secret || process.env.PAYLOAD_SECRET

    // If no secret available, warn and return unmodified config
    if (!secret) {
      console.warn(
        'WARNING: No encryption secret provided. Please set the secret option or PAYLOAD_SECRET environment variable. Encrypted fields will not work properly.',
      )
      return incomingConfig
    }

    // Store the secret in global context for the encryption/decryption utilities to use
    global.PAYLOAD_ENCRYPTED_FIELDS_SECRET = secret

    // If no collections specified, return unmodified config
    if (!options.collections || options.collections.length === 0) {
      return incomingConfig
    }

    // Use specified field types or all supported types
    const fieldTypesToEncrypt = options.fieldTypes || supportedFieldTypes

    // Process each collection
    if (config.collections) {
      config.collections = config.collections.map((collection) => {
        // Skip collections not specified in options
        if (!options.collections?.includes(collection.slug)) {
          return collection
        }

        return processCollection(collection, fieldTypesToEncrypt, options.excludeFields || [])
      })
    }

    return config
  }
