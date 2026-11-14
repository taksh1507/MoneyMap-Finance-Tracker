import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const saved = new Map();
globalThis.localStorage = {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
};
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    value: '', textContent: '', style: {}, children: [], handlers: {},
    addEventListener(name, fn) { this.handlers[name] = fn; },
    appendChild(child) { this.children.push(child); },
    getContext() { return {}; }, focus() {}, click() {}, setAttribute() {},
    querySelector(selector) { return element(id + selector); },
    set innerHTML(value) { this.html = value; if (!value) this.children = []; },
  });
  return elements.get(id);
}
let initialize;
globalThis.document = {
  getElementById: element, querySelector: element,
  createElement: tag => element(tag + Math.random()),
  addEventListener: (name, fn) => { if (name === 'DOMContentLoaded') initialize = fn; },
  body: { appendChild() {}, removeChild() {} },
};
globalThis.window = globalThis;
globalThis.Chart = class { destroy() {} };
globalThis.alert = message => { throw new Error(message); };
const storage = await import('../js/storage.js');
await import('../js/financetracker.js');

beforeEach(() => { saved.clear(); elements.clear(); initialize(); });

const original = { date: '2026-11-14', desc: 'Original', amount: 12, type: 'Expense', category: 'Food' };

test('opening edit preserves the original transaction until saving', () => {
  const id = storage.addTransaction(original);
  window.editTransaction(id);
  assert.equal(storage.getTransactions().length, 1);
  assert.equal(storage.getTransactions()[0].desc, 'Original');
});

test('saving an edit updates in place and preserves the transaction id', () => {
  const id = storage.addTransaction(original);
  window.editTransaction(id);
  element('transactionDesc').value = 'Changed';
  element('transactionAmount').value = '24';
  element('addTransactionBtn').handlers.click();
  assert.deepEqual(storage.getTransactions(), [{ ...original, id, desc: 'Changed', amount: 24 }]);
});

test('transactions created within the same millisecond have distinct IDs', () => {
  const previous = Date.now; Date.now = () => 1;
  try { assert.notEqual(storage.addTransaction(original), storage.addTransaction(original)); }
  finally { Date.now = previous; }
});

test('editing cannot replace the transaction ID', () => {
  const id = storage.addTransaction(original);
  storage.editTransaction(id, { id: 'other', desc: 'Changed' });
  assert.equal(storage.getTransactions()[0].id, id);
});

test('non-finite transaction amounts are rejected without overwriting saved data', () => {
  const id = storage.addTransaction(original);
  window.editTransaction(id);
  element('transactionAmount').value = 'Infinity';
  assert.throws(() => element('addTransactionBtn').handlers.click(), /valid transaction/);
  assert.equal(storage.getTransactions()[0].amount, 12);
});

test('CSV export escapes spreadsheet formulas and quotes all text columns', async () => {
  storage.addTransaction({ ...original, desc: '=HYPERLINK("https://example.test")' });
  let blob; let released = false;
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = value => { blob = value; return 'blob:test'; };
  URL.revokeObjectURL = value => { assert.equal(value, 'blob:test'); released = true; };
  try {
    element('generateCsvBtn').handlers.click();
    assert.match(await blob.text(), /"'=HYPERLINK\(""https:\/\/example.test""\)"/);
    assert.ok(released);
  } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; }
});
