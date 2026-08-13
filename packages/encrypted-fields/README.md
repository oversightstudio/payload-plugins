# Encrypted Fields Payload Plugin

## Install

```sh
pnpm add @oversightstudio/encrypted-fields @payloadcms/ui
```

## About

`encryptedField` wraps supported Payload fields with authenticated AES-256-GCM encryption at rest. Values are decrypted for authorized Payload reads and the admin UI while ciphertext remains in the database. Existing legacy AES-CTR values are read transparently and are upgraded when saved again.

## Payload Setup

No additional secret is required: encryption uses your configured Payload secret.

```tsx
import { encryptedField } from '@oversightstudio/encrypted-fields'
import type { CollectionConfig } from 'payload'

export const SensitiveData: CollectionConfig = {
  slug: 'sensitive-data',
  fields: [
    encryptedField({ name: 'name', type: 'text', required: true }),
    encryptedField({ name: 'traits', type: 'select', hasMany: true, options: ['fast', 'kind'] }),
  ],
}
```

## Supported Fields

`text`, `number`, `select`, `checkbox`, `email`, `date`, `json`, `textarea`, `code`, and `radio` are supported. Structural and rich-data fields such as `tabs`, `ui`, `point`, and `richText` are not.

## Security and Tradeoffs

- Versioned AES-256-GCM ciphertext detects tampering and incorrect secrets.
- A random nonce prevents identical values from producing identical ciphertext.
- Encrypted values cannot be meaningfully filtered, sorted, or indexed by the database.
- Losing or changing the Payload secret without migrating values makes them unreadable.
- Encryption protects data at rest; normal Payload access control still determines who may read decrypted values.
