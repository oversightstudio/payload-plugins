import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { sql, sqliteAdapter } from '@payloadcms/db-sqlite'
import { buildConfig, configToJSONSchema, getPayload } from 'payload'

import { encryptedField } from '../src/fields/encryptedField'

const legacyEncrypt = (value: unknown, secret: string): string => {
  const iv = Buffer.alloc(16, 7)
  const key = crypto.createHash('sha256').update(secret).digest('hex').slice(0, 32)
  const cipher = crypto.createCipheriv('aes-256-ctr', key, iv)
  const text = JSON.stringify(value)
  return `${iv.toString('hex')}${Buffer.concat([cipher.update(text), cipher.final()]).toString('hex')}`
}

test('real Payload storage encrypts data while Local API reads restore original values', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'encrypted-fields-'))
  const databasePath = path.join(directory, 'payload.db')
  const config = await buildConfig({
    collections: [
      {
        slug: 'vault',
        access: { read: () => true },
        versions: { drafts: true },
        fields: [
          encryptedField({ name: 'name', type: 'text', required: true }),
          encryptedField({ name: 'localizedName', type: 'text', localized: true }),
          encryptedField({ name: 'age', type: 'number' }),
          encryptedField({ name: 'enabled', type: 'checkbox' }),
          encryptedField({ name: 'traits', type: 'select', hasMany: true, options: ['a', 'b'] }),
          encryptedField({ name: 'metadata', type: 'json' }),
          encryptedField({
            name: 'restricted',
            type: 'text',
            access: { read: () => false },
          }),
        ],
      },
    ],
    db: sqliteAdapter({ client: { url: `file:${databasePath}` } }),
    localization: { defaultLocale: 'en', locales: ['en', 'fr'] },
    secret: 'integration-payload-secret',
  })
  const payload = await getPayload({ config })

  try {
    assert.equal(payload.config.secret, 'integration-payload-secret')
    assert.notEqual(payload.secret, payload.config.secret)
    const generatedSchema = configToJSONSchema(payload.config, 'number')
    const generatedFields = (
      generatedSchema.definitions?.vault as { properties?: Record<string, Record<string, unknown>> }
    )?.properties
    assert.equal(generatedFields?.name?.type, 'string')
    assert.deepEqual(generatedFields?.age?.type, ['number', 'null'])
    assert.deepEqual(generatedFields?.enabled?.type, ['boolean', 'null'])
    assert.deepEqual(generatedFields?.traits?.type, ['array', 'null'])
    assert.deepEqual((generatedFields?.traits?.items as { enum?: string[] })?.enum, ['a', 'b'])

    const created = await payload.create({
      collection: 'vault',
      data: {
        age: 42,
        enabled: false,
        metadata: { nested: [1, true] },
        localizedName: 'English secret',
        name: 'Ada',
        restricted: 'hidden',
        traits: ['a', 'b'],
      },
      overrideAccess: true,
      locale: 'en',
    })

    assert.equal(created.name, 'Ada')
    assert.equal(created.age, 42)
    assert.equal(created.enabled, false)
    assert.deepEqual(created.metadata, { nested: [1, true] })
    assert.deepEqual(created.traits, ['a', 'b'])
    assert.equal(created.localizedName, 'English secret')

    await payload.update({
      collection: 'vault',
      id: created.id,
      data: { localizedName: 'Secret français' },
      locale: 'fr',
      overrideAccess: true,
    })
    const english = await payload.findByID({
      collection: 'vault',
      id: created.id,
      locale: 'en',
      overrideAccess: true,
    })
    const french = await payload.findByID({
      collection: 'vault',
      id: created.id,
      locale: 'fr',
      overrideAccess: true,
    })
    assert.equal(english.localizedName, 'English secret')
    assert.equal(french.localizedName, 'Secret français')

    const rawRows = await payload.db.drizzle.run(
      sql`SELECT name, age, enabled, metadata, restricted FROM vault WHERE id = ${created.id}`,
    )
    const raw = rawRows.rows[0] as Record<string, unknown>
    for (const field of ['name', 'age', 'enabled', 'metadata', 'restricted']) {
      assert.equal(typeof raw[field], 'string')
      assert.match(raw[field] as string, /^v3:/)
    }

    const versionRows = await payload.db.drizzle.run(sql`SELECT * FROM _vault_v`)
    assert.ok(versionRows.rows.length > 0)
    assert.ok(
      Object.values(versionRows.rows[0] as Record<string, unknown>).some(
        (value) => typeof value === 'string' && value.startsWith('v3:'),
      ),
    )

    const protectedRead = await payload.findByID({
      collection: 'vault',
      id: created.id,
      overrideAccess: false,
    })
    assert.equal(protectedRead.name, 'Ada')
    assert.equal('restricted' in protectedRead, false)

    await payload.db.drizzle.run(
      sql`UPDATE vault SET name = ${legacyEncrypt('Legacy Ada', 'integration-payload-secret')} WHERE id = ${created.id}`,
    )
    const legacyRead = await payload.findByID({
      collection: 'vault',
      id: created.id,
      overrideAccess: true,
    })
    assert.equal(legacyRead.name, 'Legacy Ada')

    await payload.update({
      collection: 'vault',
      id: created.id,
      data: { age: 43 },
      overrideAccess: true,
    })
    const upgradedRows = await payload.db.drizzle.run(
      sql`SELECT name FROM vault WHERE id = ${created.id}`,
    )
    const storedName = String((upgradedRows.rows[0] as Record<string, unknown>).name)
    assert.match(storedName, /^v3:/)

    const tamperedName = `${storedName.slice(0, -1)}${storedName.endsWith('A') ? 'B' : 'A'}`
    await payload.db.drizzle.run(
      sql`UPDATE vault SET name = ${tamperedName} WHERE id = ${created.id}`,
    )
    await assert.rejects(
      () => payload.findByID({ collection: 'vault', id: created.id, overrideAccess: true }),
      /Unable to decrypt vault\.name/,
    )
  } finally {
    await payload.destroy()
    await rm(directory, { force: true, recursive: true })
  }
})
