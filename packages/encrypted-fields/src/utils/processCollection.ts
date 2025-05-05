import { CollectionConfig } from 'payload'
import { EncryptedFieldOptions } from '../fields/encryptedField'
import { processFields } from './processFields'

/**
 * Process a collection to encrypt specified field types
 */
export const processCollection = (
  collection: CollectionConfig,
  fieldTypesToEncrypt: Array<EncryptedFieldOptions['type']>,
  excludeFields: string[],
): CollectionConfig => {
  const processedCollection = { ...collection }

  if (processedCollection.fields) {
    processedCollection.fields = processFields(
      processedCollection.fields,
      fieldTypesToEncrypt,
      excludeFields,
    )
  }

  return processedCollection
}
