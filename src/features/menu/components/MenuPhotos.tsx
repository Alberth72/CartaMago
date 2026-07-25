import type { MenuPhoto } from '../../../data/restaurantSeed'

type MenuPhotosProps = {
  photos: MenuPhoto[]
}

export function MenuPhotos({ photos }: MenuPhotosProps) {
  if (photos.length === 0) return null

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Carta fisica de referencia</h2>
          <p className="mt-1 text-sm leading-6 text-stone-700">
            Fotos procesadas del menu original. La compra se hace desde las tarjetas para que el pedido llegue claro.
          </p>
        </div>
      </div>
      <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {photos.map((photo) => (
          <figure
            key={photo.id}
            className="w-[170px] shrink-0 overflow-hidden rounded-lg border border-amber-100 bg-white shadow-sm sm:w-[190px]"
          >
            <img src={photo.image} alt={`Foto del menu: ${photo.title}`} className="aspect-[3/4] w-full object-cover" />
            <figcaption className="px-3 py-2 text-sm font-black">{photo.title}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}