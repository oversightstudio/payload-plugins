import type { FileData, PayloadRequest } from 'payload'

import type { PlaceholderInput } from '../types'

export type IncomingFile = {
  filename: string
  input?: PlaceholderInput
  mimeType: string
}

export function getIncomingFile({
  data,
  req,
}: {
  data: Partial<FileData>
  req: PayloadRequest
}): IncomingFile | undefined {
  const file = req.file
  if (!file) return undefined

  const input =
    Buffer.isBuffer(file.data) && file.data.length > 0 ? file.data : file.tempFilePath || undefined

  return {
    filename: data.filename || file.name || 'unknown',
    input,
    mimeType: data.mimeType || file.mimetype || '',
  }
}
