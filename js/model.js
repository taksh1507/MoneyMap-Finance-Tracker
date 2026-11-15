export const CATEGORIES = [
  'Food',
  'Bills',
  'EMI',
  'Entertainment',
  'Transport',
  'Shopping',
  'Health',
  'Education',
  'Salary',
  'Other',
];
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
export const MAX_AMOUNT = 1000000000;
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const monthOf = (date = today()) => date.slice(0, 7);
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(+parsed) &&
    parsed.toISOString().slice(0, 10) === value &&
    value >= '1900-01-01' &&
    value <= '2199-12-31'
  );
}
export function amount(value, allowZero = false) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < (allowZero ? 0 : 0.01) ||
    value > MAX_AMOUNT ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.0001
  )
    throw new Error('Enter an amount with at most 2 decimal places, up to 1 billion.');
  return Math.round(value * 100) / 100;
}
const text = (value, max = 120) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`Enter text between 1 and ${max} characters.`);
  return value.trim();
};
const id = (value) => text(value, 128);
export function transaction(input) {
  if (!input || !validDate(input.date)) throw new Error('Choose a valid transaction date.');
  if (!['Income', 'Expense'].includes(input.type) || !CATEGORIES.includes(input.category))
    throw new Error('Choose a valid transaction type and category.');
  return {
    id: id(input.id),
    date: input.date,
    desc: text(input.desc),
    amount: amount(input.amount),
    type: input.type,
    category: input.category,
    ...(input.recurringId
      ? { recurringId: id(input.recurringId), recurringMonth: month(input.recurringMonth) }
      : {}),
  };
}
export function month(value) {
  if (typeof value !== 'string' || !validDate(`${value}-01`))
    throw new Error('Choose a valid month.');
  return value;
}
export function emptyData() {
  return {
    version: 2,
    userProfile: { firstName: '', lastName: '', email: '', currency: 'INR' },
    transactions: [],
    budgets: {},
    monthlyBudgets: {},
    goals: [],
    recurring: [],
    theme: 'light',
  };
}
function limits(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid budget data.');
  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => {
      if (!CATEGORIES.includes(key)) throw new Error('Unknown budget category.');
      return [key, amount(val, true)];
    }),
  );
}
export function goal(input) {
  const result = {
    id: id(input.id),
    name: text(input.name, 60),
    target: amount(input.target),
    saved: amount(input.saved, true),
  };
  if (result.saved > result.target) throw new Error('Saved amount cannot exceed the goal target.');
  return result;
}
export function schedule(input) {
  const result = {
    id: id(input.id),
    desc: text(input.desc),
    amount: amount(input.amount),
    type: input.type,
    category: input.category,
    day: input.day,
    startMonth: month(input.startMonth),
  };
  if (
    !Number.isInteger(result.day) ||
    result.day < 1 ||
    result.day > 31 ||
    !['Income', 'Expense'].includes(result.type) ||
    !CATEGORIES.includes(result.category)
  )
    throw new Error('Invalid recurring entry.');
  return result;
}
export function normalizeData(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    (input.version !== undefined && input.version !== 2)
  )
    throw new Error('This is not a supported MoneyMap backup.');
  if (!Array.isArray(input.transactions) || input.transactions.length > 20000)
    throw new Error('A backup must contain at most 20,000 transactions.');
  const data = emptyData();
  data.transactions = input.transactions.map(transaction);
  if (new Set(data.transactions.map((t) => t.id)).size !== data.transactions.length)
    throw new Error('Duplicate transaction IDs.');
  data.budgets = limits(input.budgets || {});
  if (input.income !== undefined) data.income = amount(input.income, true);
  for (const [key, val] of Object.entries(input.monthlyBudgets || {}))
    data.monthlyBudgets[month(key)] = limits(val);
  for (const [key, validate] of [
    ['goals', goal],
    ['recurring', schedule],
  ]) {
    if (input[key] !== undefined && (!Array.isArray(input[key]) || input[key].length > 100))
      throw new Error('At most 100 goals or recurring entries are supported.');
    data[key] = (input[key] || []).map(validate);
    if (new Set(data[key].map((v) => v.id)).size !== data[key].length)
      throw new Error('Duplicate entry IDs.');
  }
  const profile = input.userProfile || {};
  for (const key of ['firstName', 'lastName', 'email'])
    if (profile[key] !== undefined) {
      if (typeof profile[key] !== 'string' || profile[key].length > 255)
        throw new Error('Invalid profile.');
      data.userProfile[key] = profile[key];
    }
  if (profile.currency && !CURRENCIES.includes(profile.currency))
    throw new Error('Choose a supported currency.');
  data.userProfile.currency = profile.currency || 'INR';
  data.theme = input.theme === 'dark' ? 'dark' : 'light';
  data.containsDemo = input.containsDemo === true;
  return data;
}
const cents = (value) => Math.round(value * 100);
export function summary(data, selectedMonth, now = today()) {
  month(selectedMonth);
  const entries = data.transactions.filter((t) => monthOf(t.date) === selectedMonth);
  const sum = (type) =>
    entries.filter((t) => t.type === type).reduce((n, t) => n + cents(t.amount), 0) / 100;
  const income = sum('Income'),
    expense = sum('Expense');
  const budgets = data.monthlyBudgets[selectedMonth] || data.budgets;
  const spent = Object.fromEntries(
    CATEGORIES.map((c) => [
      c,
      entries
        .filter((t) => t.type === 'Expense' && t.category === c)
        .reduce((n, t) => n + cents(t.amount), 0) / 100,
    ]),
  );
  const days = new Date(
    Number(selectedMonth.slice(0, 4)),
    Number(selectedMonth.slice(5)),
    0,
  ).getDate();
  const elapsed =
    selectedMonth === monthOf(now) ? Number(now.slice(8)) : selectedMonth < monthOf(now) ? days : 0;
  const actual =
    entries
      .filter((t) => t.type === 'Expense' && t.date <= now)
      .reduce((n, t) => n + cents(t.amount), 0) / 100;
  return {
    entries,
    income,
    expense,
    balance: (cents(income) - cents(expense)) / 100,
    savingsRate: income > 0 ? ((income - expense) / income) * 100 : null,
    budgets,
    spent,
    budgetTotal: Object.values(budgets).reduce((n, v) => n + cents(v), 0) / 100,
    forecast: elapsed ? (actual / elapsed) * days : 0,
    days,
    elapsed,
  };
}
export function dueDate(entry, selectedMonth) {
  const days = new Date(
    Number(selectedMonth.slice(0, 4)),
    Number(selectedMonth.slice(5)),
    0,
  ).getDate();
  return `${selectedMonth}-${String(Math.min(entry.day, days)).padStart(2, '0')}`;
}
export function recurringStatus(data, entry, selectedMonth, now = today()) {
  if (selectedMonth < entry.startMonth) return 'Not started';
  if (
    data.transactions.some((t) => t.recurringId === entry.id && t.recurringMonth === selectedMonth)
  )
    return 'Recorded';
  return dueDate(entry, selectedMonth) <= now ? 'Due' : 'Upcoming';
}
export function csv(entries, currency = 'INR') {
  const cell = (v) =>
    `"${String(v)
      .replace(/^[\s]*[=+\-@]/, (m) => "'" + m)
      .replaceAll('"', '""')}"`;
  return [
    'Date,Description,Category,Type,Amount,Currency',
    ...entries.map((t) =>
      [t.date, t.desc, t.category, t.type, t.amount.toFixed(2), currency].map(cell).join(','),
    ),
  ].join('\r\n');
}
