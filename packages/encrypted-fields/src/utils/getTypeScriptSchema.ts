import type { EncryptedFieldOptions } from '../types'

type JSONSchema = Record<string, unknown> & {
  items?: JSONSchema
  type?: string | string[]
}

const nullableType = (type: string, required?: boolean): string | string[] =>
  required ? type : [type, 'null']

const optionValues = (field: EncryptedFieldOptions): string[] | undefined => {
  if (field.type !== 'radio' && field.type !== 'select') return undefined
  return field.options.map((option) => (typeof option === 'string' ? option : option.value))
}

const scalarSchema = (field: EncryptedFieldOptions): JSONSchema => {
  switch (field.type) {
    case 'checkbox':
      return { type: 'boolean' }
    case 'json': {
      const configuredSchema = 'jsonSchema' in field ? field.jsonSchema?.schema : undefined
      return (
        (configuredSchema as JSONSchema | undefined) ?? {
          type: ['object', 'array', 'string', 'number', 'boolean', 'null'],
        }
      )
    }
    case 'number':
      return { type: 'number' }
    case 'radio':
    case 'select':
      return { enum: optionValues(field), type: 'string' }
    default:
      return { type: 'string' }
  }
}

/** Restore the public value type while the database representation remains text. */
export const getEncryptedTypeScriptSchema = (
  field: EncryptedFieldOptions,
  jsonSchema: JSONSchema,
): JSONSchema => {
  const scalar = scalarSchema(field)
  const hasMany = 'hasMany' in field && field.hasMany === true

  if (hasMany) {
    return {
      ...jsonSchema,
      items: scalar,
      type: nullableType('array', field.required),
    }
  }

  if (field.type === 'json') {
    return {
      ...jsonSchema,
      ...scalar,
    }
  }

  return {
    ...jsonSchema,
    ...scalar,
    type: nullableType(scalar.type as string, field.required),
  }
}
