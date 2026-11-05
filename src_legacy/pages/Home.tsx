import { HeroSection } from '@/features/home/components/HeroSection'
import { SponsorBanner } from '@/features/home/components/SponsorBanner'
import { TrustedBy } from '@/features/home/components/TrustedBy'
import { EcosystemFeatures } from '@/features/home/components/EcosystemFeatures'

export default function Home() {
  return (
    <div className="space-y-16 sm:space-y-24 pb-12">
      {/* 1. Hero Section & Interactive Mockup */}
      <HeroSection />

      {/* 2. Horizontal Sponsor & Partner Advertisement Banner */}
      <SponsorBanner />

      {/* 3. Trusted Brand Leaders */}
      <TrustedBy />

      {/* 4. Comprehensive Management Ecosystem Features */}
      <EcosystemFeatures />
    </div>
  )
}
