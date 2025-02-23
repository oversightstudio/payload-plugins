import type { Payload } from 'payload'
import type { MuxVideoPluginOptions } from '../types'

export const onInitExtension = (pluginOptions: MuxVideoPluginOptions, payload: Payload): void => {
  try {
  } catch (err: unknown) {
    payload.logger.error({ err, msg: 'Error in onInitExtension' })
  }
}
