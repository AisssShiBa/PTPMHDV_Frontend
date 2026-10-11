# Frontend workspace scaffold

- The existing Vite web app remains at the repository root; no app files were moved.
- `apps/mobile` is the workspace placeholder for N6d.
- `packages/api-client` contains the shared HTTP client; `packages/api-contract/openapi.yaml` is the API contract used by the Prism mock.
- npm workspaces are configured for `apps/*` and `packages/*`.

Run the web app from the repository root with `npm run dev`; run the mock with `npm run mock` on port 4010.
Mobile application workflows will be documented with their implementation in N6d.

## Notifications (N6c)

The notification feature calls the authenticated `/notifications/me` API for paginated
notifications, `/notifications/me/read-all` to mark all as read, and
`/notifications/:id/read` to mark an individual notification as read. These routes
are scoped to the authenticated user; the removed user-ID routes are not used.

Before opening the notification Socket.IO connection, the web client requests
`/notifications/socket-ticket` with its authenticated API client and supplies the
returned ticket as the Socket.IO auth token. Tickets expire after 60 seconds and
are single-use, so a fresh ticket is requested for each connection. Automatic
socket reconnection is disabled to avoid reusing a consumed ticket.
