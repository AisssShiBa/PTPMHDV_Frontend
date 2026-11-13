# Phase 4 — Cashout FE/PIN/recovery

Frontend implementation and synthetic regressions pass. Full Phase 4 live acceptance remains BLOCKED.

- check.txt: npm run check, lint/typecheck/32 Node tests/build PASS.
- unit.txt: Vitest 83/83, including 15 new Cashout UI tests.
- browser.txt and browser/: 6 production cashout browser groups against synthetic HTTP fixtures; five desktop/mobile/status screenshots.
- backend-unit.txt: 20 backend state-machine tests in a network-isolated container using fake store, wallet and provider. This is not real ledger verification.
- topup-regression.txt and topup-regression/: 7 production topup HTTP-fixture groups.
- profile-regression.txt and profile-regression/: 6 production Auth/Profile/KYC HTTP-fixture groups.
- source-sha256.json: relevant source snapshot; uncommitted changes from earlier phases remain.

Gateway cashout signing is blocked by the current wildcard funding whitelist (source audit). Ledger E2E C01/C02/C03/C04/C06/C07/C13 NOT_RUN. Recovery of a create timeout with no UUID after reload lacks a lookup-by-key/list contract; in-session retry preserves the original intent. Recovered known UUIDs are GET-only until re-confirm semantics are authorized. See ../../handover/cashout.md.

Backend unit command: podman run --rm --network=none --security-opt label=disable -e DATABASE_URL=postgresql://synthetic:synthetic@localhost:5432/synthetic -v "$PWD/src:/app/services/payment-service/src:ro" -v "$PWD/tests:/app/services/payment-service/tests:ro" docker.io/library/finvault-acceptance-dadc7eef7537-payment-service:latest ./node_modules/.bin/tsx --test tests/cashout-state-machine.test.ts
Run from backend services/payment-service. Image dependencies are reused; current source/tests are mounted read-only. Credentials are synthetic and no database/network is used.
