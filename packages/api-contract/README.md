# API Contract

`openapi.yaml` is the shared API contract and the source used by the Prism mock
server (`npm run mock`).

- Real routes are the top-level keys under `paths` (no `/api` prefix). The same
  path items are repeated under `/api/...` at the end of `paths` because Prism
  serves path keys directly and does not prepend `servers[].url`.
- `x-planned-paths` lists routes the client needs but the Backend does not have.
  It is currently empty; add entries there instead of inventing a real path.
- Validate after editing: `npm run contract:lint`.
- Confirmations still needed from service owners are tracked in
  [`../../docs/CONTRACT_OPEN_QUESTIONS.md`](../../docs/CONTRACT_OPEN_QUESTIONS.md).
