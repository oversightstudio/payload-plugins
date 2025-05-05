# Payload Encrypted Fields

## Install

```bash
pnpm add @oversightstudio/encrypted-fields @payloadcms/ui
```

## About
This package brings encrypted fields to Payload. It provides two ways to encrypt fields:

1. **Plugin Mode**: Automatically encrypt all supported fields in specified collections
2. **Field Mode**: Manually wrap individual fields with the `encryptedField` function

Both approaches use **AES-256-CTR** encryption with either a secret you provide in the plugin options or your `PAYLOAD_SECRET` environment variable.

The package automatically encrypts and decrypts field values using hooks, making it seamless to use in both the admin panel and API.

### Encryption
This package uses **AES-256-CTR** encryption, combined with your encryption secret and a random IV. The encrypted value is stored as a string in the database.

For a deeper dive into how this encryption works, check out [this blog post](https://payloadcms.com/posts/blog/the-power-of-encryption-and-decryption-safeguarding-data-privacy-with-payloads-hooks) by Payload. It explains the same encryption approach but for a simple text field. This package expands on that to support more field types and make integration seamless.

Since encryption fundamentally converts data into an unreadable format, this package JSON stringifies your data before encrypting it and automatically parses it back after decryption to retain its original data type.

### Tradeoffs
Using field encryption comes with some tradeoffs:  
- **Larger data size** – Encrypted values take up more space than raw values.  
- **No sorting or filtering** – Since the data is encrypted at rest, the database **cannot** sort or filter it.  
- **Performance overhead** – Encrypting and decrypting data adds some processing time.  

These tradeoffs are standard when working with encrypted data, but they're well worth it if protecting sensitive information is your goal.

## Usage

**Important:** Make sure to provide a secret key for encryption, either by setting the `PAYLOAD_SECRET` environment variable or by passing a `secret` option to the plugin.

### Plugin Mode (Recommended)

The easiest way to use encrypted fields is through the plugin. This automatically encrypts all supported fields in the collections you specify:

```tsx
// In your payload.config.ts
import { buildConfig } from 'payload/config'
import { encryptedFieldsPlugin } from '@oversightstudio/encrypted-fields'

export default buildConfig({
  // Your Payload config
  plugins: [
    encryptedFieldsPlugin({
      collections: ['users', 'customers', 'sensitive-data'],
      // Optional: specify which field types to encrypt (defaults to all supported types)
      fieldTypes: ['text', 'email', 'number'],
      // Optional: fields to exclude from encryption
      excludeFields: ['id', 'createdAt', 'updatedAt', 'username'],
      // Optional: provide a custom secret key (falls back to process.env.PAYLOAD_SECRET)
      secret: process.env.MY_CUSTOM_SECRET
    })
  ],
})
```

### Field Mode

For more granular control, you can wrap individual fields with the `encryptedField` function:

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

## Plugin Options

The `encryptedFieldsPlugin` accepts the following options:

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `enabled` | `boolean` | Enable or disable the plugin | `true` |
| `collections` | `string[]` | Array of collection slugs to apply encryption to | `[]` |
| `fieldTypes` | `string[]` | Field types to encrypt | All supported types |
| `excludeFields` | `string[]` | Fields to exclude from encryption | `['id', 'createdAt', 'updatedAt']` |
| `secret` | `string` | Secret key used for encryption | `process.env.PAYLOAD_SECRET` |

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

All other field types (like `ui`, `tabs`, etc.) are of course **not supported**, as they do not store user data that needs encryption. However, the plugin is smart enough to handle nested fields inside complex field types like `tabs`, `blocks`, `arrays`, and `groups`.

## Credits
* Shoutout to [Paul](https://github.com/paulpopus) for being a real one.