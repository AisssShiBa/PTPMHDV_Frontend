import type { KycTier } from '../types/user.types'

export function KycTierBadge({ tier }: { tier: KycTier }) {
  return <span className="inline-flex whitespace-nowrap rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary">
    {tier === 0 || tier === 1 || tier === 2 ? `Cấp ${tier}` : 'Chưa rõ cấp'}
  </span>
}
