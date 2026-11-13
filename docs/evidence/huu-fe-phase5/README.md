# Phase 5 — Merchant onboarding/status acceptance

- check.txt: npm run check, lint/typecheck/32 Node tests/build PASS.
- unit.txt: Vitest 96/96, including 13 new Merchant onboarding/status cases.
- browser.txt and browser/: 6 production-browser synthetic HTTP groups, including 404/500 and mobile.
- live.txt and live/: 5 production-browser groups through the actual isolated Gateway/Auth/Merchant/Postgres stack. Includes null -> register -> PENDING, admin API status changes, owner USER approval 403, foreign-owner read 403, duplicate 409, account switch and mobile. No mocked merchant response in live mode.
- backend-unit.txt: 7 source backend my-merchant/merchant unit tests using Supertest/fake Prisma in a network-isolated container.
- profile-regression.txt and profile-regression/: 6 Auth/Profile/KYC synthetic HTTP browser groups.
- stack-cleanup.txt: isolated project down --remove-orphans, no volume deletion; temporary Podman API subsequently stopped. Synthetic test data retained in volumes.
- source-sha256.json: current relevant FE source hashes; working tree contains uncommitted earlier-phase work.

Live project finvault-acceptance-dadc7eef7537 was reused with additive synthetic accounts/merchant only. User/merchant workers were explicitly started for account provisioning. Browser origin localhost matches existing backend CORS; no CORS relaxation. Synthetic admin role was applied only to a freshly created test account to drive status APIs. Credentials/tokens/cookies are not in evidence.

Phase 5 covers onboarding/status/portal gating. Outlet/QR/API-key management remains Phase 6. Funding live blockers from Phase 3–4 are unchanged. See ../../handover/merchant.md.
