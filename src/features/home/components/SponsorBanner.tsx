import { useState } from 'react'
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Tag,
  Megaphone
} from 'lucide-react'
import {
  mockSponsorAds,
  type SponsorAd
} from '@/features/home/data/mockSponsors'

export function SponsorBanner() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentAd: SponsorAd = mockSponsorAds[currentIndex]

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % mockSponsorAds.length)
  }

  const prevSlide = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + mockSponsorAds.length) % mockSponsorAds.length
    )
  }

  return (
    <section id="sponsors" className="relative">
      {/* Header / Section label */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Megaphone className="size-3.5 text-primary" />
          <span>Tin tức & Ưu đãi Đối tác Tài trợ</span>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground mr-2 hidden sm:inline">
            {currentIndex + 1} / {mockSponsorAds.length}
          </span>
          <button
            type="button"
            onClick={prevSlide}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Quảng cáo trước"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Quảng cáo kế tiếp"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Main Horizontal Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-r from-card via-card/90 to-primary/5 p-5 sm:p-7 shadow-xl backdrop-blur-md">
        {/* Background ambient gradient glow */}
        <div className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Column: Text info and CTA */}
          <div className="md:col-span-7 space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Badge */}
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  currentAd.badgeColor ||
                  'bg-primary/20 text-primary border-primary/30'
                }`}
              >
                {currentAd.badgeText}
              </span>

              {/* Sponsor Name */}
              <span className="text-xs font-medium text-muted-foreground">
                Được tài trợ bởi{' '}
                <strong className="text-foreground">
                  {currentAd.sponsorName}
                </strong>
              </span>
            </div>

            {/* Title */}
            <h3 className="text-lg sm:text-xl md:text-2xl font-black text-foreground tracking-tight leading-snug">
              {currentAd.title}
            </h3>

            {/* Description */}
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {currentAd.subtitle}
            </p>

            {/* Discount Code & CTA */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {currentAd.discountCode && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-xs text-primary font-mono font-semibold">
                  <Tag className="size-3.5" />
                  Mã: {currentAd.discountCode}
                </div>
              )}

              <a
                href={currentAd.ctaLink}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95"
              >
                {currentAd.ctaText}
                <ExternalLink className="size-3.5" />
              </a>

              <a
                href="#contact"
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 ml-1"
              >
                Liên hệ tài trợ?
              </a>
            </div>
          </div>

          {/* Right Column: Visual Advertisement Thumbnail */}
          <div className="md:col-span-5">
            <div className="group relative aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-muted/40 shadow-inner">
              <img
                src={currentAd.imageUrl}
                alt={currentAd.title}
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/90 bg-black/50 px-2 py-0.5 rounded backdrop-blur">
                  Sponsored Spotlight
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel indicator dots */}
        <div className="flex items-center justify-center gap-1.5 mt-5">
          {mockSponsorAds.map((ad, idx) => (
            <button
              key={ad.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                currentIndex === idx
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
              }`}
              aria-label={`Đi tới quảng cáo ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
