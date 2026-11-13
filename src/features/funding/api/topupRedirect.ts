import { FundingError } from './funding.errors'
/** An exact deployment-controlled payment endpoint; never trust a response origin alone. */
export function validateTopupRedirect(raw: string): URL {
  try {
    const approved = new URL(import.meta.env.VITE_VNPAY_PAYMENT_URL || '')
    const target = new URL(raw)
    if (approved.protocol !== 'https:' || approved.username || approved.password || approved.search || approved.hash || target.protocol !== 'https:' || target.origin !== approved.origin || target.pathname !== approved.pathname || target.username || target.password || target.hash) throw new Error()
    return target
  } catch { throw new FundingError('FUNDING_REDIRECT_UNTRUSTED') }
}
export const topupNavigation = { redirect: (url: URL) => window.location.assign(url.href) }
