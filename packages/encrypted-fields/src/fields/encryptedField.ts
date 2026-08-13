import type { Field, FieldHook, TextField } from 'payload'
import * as validationFunctions from 'payload/shared'
import { decryptField } from '../hooks/decryptField'
import { encryptField } from '../hooks/encryptField'
import { toPascalCase } from '../utils/toPascalCase'

type SupportedType =
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

export type EncryptedFieldOptions = Extract<Field, { type: SupportedType }>

export const encryptedField = (data: EncryptedFieldOptions): TextField => {
  let fieldComponentName = toPascalCase(data.type)
  if (data.type === 'date') fieldComponentName = 'DateTime'
  if (data.type === 'json') fieldComponentName = 'JSON'
  if (data.type === 'radio') fieldComponentName = 'RadioGroup'

  const decryptHook: FieldHook = ({ req, value }) => {
    if (Array.isArray(value)) return value.map((item) => decryptField(item, req.payload.secret))
    return decryptField(value, req.payload.secret)
  }
  const encryptHook: FieldHook = ({ req, value }) => {
    if ('hasMany' in data && data.hasMany && Array.isArray(value)) {
      return value.map((item) => encryptField(item, req.payload.secret))
    }
    return encryptField(value, req.payload.secret)
  }
  const nativeValidate = validationFunctions[data.type] as
    ((value: unknown, args: unknown) => Promise<string | true> | string | true) | undefined

  return {
    ...data,
    type: 'text',
    validate:
      data.validate ?? ((value: unknown, args: unknown) => nativeValidate?.(value, args) ?? true),
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
