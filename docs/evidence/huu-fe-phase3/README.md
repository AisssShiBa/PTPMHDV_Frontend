# Phase 3 — FE topup evidence

FE checks and mock regressions pass; full live acceptance remains BLOCKED.

- check.txt: lint/typecheck/32 Node tests/build PASS.
- unit.txt: 68/68 Vitest, including 14 new topup tests.
- browser.txt and browser/: 7 topup production-browser groups with synthetic HTTP fixtures.
- profile-regression.txt and profile-regression/: 6 Auth/Profile/KYC production-browser fixture groups.
- backend-ipn-unit.txt: 12 backend source IPN tests using fake store/wallet, network-isolated container; no real ledger database.
- source-sha256.json: hashes of current relevant source; uncommitted work from earlier phases remains.

REAL_VNPAY_SANDBOX=NOT_RUN. GATEWAY-ALIAS-CREATE=BLOCKED. Real credit/ledger/replay 2/20 E2E cases NOT_RUN. See ../../handover/topup.md for amount/idempotency, redirect allowlist and return/callback deployment blockers.
