# Project overview

MoneyMap is a personal finance workspace with a deliberate static architecture.
It runs without an account, API server, build system, or production dependencies.

The workspace has six connected views: overview, transactions, budgets, savings
goals, recurring reminders, and settings. Each view uses the same persisted state.
The optional sample workspace demonstrates the product without presenting example
figures as the user's own records.

Monthly reporting and category budgets provide a useful picture of spending.
Savings goals track earmarked amounts independently of transactions. Reminders
require explicit recording and never initiate payments. CSV, browser print/PDF,
and JSON backups provide different ways to take data out of the application.

The light interface uses green accents, local SVG icons, readable text, native
modal dialogs and a mobile navigation drawer. A saved dark theme is also available.
