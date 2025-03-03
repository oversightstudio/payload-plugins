import { DefaultCellComponentProps } from 'payload'

export function MuxVideoGifCell(props: DefaultCellComponentProps) {
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
      src={playbackOption.gifUrl}
    />
  )
}

export default MuxVideoGifCell
