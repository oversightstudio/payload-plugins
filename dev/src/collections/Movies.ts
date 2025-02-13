import { CollectionConfig } from 'payload'

export const Movies: CollectionConfig = {
  slug: 'movies',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'movieUploader', 'duration'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'trailer',
      type: 'relationship',
      relationTo: 'movies',
    },
  ],
}
