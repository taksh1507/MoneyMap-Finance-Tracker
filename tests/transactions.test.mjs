import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyData,
  normalizeData,
  summary,
  transaction,
  goal,
  recurringStatus,
  dueDate,
  csv,
} from '../js/model.js';
import * as store from '../js/storage.js';
const saved = new Map();
globalThis.localStorage = {
  getItem: (k) => saved.get(k) ?? null,
  setItem: (k, v) => saved.set(k, v),
};
const original = {
  id: 'original',
  date: '2026-11-14',
  desc: 'Lunch',
  amount: 12.5,
  type: 'Expense',
  category: 'Food',
};
beforeEach(() => saved.clear());
test('legacy records and profile migrate without changing IDs, amounts or budgets', () => {
  const legacy = {
    userProfile: {
      firstName: 'Taksh',
      lastName: 'Gandhi',
      email: 'local@example.test',
      currency: 'INR',
    },
    transactions: [original],
    budgets: { Food: 1000, Bills: 0 },
    income: 5000,
  };
  saved.set(store.STORAGE_KEY, JSON.stringify(legacy));
  const data = store.getData();
  assert.deepEqual(data.transactions, [original]);
  assert.deepEqual(data.budgets, legacy.budgets);
  assert.deepEqual(data.userProfile, legacy.userProfile);
  assert.equal(data.version, 2);
  assert.equal(data.income, 5000);
  assert.equal(saved.get(store.STORAGE_KEY), JSON.stringify(legacy));
});
test('edits preserve the saved transaction and stable ID until explicitly submitted', () => {
  const id = store.addTransaction(original);
  const draft = { ...store.getTransactions()[0], desc: 'Edited' };
  assert.equal(store.getTransactions()[0].desc, 'Lunch');
  store.editTransaction(id, { ...draft, id: 'replacement' });
  assert.equal(store.getTransactions().length, 1);
  assert.equal(store.getTransactions()[0].id, id);
  assert.equal(store.getTransactions()[0].desc, 'Edited');
});
test('rapidly added transactions get distinct identifiers', () => {
  assert.notEqual(store.addTransaction(original), store.addTransaction(original));
});
test('invalid edits never overwrite existing data', () => {
  const id = store.addTransaction(original);
  const before = store.getRawBackup();
  for (const value of [Infinity, NaN, -2, 0, 0.001, 1000000001])
    assert.throws(() => store.editTransaction(id, { amount: value }));
  assert.equal(store.getRawBackup(), before);
});
test('dates reject impossible calendar values instead of rolling over', () => {
  for (const date of ['2026-02-30', '2026-13-01', '12/01/2026', '2026-11-31'])
    assert.throws(() => transaction({ ...original, date }));
  assert.equal(transaction({ ...original, date: '2024-02-29' }).date, '2024-02-29');
});
test('monthly summary isolates other months and uses cent arithmetic', () => {
  const d = emptyData();
  d.transactions = [
    { ...original, amount: 0.1 },
    { ...original, id: 'b', amount: 0.2 },
    { ...original, id: 'c', type: 'Income', amount: 1 },
    { ...original, id: 'old', date: '2026-10-14', amount: 999 },
  ];
  const s = summary(d, '2026-11', '2026-11-15');
  assert.equal(s.expense, 0.3);
  assert.equal(s.income, 1);
  assert.equal(s.balance, 0.7);
  assert.equal(s.spent.Food, 0.3);
  assert.equal(s.entries.length, 3);
  assert.ok(Math.abs(s.savingsRate - 70) < 0.00001);
});
test('forecast uses elapsed calendar days instead of only days with expenses', () => {
  const d = emptyData();
  d.transactions = [{ ...original, amount: 150, date: '2026-11-01' }];
  assert.equal(summary(d, '2026-11', '2026-11-15').forecast, 300);
  assert.equal(summary(d, '2026-11', '2026-12-10').forecast, 150);
  assert.equal(summary(d, '2026-12', '2026-11-15').forecast, 0);
  assert.equal(summary(d, '2026-11').savingsRate, null);
});
test('monthly budgets are independent and removing one does not revive the legacy default', () => {
  const d = emptyData();
  d.budgets.Food = 100;
  store.saveData(d);
  store.setBudget('2026-11', 'Food', 200);
  assert.equal(summary(store.getData(), '2026-11').budgets.Food, 200);
  assert.equal(summary(store.getData(), '2026-10').budgets.Food, 100);
  store.setBudget('2026-11', 'Food', 0);
  assert.equal(summary(store.getData(), '2026-11').budgets.Food, 0);
});
test('monthly reminders clamp leap-year and short-month dates', () => {
  const r = {
    id: 'r',
    desc: 'Rent',
    amount: 100,
    type: 'Expense',
    category: 'Bills',
    day: 31,
    startMonth: '2026-01',
  };
  assert.equal(dueDate(r, '2026-02'), '2026-02-28');
  assert.equal(dueDate(r, '2024-02'), '2024-02-29');
  const d = emptyData();
  d.recurring = [r];
  assert.equal(recurringStatus(d, r, '2025-12', '2026-01-01'), 'Not started');
  assert.equal(recurringStatus(d, r, '2026-01', '2026-01-15'), 'Upcoming');
});
test('recording a recurring entry twice cannot duplicate the ledger', () => {
  store.putRecurring({
    id: 'r',
    desc: 'Rent',
    amount: 100,
    type: 'Expense',
    category: 'Bills',
    day: 1,
    startMonth: '2026-11',
  });
  store.recordRecurring('r', '2026-11', '2026-11-15');
  assert.throws(() => store.recordRecurring('r', '2026-11', '2026-11-15'));
  assert.equal(store.getTransactions().length, 1);
  assert.equal(store.getTransactions()[0].recurringMonth, '2026-11');
  assert.throws(() => store.recordRecurring('r', '2026-12', '2026-11-15'));
});
test('goal changes validate contributions without changing transaction balances', () => {
  store.addTransaction(original);
  store.putGoal({ id: 'g', name: 'Rainy day', target: 1000, saved: 50 });
  store.putGoal({ id: 'g', name: 'Rainy day', target: 1000, saved: 75 });
  assert.equal(store.getData().goals[0].saved, 75);
  assert.equal(store.getTransactions()[0].amount, 12.5);
  assert.throws(() => goal({ id: 'g', name: 'Test', target: 100, saved: 101 }));
});
test('complete backup round-trip preserves financial records and preferences', () => {
  store.addTransaction(original);
  store.setBudget('2026-11', 'Food', 200);
  store.putGoal({ id: 'g', name: 'Trip', target: 100, saved: 20 });
  store.putRecurring({
    id: 'r',
    desc: 'Bill',
    amount: 10,
    type: 'Expense',
    category: 'Bills',
    day: 1,
    startMonth: '2026-11',
  });
  const before = store.getData(),
    backup = store.getRawBackup();
  saved.clear();
  store.restoreBackup(backup);
  assert.deepEqual(store.getData(), before);
});
test('invalid backups never replace a valid workspace', () => {
  store.addTransaction(original);
  const before = store.getRawBackup();
  for (const raw of [
    'bad json',
    '{}',
    JSON.stringify({ ...emptyData(), version: 999 }),
    JSON.stringify({ ...emptyData(), transactions: [original, original] }),
  ])
    assert.throws(() => store.restoreBackup(raw));
  assert.equal(store.getRawBackup(), before);
});
test('unreadable local data remains available for recovery and is never silently reset', () => {
  saved.set(store.STORAGE_KEY, '{corrupted');
  assert.throws(store.getData, /could not be read/);
  assert.equal(store.getRawBackup(), '{corrupted');
  assert.throws(() => store.addTransaction(original));
  assert.equal(store.getRawBackup(), '{corrupted');
});
test('storage write failures report an error without claiming successful persistence', () => {
  store.addTransaction(original);
  const before = store.getRawBackup(),
    set = localStorage.setItem;
  localStorage.setItem = () => {
    throw new Error('QuotaExceeded');
  };
  try {
    assert.throws(() => store.addTransaction(original), /could not be saved/);
    assert.equal(store.getRawBackup(), before);
  } finally {
    localStorage.setItem = set;
  }
});
test('CSV quotes multiline text and neutralizes formula prefixes', () => {
  const out = csv([{ ...original, desc: ' =HYPERLINK("https://example.test")\nsecond line' }]);
  assert.ok(out.includes('"\' =HYPERLINK(""https://example.test"")\nsecond line"'));
  assert.ok(out.includes('"12.50"'));
});
test('backup normalization rejects unsupported categories and unbounded collections', () => {
  assert.throws(() =>
    normalizeData({ ...emptyData(), transactions: [{ ...original, category: 'unknown' }] }),
  );
  assert.throws(() => normalizeData({ ...emptyData(), transactions: Array(20001).fill(original) }));
});
