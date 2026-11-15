# Architecture

## Modules

`model.js` owns validation and pure calculations. `storage.js` reads and updates
one `moneyMapData` localStorage record. `app.js` renders views and handles user
actions. `icons.js` supplies SVGs with no font or network dependency.

The root page and the retained tracker URL use the same application modules.
Former sign-in and profile routes link to the local workspace and its settings.

## Persisted data

Version 2 stores a user display profile, transactions, legacy default budgets,
month-specific budgets, goals, recurring entries, a theme, and the sample-data flag.
Transactions have stable IDs, ISO calendar dates, descriptions, categories, types,
and positive amounts with at most two decimal places. Recurring transactions also
retain the template ID and occurrence month to prevent repeat recording.

Legacy data is normalized in memory. Opening a workspace does not overwrite the
original record; the next explicit saved change writes the validated structure.
Existing transaction IDs, profile fields, budgets and legacy income values are
retained. The legacy standalone income field is preserved in backups but totals
are computed from actual transaction entries.

Updates validate the whole proposed state before a single storage write. Failed
validation or a failed write does not claim success. Corrupt records remain
available for download and recovery. A storage event refreshes other tabs and
closes stale editing dialogs.

## Calculations and export

Amounts use integer cents during summation. Monthly summaries use transaction
dates, and budget overrides belong to a specific month. Projections use elapsed
calendar days, including days without transactions. Future-dated transactions
appear in monthly totals but do not contribute to the current spending pace.

Recurring reminders use a month/day pair, clamped to the last day of short months.
A due item is recorded only on explicit request. Goals have an independent saved
amount; contributions do not create a ledger transaction.

CSV includes every matching filtered entry, not just the visible page. Print/PDF
uses a separate report containing the complete filtered set. JSON backups preserve
all supported workspace data and are validated before replacement.

## Hosting

Serve the repository root as a static site. Browser localStorage is scoped to the
site origin, so local development and hosted workspaces are separate. Moving hosts
or browser profiles requires exporting and restoring a backup. There is no cloud
synchronization, exchange-rate conversion, bank connection or background scheduler.
