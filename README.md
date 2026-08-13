# Oversight Payload Plugins

Production-focused plugins for [Payload](https://payloadcms.com/) maintained by [Oversight Studio](https://oversight.studio/).

## Packages

| Package                                                           | Purpose                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`@oversightstudio/content-guard`](packages/content-guard/)       | Headless password protection for client previews and private sites. |
| [`@oversightstudio/blur-data-urls`](packages/blur-data-urls/)     | Generate image placeholders when media is uploaded.                 |
| [`@oversightstudio/encrypted-fields`](packages/encrypted-fields/) | Encrypt supported Payload field values at rest.                     |
| [`@oversightstudio/mux-video`](packages/mux-video/)               | Upload, manage, and play Mux video through Payload.                 |

## Development

```sh
pnpm install
pnpm check
```

Each package is independently versioned and published through Changesets. See its README for setup, options, and security notes.
