# Payload Encrypted Fields

## Install

`pnpm add @oversightstudio/encrypted-fields @payloadcms/ui`

## About
This package brings encrypted fields to Payload. It provides an `encryptedField` function that allows you to easily add encrypted fields to your collections.

It supports most field field types, including ones like `select` or `number` with `hasMany` enabled. Additionally, it fully integrates with Payload’s field customization options and lifecycle events, making it behave just like any other field—just encrypted.

The package automatically encrypts and decrypts field values using hooks, meaning you don’t need any extra setup to use encrypted fields in the admin panel or through the API.

### Encryption
This package uses **AES-256-CTR** encryption, combined with your `PAYLOAD_SECRET` and a random IV. The encrypted value is stored as a string in the database.

For a deeper dive into how this encryption works, check out [this blog post](https://payloadcms.com/posts/blog/the-power-of-encryption-and-decryption-safeguarding-data-privacy-with-payloads-hooks) by Payload. It explains the same encryption approach but for a simple text field. This package expands on that to support more field types and make integration seamless.

Since encryption fundamentally converts data into an unreadable format, this package JSON stringifies your data before encrypting it and automatically parses it back after decryption to retain it's original data type.  

### Tradeofs
Using field encryption comes with some tradeoffs:  
- **Larger data size** – Encrypted values take up more space than raw values.  
- **No sorting or filtering** – Since the data is encrypted at rest, the database **cannot** sort or filter it.  
- **Performance overhead** – Encrypting and decrypting data adds some processing time.  

These tradeoffs are standard when working with encrypted data, but they’re well worth it if protecting sensitive information is your goal.  

## Usage

**Important:** Make sure the `PAYLOAD_SECRET` environment variable is set before using this package.

```tsx
import { CollectionConfig } from 'payload'
import { encryptedField } from '@oversightstudio/encrypted-fields'

export const SensitiveDataCollection: CollectionConfig = {
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
      name: 'birthDate',
      type: 'date',
    }),
    encryptedField({
      name: 'traits',
      type: 'select',
      options: [
        { label: 'Awesome', value: 'awesome' },
        { label: 'Based', value: 'based' },
        { label: 'Goat', value: 'goat' },
      ],
      hasMany: true,
    }),
  ],
}
```

## Supported Field Types
| Field Type   | Supported |
|-------------|-----------|
| `text`      | ✅ Yes |
| `number`    | ✅ Yes |
| `select`    | ✅ Yes |
| `checkbox`  | ✅ Yes |
| `email`     | ✅ Yes |
| `date`      | ✅ Yes |
| `json`      | ✅ Yes |
| `textarea`  | ✅ Yes |
| `code`      | ✅ Yes |
| `radio`     | ✅ Yes |
| `point`     | ❌ Not yet supported |
| `richText`  | ❌ Not yet supported |

All other missing field types (like as `ui`, `tabs`, etc.) are of course **not supported**, as they do not store user data that needs encryption.  

## Credits
* Shoutout to [Paul](https://github.com/paulpopus) for being a real one.