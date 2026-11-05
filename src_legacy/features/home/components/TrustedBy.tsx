import { trustedBrands } from '@/features/home/data/mockHomeData'

export function TrustedBy() {
  return (
    <section className="text-center space-y-6 pt-4 border-t border-border/30">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Được tin tưởng bởi các lãnh đạo ngành
      </p>

      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 md:gap-18 opacity-60 hover:opacity-85 transition-opacity">
        {trustedBrands.map((brand) => {
          const Icon = brand.icon
          return (
            <div
              key={brand.name}
              className="flex items-center gap-2.5 text-foreground font-semibold text-base sm:text-lg"
            >
              <Icon className="size-5 sm:size-6 text-muted-foreground" />
              <span>{brand.name}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
