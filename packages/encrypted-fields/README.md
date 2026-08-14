# Encrypted Fields Payload Plugin

## Install

```sh
pnpm add @oversightstudio/encrypted-fields @payloadcms/ui
```

## About

`encryptedField` wraps supported Payload fields with authenticated encryption at rest. Authorized reads and the admin UI receive the original value while the database stores versioned ciphertext.

The default setup requires no collection, plugin registration, custom route, or additional environment variable. It derives an AES-256-GCM key from your configured Payload secret using HKDF-SHA256.

Existing values written by version 1 are read automatically. They are upgraded to the current format the next time the document is saved.

## Payload Setup

Use `encryptedField` anywhere you would normally declare a supported Payload field:

```tsx
import { encryptedField } from '@oversightstudio/encrypted-fields'
import type { CollectionConfig } from 'payload'

export const SensitiveData: CollectionConfig = {
  slug: 'sensitive-data',
  fields: [
    encryptedField({ name: 'name', type: 'text', required: true }),
    encryptedField({ name: 'age', type: 'number' }),
    encryptedField({
      name: 'traits',
      type: 'select',
      hasMany: true,
      options: ['fast', 'kind'],
    }),
  ],
}
```

Field access, validation, custom hooks, localization, drafts, versions, and admin component overrides continue to use normal Payload configuration. Consumer `beforeChange` and `afterRead` hooks receive plaintext values.

## Supported Fields

`text`, `number`, `select`, `checkbox`, `email`, `date`, `json`, `textarea`, `code`, and `radio` are supported.

Structural, relational, upload, and rich-data fields such as `array`, `blocks`, `group`, `relationship`, `upload`, `point`, and `richText` are not supported.

## Key Rotation

The simplest setup always uses the current Payload secret. When rotating that secret, bind the old value once and reuse the resulting field helper:

```tsx
import { createEncryptedField } from '@oversightstudio/encrypted-fields'

const encryptedField = createEncryptedField({
  previousSecrets: [process.env.OLD_PAYLOAD_SECRET!],
})

encryptedField({ name: 'apiToken', type: 'text' })
```

New writes use the current Payload secret. Reads accept the current secret, every `previousSecrets` entry, and the historical `PAYLOAD_SECRET` environment value when available. Remove an old secret only after every value using it has been re-saved or migrated.

A project can use a dedicated secret instead:

```tsx
const encryptedField = createEncryptedField({
  secret: process.env.ENCRYPTED_FIELDS_SECRET!,
  previousSecrets: [process.env.OLD_ENCRYPTED_FIELDS_SECRET!],
})
```

This is optional. Using the Payload secret remains the recommended zero-configuration default.

## Authenticated Context

For especially sensitive fields, an optional stable context prevents a valid ciphertext from being moved into a different logical field:

```tsx
encryptedField({ name: 'cardNumber', type: 'text' }, { context: 'billing-card-number' })
```

The context is authenticated but not stored. Keep it stable for the lifetime of the data. Changing it requires migrating existing values with `previousContext` set to the old value and `context` set to the new one.

## Decryption Failures

Unreadable or tampered ciphertext throws a contextual `EncryptedFieldDecryptionError` by default. The error identifies the collection/global and field path without including the ciphertext or secret. Failing loudly prevents corrupt data from looking like an empty field and then being overwritten.

The previous undefined behavior remains available only as an explicit compatibility escape hatch:

```tsx
encryptedField({ name: 'legacyValue', type: 'text' }, { onDecryptionError: 'undefined' })
```

Do not use that option for new sensitive data.

## Migrating Existing Data

No migration is required when upgrading encrypted values from version 1. Legacy AES-CTR values and the intermediate AES-GCM `v2` envelope remain permanently readable.

Two utilities are available for deliberate migrations that operate on raw database values:

```tsx
import { encryptPlaintextValue, migrateEncryptedValue } from '@oversightstudio/encrypted-fields'

const newlyEncrypted = encryptPlaintextValue(existingPlaintext, {
  secret: process.env.PAYLOAD_SECRET!,
})

const rotated = migrateEncryptedValue(existingCiphertext, {
  secret: process.env.PAYLOAD_SECRET!,
  previousSecrets: [process.env.OLD_PAYLOAD_SECRET!],
})
```

`encryptPlaintextValue` is for adopting encryption on an existing plaintext column. `migrateEncryptedValue` decrypts a legacy, v2, or old-key value and returns current ciphertext. Neither utility modifies the database. Back up the database, perform a dry run, and write the returned value only after the operation succeeds.

## Upgrade Safety

Version 2 is a deliberate major release because new saves cannot be read by version 1. Before upgrading:

1. Confirm the configured Payload secret matches the `PAYLOAD_SECRET` previously used to encrypt data, or keep the old value in `previousSecrets`.
2. Back up the database.
3. Deploy version 2 everywhere before removing any old secret.
4. Do not roll application code back to version 1 after version 2 has written data.

Forward upgrades do not require a bulk rewrite. Existing ciphertext remains untouched until its document is saved.

## Security and Tradeoffs

- AES-256-GCM detects tampering and incorrect secrets.
- HKDF-SHA256 separates this package's encryption key from other Payload-secret uses.
- A random 96-bit nonce prevents identical plaintext from producing identical ciphertext.
- Versioned envelopes and key identifiers support legacy reads and efficient rotation.
- Normal Payload access control still determines who may receive decrypted values.
- Encryption protects values at rest; it does not hide document metadata, field presence, or array length.
- Randomized ciphertext cannot be meaningfully filtered, sorted, or indexed by plaintext value.
- `unique` and `index` therefore do not enforce plaintext semantics and emit a configuration warning.
- `saveToJWT` emits a warning because it can place decrypted sensitive data in a signed but readable JWT.
- Losing every secret capable of reading a value makes that value unrecoverable.

Generated Payload TypeScript types reflect the original number, boolean, JSON, select, and array values rather than their text storage representation. Payload's generated GraphQL schema still sees the underlying text storage field; use the Local or REST API for non-string encrypted fields when exact GraphQL scalar types matter.

## Configuration

`encryptedField(field, config?)` accepts:

| Option              | Type                     | Default        | Description                                                         |
| ------------------- | ------------------------ | -------------- | ------------------------------------------------------------------- |
| `secret`            | `string`                 | Payload secret | Custom current secret for new writes and reads.                     |
| `previousSecrets`   | `string[]`               | `[]`           | Previous secrets accepted for reads during a rotation.              |
| `context`           | `string`                 | Package domain | Optional stable authenticated context for logical field binding.    |
| `onDecryptionError` | `'throw' \| 'undefined'` | `'throw'`      | Fail safely or retain the legacy missing-value fallback explicitly. |

Use `createEncryptedField(config)` to bind the same configuration once for multiple fields.
