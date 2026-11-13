# Phase 2 — FE Funding foundation

- `check.txt`: npm run check — PASS, 32 Node tests, lint/typecheck/build.
- `unit.txt`: npm run test:unit — PASS, 54 tests (19 Funding).
- `browser.txt`, `browser/`: production Auth/Profile/KYC browser regression — PASS, 6 fixture HTTP groups. This is not Funding live acceptance.
- `source-sha256.json`: hashes of relevant current source files; working tree contains earlier Phase 1 changes and is uncommitted.

Live Funding remains BLOCKED by topup number/string + idempotency contract and Gateway wildcard funding whitelist. See ../../handover/funding.md. No sandbox payment or live cashout was claimed. Browser runner now accepts BROWSER_EVIDENCE_DIR to separate regression evidence by phase; default still targets Phase 1. The first regression rerun in this phase refreshed that default browser folder; this folder contains the subsequent isolated rerun.
