import {
  emptyData,
  normalizeData,
  transaction,
  goal,
  schedule,
  amount,
  month,
  dueDate,
  recurringStatus,
} from './model.js';
export const STORAGE_KEY = 'moneyMapData';
export function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? emptyData() : normalizeData(JSON.parse(raw));
  } catch {
    throw new Error(
      'Your saved workspace could not be read. Download the original data before restoring a valid backup.',
    );
  }
}
export function saveData(input) {
  const validated = normalizeData(input);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
  } catch {
    throw new Error(
      'Changes could not be saved. Browser storage may be unavailable or full. Export a backup and try again.',
    );
  }
  return validated;
}
export function mutate(update) {
  const data = getData();
  update(data);
  return saveData(data);
}
export function addTransaction(input) {
  const value = transaction({ ...input, id: crypto.randomUUID() });
  mutate((d) => d.transactions.push(value));
  return value.id;
}
export function editTransaction(id, input) {
  return mutate((d) => {
    const i = d.transactions.findIndex((t) => t.id === id);
    if (i < 0) throw new Error('Transaction no longer exists.');
    d.transactions[i] = transaction({ ...d.transactions[i], ...input, id });
  });
}
export function deleteTransaction(id) {
  return mutate((d) => {
    d.transactions = d.transactions.filter((t) => t.id !== id);
  });
}
export const getTransactions = () => getData().transactions;
export function setBudget(selectedMonth, category, limit) {
  return mutate((d) => {
    month(selectedMonth);
    d.monthlyBudgets[selectedMonth] = {
      ...(d.monthlyBudgets[selectedMonth] || d.budgets),
      [category]: amount(limit, true),
    };
  });
}
export function putGoal(input) {
  const value = goal({ ...input, id: input.id || crypto.randomUUID() });
  return mutate((d) => {
    const i = d.goals.findIndex((g) => g.id === value.id);
    if (i < 0) d.goals.push(value);
    else d.goals[i] = value;
  });
}
export function putRecurring(input) {
  const value = schedule({ ...input, id: input.id || crypto.randomUUID() });
  return mutate((d) => {
    const i = d.recurring.findIndex((g) => g.id === value.id);
    if (i < 0) d.recurring.push(value);
    else d.recurring[i] = value;
  });
}
export function recordRecurring(id, selectedMonth, now) {
  return mutate((d) => {
    const item = d.recurring.find((r) => r.id === id);
    if (!item || recurringStatus(d, item, selectedMonth, now) !== 'Due')
      throw new Error('Only due, unrecorded entries can be added.');
    d.transactions.push(
      transaction({
        ...item,
        id: crypto.randomUUID(),
        date: dueDate(item, selectedMonth),
        recurringId: id,
        recurringMonth: selectedMonth,
      }),
    );
  });
}
export function restoreBackup(raw) {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new Error('Choose a valid MoneyMap JSON backup.');
  }
  return saveData(normalizeData(input));
}
export const getRawBackup = () => localStorage.getItem(STORAGE_KEY) || JSON.stringify(emptyData());
