import { useSyncExternalStore } from 'react'

const query = '(max-width: 767px)'
const subscribe = (callback: () => void) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
const snapshot = () => window.matchMedia(query).matches

export function useIsMobile() {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
