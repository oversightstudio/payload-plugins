import { getPayload } from 'payload'
import config from '@/payload.config'
import Image from 'next/image'

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
          <Image
            key={image.id}
            src={image.url!}
            placeholder="blur"
            width={image.width!}
            height={image.height!}
            alt={image.alt}
            blurDataURL={image.blurDataUrl ?? undefined}
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
