import { ArrowDown, Flame, MessageCircle, Sparkles } from 'lucide-react'
import type { RestaurantProfile } from '../../../data/restaurantSeed'

type MenuHeroProps = {
  restaurant: RestaurantProfile
}

const defaultHeroImage = '/client-assets/brasas-sazon/processed/product-placeholder-preparing.png'

export function MenuHero({ restaurant }: MenuHeroProps) {
  const heroImage = restaurant.heroImage || defaultHeroImage

  return (
    <section className="relative overflow-hidden bg-stone-950 text-white">
      <img
        src={heroImage}
        alt={`Cocina lista para preparar pedidos de ${restaurant.shortName}`}
        className="absolute inset-0 h-full w-full object-cover opacity-95"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,10,9,0.94),rgba(28,25,23,0.72),rgba(127,29,29,0.2))]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#fff8ed] to-transparent" />
      <div className="relative mx-auto flex min-h-[430px] max-w-6xl flex-col justify-between px-4 py-5 sm:px-6 lg:min-h-[480px] lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-full bg-amber-400 text-stone-950">
              <Flame size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-200">{restaurant.shortName}</p>
              <p className="text-xs text-stone-200">{restaurant.location}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/14 px-3 py-2 text-sm font-semibold backdrop-blur">
            <Sparkles size={15} aria-hidden="true" />
            CartaMago
          </div>
        </header>

        <div className="max-w-2xl pb-10 pt-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/12 px-3 py-2 text-sm font-black text-amber-100 backdrop-blur">
            <Sparkles size={15} aria-hidden="true" />
            Carta digital lista para ordenar
          </span>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">{restaurant.name}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-stone-100 sm:text-lg">{restaurant.description}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href="#menu"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 py-2 text-sm font-black text-stone-950 shadow-lg shadow-amber-950/20 transition hover:-translate-y-0.5 hover:bg-amber-200 active:translate-y-0"
            >
              Ver menu
              <ArrowDown size={17} aria-hidden="true" />
            </a>
            <a
              href="#pedido"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/18 bg-white/12 px-4 py-2 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/18 active:translate-y-0"
            >
              <MessageCircle size={17} aria-hidden="true" />
              Tu pedido
            </a>
          </div>

          <div className="mt-6 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              ['Ordena', 'En 1 minuto'],
              ['Canal', 'WhatsApp'],
              ['Redes', restaurant.socialHandle],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/12 bg-white/12 px-3 py-2 shadow-sm shadow-stone-950/20 backdrop-blur">
                <p className="text-xs font-bold text-amber-100">{label}</p>
                <p className="truncate text-sm font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
