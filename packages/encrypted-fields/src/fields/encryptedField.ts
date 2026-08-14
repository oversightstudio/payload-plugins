import type { FieldHook, TextField } from 'payload'
import * as validationFunctions from 'payload/shared'
import { decryptField } from '../hooks/decryptField'
import { encryptField } from '../hooks/encryptField'
import type { EncryptedFieldConfig, EncryptedFieldOptions } from '../types'
import { EncryptedFieldDecryptionError } from '../utils/values'
import { getEncryptedTypeScriptSchema } from '../utils/getTypeScriptSchema'
import { toPascalCase } from '../utils/toPascalCase'

const getSecrets = (
  configuredPayloadSecret: string,
  runtimePayloadSecret: string,
  config: EncryptedFieldConfig,
): string[] => {
  const legacyEnvironmentSecret = process.env.PAYLOAD_SECRET
  return [
    // Published v1 always used this environment variable directly, so prefer it for
    // unauthenticated legacy ciphertext when it differs from Payload's configured secret.
    ...(legacyEnvironmentSecret ? [legacyEnvironmentSecret] : []),
    config.secret ?? configuredPayloadSecret,
    ...(config.previousSecrets ?? []),
    // The prerelease v2 implementation used Payload's hashed runtime secret.
    runtimePayloadSecret,
  ].filter((secret, index, values) => Boolean(secret) && values.indexOf(secret) === index)
}

const warnAboutUnsafeOptions = (field: EncryptedFieldOptions): void => {
  const prefix = `[encrypted-fields] ${field.name}`
  if (field.index || field.unique) {
    console.warn(
      `${prefix}: index and unique operate on randomized ciphertext, not the plaintext value.`,
    )
  }
  if (field.saveToJWT) {
    console.warn(`${prefix}: saveToJWT can copy the decrypted value into a readable JWT.`)
  }
}

export const encryptedField = (
  data: EncryptedFieldOptions,
  config: EncryptedFieldConfig = {},
): TextField => {
  warnAboutUnsafeOptions(data)

  let fieldComponentName = toPascalCase(data.type)
  if (data.type === 'date') fieldComponentName = 'DateTime'
  if (data.type === 'json') fieldComponentName = 'JSON'
  if (data.type === 'radio') fieldComponentName = 'RadioGroup'

  const decryptStoredValue = (
    value: unknown,
    payloadSecrets: { configured: string; runtime: string },
    location: {
      collection?: { slug?: string } | null
      global?: { slug?: string } | null
      schemaPath?: string[]
    },
  ): unknown => {
    try {
      const secrets = getSecrets(payloadSecrets.configured, payloadSecrets.runtime, config)
      if (Array.isArray(value)) {
        return value.map((item) => decryptField(item, secrets, config.context))
      }
      return decryptField(value, secrets, config.context)
    } catch (error) {
      if (config.onDecryptionError === 'undefined') return undefined

      const entity = location.collection?.slug ?? location.global?.slug ?? 'unknown-entity'
      const path =
        location.schemaPath && location.schemaPath.length > 0
          ? location.schemaPath.join('.')
          : data.name
      throw new EncryptedFieldDecryptionError(
        `[encrypted-fields] Unable to decrypt ${entity}.${path}. The value was not modified.`,
        { cause: error },
      )
    }
  }

  const decryptHook: FieldHook = ({ collection, global, req, schemaPath, value }) =>
    decryptStoredValue(
      value,
      { configured: req.payload.config.secret, runtime: req.payload.secret },
      { collection, global, schemaPath },
    )

  const encryptHook: FieldHook = ({ req, value }) => {
    const secret = config.secret ?? req.payload.config.secret
    if ('hasMany' in data && data.hasMany && Array.isArray(value)) {
      return value.map((item) => encryptField(item, secret, config.context))
    }
    return encryptField(value, secret, config.context)
  }

  const nativeValidate = validationFunctions[data.type] as
    ((value: unknown, args: unknown) => Promise<string | true> | string | true) | undefined
  const validate = async (
    value: unknown,
    args: {
      collection?: { slug?: string } | null
      global?: { slug?: string } | null
      req: { payload: { config: { secret: string }; secret: string } }
      schemaPath?: string[]
    },
  ): Promise<string | true> => {
    const plaintext = decryptStoredValue(
      value,
      {
        configured: args.req.payload.config.secret,
        runtime: args.req.payload.secret,
      },
      args,
    )
    const validator = (data.validate as typeof nativeValidate | undefined) ?? nativeValidate
    return (await validator?.(plaintext, { ...args, ...data, req: args.req })) ?? true
  }
  const encryptedTypeScriptSchema = ({ jsonSchema }: { jsonSchema: Record<string, unknown> }) =>
    getEncryptedTypeScriptSchema(data, jsonSchema)

  return {
    ...data,
    type: 'text',
    typescriptSchema: [encryptedTypeScriptSchema, ...(data.typescriptSchema ?? [])],
    validate: validate as TextField['validate'],
    hooks: {
      ...data.hooks,
      beforeChange: [...(data.hooks?.beforeChange ?? []), encryptHook],
      // Downstream hooks receive plaintext, matching a normal Payload field.
      afterRead: [decryptHook, ...(data.hooks?.afterRead ?? [])],
    },
    admin: {
      ...data.admin,
      components: {
        ...(data.admin?.components ?? {}),
        Field: data.admin?.components?.Field ?? {
          path: `@payloadcms/ui#${fieldComponentName}Field`,
        },
      },
    },
  } as TextField
}

/** Bind shared rotation or error-handling settings once and reuse them across fields. */
export const createEncryptedField =
  (config: EncryptedFieldConfig = {}) =>
  (data: EncryptedFieldOptions): TextField =>
    encryptedField(data, config)
