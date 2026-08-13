import type { Config, Plugin } from 'payload'
import { CONTENT_GUARD_RUNTIME_KEY } from './constants'
import { createContentGuardGlobal } from './global'
import type { ContentGuardPluginOptions, ResolvedContentGuardOptions } from './types'

export const contentGuardPlugin =
  (pluginOptions: ContentGuardPluginOptions = {}): Plugin =>
  (incomingConfig: Config): Config => {
    if (pluginOptions.enabled === false) return incomingConfig

    const adminCollection = incomingConfig.admin?.user
    if (!adminCollection) {
      throw new Error(
        '[content-guard] Payload config.admin.user must identify the admin auth collection.',
      )
    }

    const signingSecret = pluginOptions.signingSecret ?? incomingConfig.secret
    if (!signingSecret) {
      throw new Error(
        '[content-guard] Payload config.secret or a custom signingSecret is required.',
      )
    }

    const rateLimit =
      pluginOptions.rateLimit === false
        ? false
        : {
            maxAttempts: pluginOptions.rateLimit?.maxAttempts ?? 10,
            windowMs: pluginOptions.rateLimit?.windowMs ?? 60_000,
            getClientIdentifier: pluginOptions.rateLimit?.getClientIdentifier,
          }
    if (rateLimit && (rateLimit.maxAttempts < 1 || rateLimit.windowMs < 1_000)) {
      throw new Error('[content-guard] rateLimit requires maxAttempts >= 1 and windowMs >= 1000.')
    }

    const resolved: ResolvedContentGuardOptions = {
      adminBypass: pluginOptions.adminBypass ?? true,
      allowedOrigins: [incomingConfig.serverURL, ...(pluginOptions.allowedOrigins ?? [])].filter(
        (origin): origin is string => Boolean(origin),
      ),
      enabled: true,
      noIndex: pluginOptions.noIndex ?? true,
      rateLimit,
      signingSecret,
    }

    return {
      ...incomingConfig,
      custom: {
        ...incomingConfig.custom,
        [CONTENT_GUARD_RUNTIME_KEY]: resolved,
      },
      globals: [
        ...(incomingConfig.globals ?? []),
        createContentGuardGlobal({
          adminCollection,
          defaultActive: pluginOptions.defaultActive ?? Boolean(pluginOptions.defaultPassword),
          defaultPassword: pluginOptions.defaultPassword,
          options: resolved,
        }),
      ],
    }
  }
