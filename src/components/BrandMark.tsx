type BrandMarkProps = {
  title?: string
  subtitle?: string
  compact?: boolean
  inverted?: boolean
}

export function BrandMark({
  title,
  subtitle,
  compact = false,
  inverted = false,
}: BrandMarkProps) {
  const markSize = compact ? 'size-10' : 'size-12'
  const iconSize = compact ? 'size-8' : 'size-10'
  const titleSize = compact ? 'text-lg' : 'text-xl'

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={`grid shrink-0 place-items-center rounded-full border shadow-sm ${markSize} ${
          inverted ? 'border-white/20 bg-amber-300 text-stone-950' : 'border-amber-200 bg-amber-300 text-stone-950'
        }`}
      >
        <svg viewBox="0 0 64 64" aria-hidden="true" className={iconSize}>
          <path
            d="M31.5 6c8.8 8.2 12.8 16 12.2 23.5 4.7-2 7.6-5.1 8.7-9.4 4.3 11.2.7 25-10.4 31.6-10.6 6.2-24.5 2.7-30.2-7.8C6.4 34 10.5 22.3 21.6 16.8c-1 5.4.1 9.6 3.3 12.6C25 21.4 27.2 13.6 31.5 6Z"
            fill="#dc2626"
          />
          <path
            d="M33.4 17.7c4.7 5.6 6.3 11 4.8 16.3 3.4-.7 6-2.4 7.8-5.1 1.2 7.2-2.2 15.5-9.7 19.5-7.8 4.1-17.7 1.4-21.2-6.5-3.1-6.9.2-15 7.2-18.7.2 4.7 2 8.1 5.3 10.2-.5-5.2 1.4-10.4 5.8-15.7Z"
            fill="#f59e0b"
          />
          <path
            d="M21.8 37.3c.4-8.6 7-15 15.4-15 5.9 0 10.9 3.2 13.4 7.9-3.3.5-5.9 1.7-7.8 3.5-2.2 2.1-3.8 5.1-4.7 9.2-6.5 2.1-12.6.2-16.3-5.6Z"
            fill="#fff7dc"
            stroke="#24130d"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M33.6 21.8c-.6-4.7 1.2-8.2 5.4-10.3 1.5 3.7.2 7.3-3.8 10.9l-1.6-.6Z" fill="#b91c1c" />
          <path d="M39.6 22.9c.2-4.1 2.5-6.9 6.8-8.4.8 4.2-1.3 7.2-6.2 9l-.6-.6Z" fill="#dc2626" />
          <circle cx="41.8" cy="31.1" r="2" fill="#24130d" />
          <path
            d="M48 35h8l-6.2 5.1c-1.6-1-2.2-2.7-1.8-5.1Z"
            fill="#fb923c"
            stroke="#24130d"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span className={`block truncate font-black leading-tight ${titleSize} ${inverted ? 'text-white' : 'text-stone-950'}`}>
          {title}
        </span>
        <span className={`block truncate text-sm font-bold ${inverted ? 'text-amber-100' : 'text-red-800'}`}>{subtitle}</span>
      </span>
    </div>
  )
}
