import type { ConfigContext, ExpoConfig } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'FinVault Mobile',
  slug: config.slug ?? 'finvault-mobile',
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: process.env.NODE_ENV !== 'production'
        }
      }
    ]
  ]
})
