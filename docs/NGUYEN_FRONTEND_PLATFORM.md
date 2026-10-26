# Frontend workspace scaffold

- The existing Vite web app remains at the repository root; no app files were moved.
- `apps/mobile` contains the Expo mobile application.
- `packages/api-client` contains the shared HTTP client; `packages/api-contract/openapi.yaml` is the API contract used by the Prism mock.
- npm workspaces are configured for `apps/*` and `packages/*`.

## Running the applications

- Start the Prism API mock on port 4010 from the repository root: `npm run mock`.
- Start the web app from the repository root: `npm run dev`.
- Start the mobile app from the repository root: `npm run dev:mobile`. For device
  networking and mock configuration, see [apps/mobile/README.md](../apps/mobile/README.md).

## Notifications (N6c)

For the web app, use the API mock by setting
`VITE_API_BASE_URL=http://localhost:4010/api` and `VITE_USE_MOCK=true` in
`.env.local`, then run `npm run mock` and `npm run dev`. Mock mode disables the
Socket.IO connection.

The notification feature calls the authenticated `/notifications/me` API for paginated
notifications, `/notifications/me/read-all` to mark all as read, and
`/notifications/:id/read` to mark an individual notification as read. These routes
are scoped to the authenticated user; the removed user-ID routes are not used.

Before opening the notification Socket.IO connection, the web client requests
`/notifications/socket-ticket` with its authenticated API client and supplies the
returned ticket as the Socket.IO auth token. Tickets expire after 60 seconds and
are single-use, so a fresh ticket is requested for each connection. Automatic
reconnection is enabled; each connection attempt requests a fresh ticket through
Socket.IO's auth callback. The socket uses the API origin and the default
`/socket.io` path/transports. Polling slows to once per minute while connected.
