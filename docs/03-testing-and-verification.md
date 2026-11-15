# Verification

Use Node.js 22+, Python 3 and Chromium. Install development dependencies with
`npm ci --ignore-scripts`, then run:

```bash
npm run check
npm test
npx playwright install chromium
npm run test:e2e
```

A system Chromium/Chrome can be selected with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/browser`. Playwright serves the actual
application through a temporary loopback HTTP server. Tests use isolated browser
contexts and synthetic data, not personal records.

Unit coverage includes legacy migration, stable edits, amount/date validation,
month boundaries, cent-based arithmetic, projections, independent monthly budgets,
short-month recurring dates, one-time recording, savings goals, backup round trips,
failed writes, invalid restores and CSV formatting.

Browser coverage includes full ledger/budget/goal/reminder/restore flows, explicit
sample data, persistence, legacy imports, recovery, pagination, complete filtered
reports, failed saves, dialog focus, themes and automated accessibility checks.
Run it at desktop (1440px), tablet (768px) and mobile (390px) sizes. Screenshots
under `docs/screenshots` come from the same synthetic sample workspace.

CI runs the syntax, unit, dependency and browser checks. The PR checks record the
results for the exact commit. Automated checks supplement visual review; they do
not prove compatibility with every browser or assistive technology.

## Recorded results

On 2026-11-15, all **17 unit tests** and **21 browser tests** passed locally.
Syntax checks and local asset-link validation also passed. Light and dark overview
checks plus all six light workspace views passed the configured axe checks at
desktop, tablet and mobile sizes. These are automated results, not a claim of
complete accessibility certification.
