import { DefaultCellComponentProps } from 'payload'

export function MuxUploaderCell(props: DefaultCellComponentProps) {
  const row = props.rowData

  const playbackOption = row?.playbackOptions?.[0]

  if (!playbackOption) {
    return <>Preview not available.</>
  }

  return (
    <img
      style={{ width: 80, height: 80, objectFit: 'cover' }}
      loading="lazy"
      alt={row?.title}
      src={playbackOption.posterUrl}
    />
  )
}

export default MuxUploaderCell
