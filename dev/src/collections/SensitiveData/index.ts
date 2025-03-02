import { encryptedField } from '@oversightstudio/encrypted-fields'
import { CollectionConfig } from 'payload'

export const SensitiveData: CollectionConfig = {
  slug: 'sensitive-data',
  fields: [
    encryptedField({
      name: 'name',
      type: 'text',
    }),
    encryptedField({
      name: 'age',
      type: 'number',
    }),
    encryptedField({
      name: 'favoriteAges',
      type: 'number',
      hasMany: true,
    }),
    encryptedField({
      name: 'gender',
      type: 'select',
      options: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' },
      ],
    }),
    encryptedField({
      name: 'traits',
      type: 'select',
      options: [
        { label: 'Cool', value: 'cool' },
        { label: 'Based', value: 'based' },
        { label: 'Sexy', value: 'sexy' },
      ],
      hasMany: true,
    }),
    encryptedField({
      name: 'auraFarmer',
      type: 'checkbox',
    }),
    encryptedField({
      name: 'birthDate',
      type: 'date',
    }),
    encryptedField({
      name: 'jsonData',
      type: 'json',
    }),
    encryptedField({
      name: 'description',
      type: 'textarea',
    }),
    encryptedField({
      name: 'favoriteCode',
      type: 'code',
    }),
    encryptedField({
      name: 'powerLevel',
      type: 'radio',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
      ],
    }),
  ],
}
