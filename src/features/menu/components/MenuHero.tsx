import { Flame } from 'lucide-react'
import type { RestaurantProfile } from '../../../data/restaurantSeed'

type MenuHeroProps = {
  restaurant: RestaurantProfile
}

export function MenuHero({ restaurant }: MenuHeroProps) {
  return (
    <section className="relative overflow-hidden bg-stone-950 text-white">
      <img
        src={restaurant.heroImage}
        alt="Logo de Brasas & Sazon en la carta fisica"
        className="absolute inset-0 h-full w-full object-cover opacity-75"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,10,9,0.88),rgba(12,10,9,0.55),rgba(127,29,29,0.3))]" />
      <div className="relative mx-auto flex min-h-[390px] max-w-6xl flex-col justify-between px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-full bg-amber-400 text-stone-950">
              <Flame size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-200">{restaurant.shortName}</p>
              <p className="text-xs text-stone-200">{restaurant.location}</p>
            </div>
          </div>
          <div className="rounded-full bg-white/14 px-3 py-2 text-sm font-semibold backdrop-blur">
            Menu QR
          </div>
        </header>

        <div className="max-w-2xl pb-5 pt-14">
          <p className="text-sm font-semibold text-amber-200">{restaurant.location}</p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">{restaurant.name}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-stone-100 sm:text-lg">{restaurant.description}</p>
          <div className="mt-5 grid max-w-xl grid-cols-3 gap-2">
            <div className="rounded-md border border-white/12 bg-white/12 px-3 py-2 backdrop-blur">
              <p className="text-xs font-bold text-amber-100">Ordena</p>
              <p className="text-sm font-black">En 1 minuto</p>
            </div>
            <div className="rounded-md border border-white/12 bg-white/12 px-3 py-2 backdrop-blur">
              <p className="text-xs font-bold text-amber-100">Canal</p>
              <p className="text-sm font-black">WhatsApp</p>
            </div>
            <div className="rounded-md border border-white/12 bg-white/12 px-3 py-2 backdrop-blur">
              <p className="text-xs font-bold text-amber-100">Redes</p>
              <p className="truncate text-sm font-black">{restaurant.socialHandle}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}