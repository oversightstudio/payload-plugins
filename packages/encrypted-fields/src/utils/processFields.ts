import { encryptedField, EncryptedFieldOptions } from '../fields/encryptedField'

/**
 * Process fields recursively to encrypt applicable fields
 */
export const processFields = (
  fields: any[],
  fieldTypesToEncrypt: Array<EncryptedFieldOptions['type']>,
  excludeFields: string[],
): any[] => {
  return fields.map((field) => {
    if (field.type === 'tabs' && Array.isArray(field.tabs)) {
      return {
        ...field,
        tabs: field.tabs.map((tab: any) => ({
          ...tab,
          fields: processFields(tab.fields, fieldTypesToEncrypt, excludeFields),
        })),
      }
    }

    if (
      field.fields &&
      (field.type === 'group' || field.type === 'array' || field.type === 'row')
    ) {
      return {
        ...field,
        fields: processFields(field.fields, fieldTypesToEncrypt, excludeFields),
      }
    }

    if (field.type === 'blocks' && Array.isArray(field.blocks)) {
      return {
        ...field,
        blocks: field.blocks.map((block: any) => ({
          ...block,
          fields: processFields(block.fields, fieldTypesToEncrypt, excludeFields),
        })),
      }
    }

    if (excludeFields.includes(field.name)) {
      return field
    }

    if (field.name && field.type && fieldTypesToEncrypt.includes(field.type)) {
      return encryptedField(field)
    }

    return field
  })
}
