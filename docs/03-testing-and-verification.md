# 03 — Testing & Verification

This document records what has actually been verified against the code and how to reproduce the checks. **No test framework or CI has been added yet** — that is a documented gap, and everything below is runtime/syntax verification performed during the repository audit.

## Testing Strategy Today

| Layer | Approach |
| --- | --- |
| Syntax | `node --check` on every ES module |
| Runtime | Static server + HTTP status smoke of all pages/assets |
| Security | Manual review of DOM interpolation points (XSS surface) |
| Pages | GitHub Actions `pages-build-deployment` + live URL probe |
| Differential | README every feature claim traced to implementation |

## Most Recent Verification Run (audit)

Environment: Node `v24.18.0`, Python 3 `http.server`, repository at commit containing the XSS fix.

### 1. Module syntax check — 5/5 PASS

```bash
node --check js/auth.js
node --check js/financetracker.js
node --check js/profilepage.js
node --check js/script.js
node --check js/storage.js
```

Result: all five modules parse cleanly.

### 2. Local static-server smoke — 15/15 PASS

```bash
python -m http.server 8000
```

Probed with HTTP `HEAD` requests:

```text
200  index.html
200  html/financetracker.html
200  html/signin.html
200  html/profilepage.html
200  html/about.html
200  html/contact.html
200  css/main-styles.css
200  css/financetracker-styles.css
200  js/storage.js
200  js/financetracker.js
200  js/auth.js
200  js/profilepage.js
200  js/script.js
200  images/saving.jpg
200  images/hi.jpeg
```

Result: 15/15 routes returned HTTP 200, failures = 0.

### 3. Security review of dynamic DOM writes — PASS

- `financetracker.js` renders every user-entered field (`t.desc`, `t.date`, `t.category`, `t.type`) through `escapeHtml()` before interpolation into `row.innerHTML`.
- Inline confirmation/delete handlers embed only the internally generated numeric `id` (`Date.now().toString()`), never user-controlled strings.
- Passwords are never persisted anywhere (localStorage contains only the session email/name).

### 4. README claim trace — PASS

Each feature bullet was traced to code before being documented: transactions CRUD (`js/financetracker.js` + `js/storage.js`), budgets (`updateBudgets`/`getBudgets`), charts (`Chart.js 3.7.0` script tag), PDF (`window.jspdf`, `jsPDF 2.5.1`), CSV (Blob + object-URL download), forecast (30-day projection function). No unimplemented features are advertised.

### 5. GitHub Pages deployment — PASS

- The `pages-build-deployment` workflow completed successfully on the latest push.
- Live root verified with HTTP 200: https://taksh1507.github.io/MoneyMap-Finance-Tracker/

## Known Gaps

1. **No automated regression suite.** First-class improvement: a Playwright e2e script covering add → edit → delete transaction, budget creation, and CSV download.
2. **No linting config** (ESLint/Biome). The modules are small enough that manual review suffices today, but CI lint would catch regressions.
3. **Manual smoke only for HTTP** — future step could add a tiny script (`server-smoke.mjs`) flagging non-200 routes automatically.
4. **No visual/behavioral browser automation** — reported checks are HTTP-level + code review, not pixel-level browser testing (no headless browser used).

## Verification Notes for Reviewers

- The HTTP smoke intentionally covers assets referenced from `about.html`/`contact.html` and both images so a broken relative path (common cost of file moves) would be caught.
- `node --check` validates syntax but not import resolution; import correctness was reviewed line-by-line (`./storage.js` relative imports inside each `js/` module, loaded by HTML pages via `type="module"` script tags).
