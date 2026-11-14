# Phase 6 — Merchant Outlet/QR/API key acceptance

- check.txt: npm run check — lint/typecheck/32 Node tests/build PASS.
- unit.txt: Vitest 108/108, including 12 Merchant tools tests.
- backend-unit.txt: 12 source backend Outlet/key tests in a network-isolated container, fake Prisma/Supertest.
- live.txt, live/result.json, live/*.png: 5 production-browser groups through actual isolated Gateway/Auth/Merchant/Postgres. M01–M08 checks include approval/owner/duplicate guards, real pagination, exact QR SVG token and backend tamper/scope verification, one-time key DB hash/revocation, version and one matching persisted outbox event. This does not claim downstream event delivery.
- live/merchant-qr.pdf: real Chromium print-to-PDF of the signed public standee QR; not a server export. No raw API key was screenshotted or written into evidence.
- onboarding-regression.txt and onboarding-regression/: 6 Merchant onboarding HTTP-fixture groups.
- profile-regression.txt and profile-regression/: 6 Auth/Profile/KYC HTTP-fixture groups.
- stack-cleanup.txt: isolated stack down --remove-orphans without deleting volumes; temporary Podman API stopped afterwards. Synthetic test data retained.
- source-sha256.json: current relevant source/package hashes; working tree also contains uncommitted prior-phase changes.

qrcode.react 4.2.0 added under the repository exception. No client signing secrets, raw-key storage, key inventory GET endpoint, or mutation cache for key/QR was introduced. Key copy is explicit user action. Metadata is session-only. Lost key-creation responses cannot be recovered because the backend has no key-list contract; no automatic retry.

See ../../handover/merchant-tools.md for reproduction, security boundaries and scope. Existing Funding blockers from Phases 3–4 remain unchanged.
