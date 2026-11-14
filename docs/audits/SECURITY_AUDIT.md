# Security audit — MoneyMap

Date: 2026-11-14. Scope: local transaction storage, tracker rendering, edit/export flows and static page initialization.

| Severity | Finding | Change and verification |
| --- | --- | --- |
| High (data integrity) | Edit immediately removed the persisted transaction, so navigating away or reloading lost the record. | Edit keeps the original until Save and updates in place; unit and Chromium reload tests pass. |
| Medium | Millisecond IDs could collide; update payloads could replace IDs. | Use browser-generated UUIDs and preserve IDs during updates; regression tests pass. |
| Medium | CSV text could be interpreted as spreadsheet formulas. | Quote every cell, escape embedded quotes and prefix formula-like text; regression test passes. This mitigates ordinary spreadsheet import; downstream software may transform exports. |
| Medium | Stored IDs were interpolated into inline JavaScript handlers. | Bind Edit/Delete listeners with closures, eliminating that interpolation sink. No exploitability claim for other rendering paths. |
| Low | Non-finite amounts could reach financial totals. | Reject non-finite transaction amounts and negative/non-finite budgets at the form boundary. |

## Remaining risks

MoneyMap is a local browser demo, not a secure multi-user finance service. Its sign-in screen is a mock session; there is no server-side authentication or per-user data isolation. localStorage is not encrypted and can be read by scripts on the same origin. Do not use shared browser profiles for sensitive financial records.

Existing Chart.js 3.7.0, jsPDF 2.5.1 and html2canvas 1.4.1 versions were vendored with upstream license headers to remove runtime CDN requirements. Vendoring does not fix upstream vulnerabilities. In particular, the older jsPDF version needs a separate advisory/compatibility upgrade pass. Other pages, corrupted localStorage handling, historical secrets and full dependency scanning remain unverified.

Six unit regressions pass. Chromium checks at widths 1440, 768 and 390 verified persistence and save behavior with no uncaught page errors. PDF document correctness, other-page behavior and a complete accessibility audit were not covered.
