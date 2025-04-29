import { PayloadRequest } from 'payload'

export const defaultAccessFunction = (request: PayloadRequest) => {
  if (!request.user || request.user?.collection !== request.payload.config.admin.user) {
    return false
  }

  return true
}
