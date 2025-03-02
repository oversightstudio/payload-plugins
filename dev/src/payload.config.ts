// storage-adapter-import-placeholder
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { blurDataUrlsPlugin } from '@oversightstudio/blur-data-urls'
import { muxVideoPlugin } from '@oversightstudio/mux-video'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Movies } from './collections/Movies'
import { SensitiveData } from './collections/SensitiveData'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    autoLogin: {
      email: "dev@email.com",
      password: "123",
    }
  },
  collections: [Users, Media, Movies, SensitiveData],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [
    blurDataUrlsPlugin({
      enabled: true,
      collections: [Media],
      blurOptions: {
        blur: 18,
        width: 32,
        height: 'auto',
      },
    }),
    muxVideoPlugin({
      enabled: true,
      initSettings: {
        tokenId: process.env.MUX_TOKEN_ID || '',
        tokenSecret: process.env.MUX_TOKEN_SECRET || '',
        webhookSecret: process.env.MUX_WEBHOOK_SIGNING_SECRET || '',
        jwtSigningKey: process.env.MUX_JWT_KEY_ID || '',
        jwtPrivateKey: process.env.MUX_JWT_KEY || '',
      },
      uploadSettings: {
        cors_origin: 'http://localhost:3000',
        new_asset_settings: {
          playback_policy: ['signed'],
        },
      },
    }),
  ],
})
