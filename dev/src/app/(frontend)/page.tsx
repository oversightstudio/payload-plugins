import { PlaceholderImage } from '@oversightstudio/blur-data-urls/next'
import { getPayload } from 'payload'
import config from '@/payload.config'

async function Page() {
  const payload = await getPayload({ config })

  const images = await payload.find({
    collection: 'media',
  })

  return (
    <div>
      <p>Hello world</p>
      {images.docs.map((image) => (
        <div key={image.id}>
          <PlaceholderImage
            src={image.url!}
            width={image.width!}
            height={image.height!}
            alt={image.alt}
            placeholderDataURL={image.blurDataUrl}
            style={{
              width: 500,
              height: 500,
              objectFit: 'cover',
            }}
          />
        </div>
      ))}
    </div>
  )
}

export default Page
