# FinVault Mobile

Install dependencies from the frontend repository root with `npm install`.
Start Expo and choose Android (`a`) or scan the QR code with Expo Go.
Run `npm run dev:mobile` at the root or `npm run start` in `apps/mobile`.
Android defaults to `http://10.0.2.2:3000/api`; iOS simulator uses `http://localhost:3000/api`.
Set `EXPO_PUBLIC_API_BASE_URL` to the backend computer's LAN IP when using a real phone.
Run Prism with `npm run mock`; `EXPO_PUBLIC_USE_MOCK=true` selects port 4010 on Android.
For iOS mock, set `EXPO_PUBLIC_API_BASE_URL=http://localhost:4010/api`.
Refresh tokens are persisted with Expo SecureStore, not AsyncStorage.
Development HTTP is enabled by Expo config; production config disables cleartext.
