import { Field } from 'payload'
import * as validationFunctions from 'payload/shared'

import { toPascalCase } from '../utils/toPascalCase'
import { decryptField } from '../hooks/decryptField'
import { encryptField } from '../hooks/encryptField'

export type EncryptedFieldOptions = Field & {
  type:
    | 'text'
    | 'number'
    | 'select'
    | 'checkbox'
    | 'email'
    | 'date'
    | 'json'
    | 'textarea'
    | 'code'
    | 'radio'
}

export const encryptedField = (data: EncryptedFieldOptions): Field => {
  let fieldComponentName = toPascalCase(data.type)

  switch (data.type) {
    case 'date':
      fieldComponentName = 'DateTime'
      break
    case 'json':
      fieldComponentName = 'JSON'
      break
    case 'radio':
      fieldComponentName = 'RadioGroup'
    default:
      break
  }

  return {
    ...data,
    type: 'text',
    validate: (encryptedValue: any, args: any) => {
      const value: any = decryptField(encryptedValue)

      return (validationFunctions as any)[data.type](value, args)
    },
    hooks: {
      ...data.hooks,
      beforeChange: [
        ...(data.hooks?.beforeChange ?? []),
        ({ value }) => {
          if ('hasMany' in data && data.hasMany && Array.isArray(value)) {
            return value.map((item: any) => encryptField(item))
          }

          return encryptField(value)
        },
      ],
      afterRead: [
        ...(data.hooks?.afterRead ?? []),
        ({ value }) => {
          if (Array.isArray(value)) {
            return value.map((item: any) => decryptField(item))
          }

          return decryptField(value)
        },
      ],
    },
    admin: {
      ...data.admin,
      components: {
        ...((data.admin?.components as any) ?? {}),
        Field: {
          path: `@payloadcms/ui#${fieldComponentName}Field`,
          ...((data.admin?.components?.Field as any) ?? {}),
        },
      },
    },
  }
}
