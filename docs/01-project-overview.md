# 01 — Project Overview

## Problem

Lightweight personal-budget tracking usually falls into two extremes: heavyweight SaaS apps that require accounts and store financial data on third-party servers, or spreadsheets that offer no interactivity. MoneyMap targets the middle ground: an instant, zero-setup finance tracker that runs entirely in the browser.

## Intended Users

- Students and individuals who want a quick personal expense log without creating accounts
- Recruiters/developers reviewing a self-contained, dependency-light web application
- Anyone who prefers not to upload financial data to a server

## Value

- Private by default — data never leaves the device (localStorage)
- No build step, no runtime server, five static pages
- Practical output: charts, PDF report, CSV export, 30-day forecast

## Scope

| In scope | Out of scope (by design) |
| --- | --- |
| Transaction CRUD with categories | Real authentication / account servers |
| Budget planning + utilization | Multi-device sync |
| Interactive charts (Chart.js) | Institutional accounting features |
| PDF/CSV report generation | Offline PWA distribution (future work) |
| Mock session (email-only profile) | Encrypted storage |

## Major Features

1. Financial dashboard (balance, income, expenses, savings)
2. Transaction management (add/edit/delete, categorize)
3. Budget management with utilization tracking
4. Expense/budget visualizations
5. PDF + CSV report exports, 30-day expense forecast
6. Mock sign-in/session + profile page

## Technologies and Their Purpose

| Tech | Why |
| --- | --- |
| Vanilla JS ES modules | Zero-dependency, fast load, no framework lock-in |
| `localStorage` | Simple persistent client-side storage for all data |
| Chart.js | Established charting with minimal footprint |
| jsPDF | Generating portable PDF reports fully client-side |
| GitHub Pages | Zero-cost static hosting for the final artifact |
