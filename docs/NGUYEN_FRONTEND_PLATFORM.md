# Frontend workspace scaffold

- The existing Vite web app remains at the repository root; no app files were moved.
- `apps/mobile` is the workspace placeholder for N6d.
- `packages/api-client` contains the shared HTTP client; `packages/api-contract/openapi.yaml` is the API contract used by the Prism mock.
- npm workspaces are configured for `apps/*` and `packages/*`.

Run the web app from the repository root with `npm run dev`; run the mock with `npm run mock` on port 4010.
Mobile application workflows will be documented with their implementation in N6d.
