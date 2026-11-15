import { icon as iconSvg } from './icons.js';
import {
  CATEGORIES,
  CURRENCIES,
  today,
  monthOf,
  summary,
  dueDate,
  recurringStatus,
  csv,
  emptyData,
  amount,
} from './model.js';
import * as store from './storage.js';
const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const icons = Object.fromEntries(
  Object.entries({
    Food: 'food',
    Bills: 'bill',
    EMI: 'home',
    Entertainment: 'music',
    Transport: 'arrow',
    Shopping: 'bag',
    Health: 'heart',
    Education: 'book',
    Salary: 'down',
    Other: 'wallet',
  }).map(([k, v]) => [k, iconSvg(v)]),
);
const colors = ['#8fab93', '#c4ac80', '#a7bac7', '#b6a5bf', '#cfaaa1', '#c8c5a6'];
const titles = {
  overview: [
    'Your money, in perspective.',
    'A clear view of where you are, and where you’re headed.',
  ],
  transactions: ['Every little detail.', 'Your income and spending, all in one place.'],
  budgets: ['A plan for your money.', 'Give each category a little direction.'],
  goals: [
    'Make room for what matters.',
    'Small steps today. Something to look forward to tomorrow.',
  ],
  recurring: ['Stay a step ahead.', 'Keep an eye on the payments that come around again.'],
  settings: ['Make yourself at home.', 'Your preferences, your data, your workspace.'],
};
document
  .querySelectorAll('[data-icon]')
  .forEach((node) => (node.innerHTML = iconSvg(node.dataset.icon)));
let data,
  selected = monthOf(),
  view = 'overview',
  page = 1,
  search = '',
  filterType = 'all',
  filterCategory = 'all',
  sort = 'newest',
  submitEditor = null,
  toastTimer,
  blocked = false;
function money(value, compact = false) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: data?.userProfile.currency || 'INR',
    maximumFractionDigits: compact ? 0 : 2,
    minimumFractionDigits: compact ? 0 : 2,
    notation: compact && Math.abs(value) >= 1000000 ? 'compact' : 'standard',
  }).format(value);
}
function compact(value) {
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}
function monthLabel(m = selected) {
  return new Date(`${m}-01T12:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}
function dateLabel(d) {
  return new Date(`${d}T12:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}
function toast(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').hidden = true), 4500);
}
function safe(action) {
  try {
    action();
  } catch (error) {
    toast(error.message);
  }
}
function reload() {
  data = store.getData();
  render();
}
function empty(title, description, action = 'Add your first transaction', kind = 'transaction') {
  return `<div class="empty"><div class="empty-icon">${iconSvg('arrow')}</div><h3>${esc(title)}</h3><p>${esc(description)}</p>${action ? `<button class="button primary" data-action="${kind}">${esc(action)}</button>` : ''}</div>`;
}
function header(title, sub = '', action = '', target = '') {
  return `<div class="panel-header"><div><h2>${title}</h2>${sub ? `<p class="subtext">${sub}</p>` : ''}</div>${action ? `<a class="button quiet" href="#${target}">${action} ${iconSvg('arrow')}</a>` : ''}</div>`;
}
function stat(label, value, note, icon, featured = false) {
  return `<article class="stat${featured ? ' featured' : ''}"><div class="stat-top"><span>${label}</span><span class="stat-icon">${{ '◈': iconSvg('wallet'), '↓': iconSvg('down'), '↑': iconSvg('up'), '↗': iconSvg('arrow') }[icon]}</span></div><div class="stat-value">${value}</div><div class="stat-foot">${note}</div></article>`;
}
function stats(s) {
  const previous = new Date(`${selected}-01T12:00:00`);
  previous.setMonth(previous.getMonth() - 1);
  const p =
    previous.getFullYear() < 1900
      ? { expense: 0 }
      : summary(
          data,
          monthOf(
            `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}-01`,
          ),
        );
  return `<div class="stats">${stat('Monthly balance', money(s.balance, true), 'Income minus expenses', '◈', true)}${stat('Total income', money(s.income, true), `${s.entries.filter((t) => t.type === 'Income').length} income entries this month`, '↓')}${stat('Total expenses', money(s.expense, true), p.expense > 0 ? `${Math.abs(((s.expense - p.expense) / p.expense) * 100).toFixed(0)}% ${s.expense > p.expense ? 'more' : 'less'} than last month` : 'Your spending this month', '↑')}${stat('Savings rate', s.savingsRate === null ? '—' : `${s.savingsRate.toFixed(1)}<span style="font-size:17px">%</span>`, s.savingsRate === null ? 'Add income to see your rate' : 'Share of income left over', '↗')}</div>`;
}
function cashflow() {
  const months = [];
  const date = new Date(`${selected}-01T12:00:00`);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(date);
    d.setMonth(d.getMonth() - i);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ m, ...(m < '1900-01' ? { income: 0, expense: 0 } : summary(data, m)) });
  }
  const max = Math.max(...months.flatMap((m) => [m.income, m.expense]), 1);
  return `<section class="panel">${header('Cash flow', 'A little perspective on the last 6 months')}<div class="legend"><span><i class="dot"></i> Income</span><span><i class="dot expense"></i> Expenses</span></div><div class="cashchart" role="img" aria-label="Six-month income and expense comparison"><div class="y-axis"><span>${compact(max)}</span><span>${compact(max * 0.75)}</span><span>${compact(max * 0.5)}</span><span>${compact(max * 0.25)}</span><span>0</span></div><div class="bar-area">${months.map((m) => `<div class="bar-month"><div class="bars" title="${monthLabel(m.m)}: income ${money(m.income)}, expenses ${money(m.expense)}"><span class="bar" style="height:${(m.income / max) * 100}%"></span><span class="bar expense" style="height:${(m.expense / max) * 100}%"></span></div><small>${new Date(`${m.m}-01T12:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</small></div>`).join('')}</div></div><details class="subtext"><summary>View chart values</summary><ul>${months.map((m) => `<li>${monthLabel(m.m)}: income ${money(m.income)}, expenses ${money(m.expense)}</li>`).join('')}</ul></details><div class="chart-bottom"><strong>Consistency is a good place to start.</strong><span>Income vs. expenses</span></div></section>`;
}
function spending(s) {
  const entries = Object.entries(s.spent)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const groups =
    entries.length > 5
      ? [...entries.slice(0, 4), ['Remaining', entries.slice(4).reduce((n, [, v]) => n + v, 0)]]
      : entries;
  let offset = 0;
  const gradient = groups
    .map(([, v], i) => {
      const start = offset;
      offset += (v / s.expense) * 100;
      return `${colors[i]} ${start}% ${offset}%`;
    })
    .join(',');
  return `<section class="panel">${header('Where it went', 'A breakdown of this month’s spending')}<div class="spending-chart"><div class="donut" style="background:${gradient ? `conic-gradient(${gradient})` : 'var(--line)'}" role="img" aria-label="Total spending ${money(s.expense)}"><div class="donut-label"><small>Total spent</small><strong>${money(s.expense, true)}</strong></div></div><div class="category-legend">${groups.length ? groups.map(([c, v], i) => `<div><i style="background:${colors[i]}"></i><span>${esc(c)}</span><b>${((v / s.expense) * 100).toFixed(0)}%</b></div>`).join('') : '<p class="subtext">Your categories will appear here after your first expense.</p>'}</div></div><div class="spending-total"><span>${entries.length} spending categories</span><strong>${monthLabel()}</strong></div></section>`;
}
function ledger(entries) {
  return `<div class="table-wrap"><table class="ledger"><thead><tr><th>Description</th><th class="category-col">Category</th><th class="date-col">Date</th><th>Amount</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${entries.map((t) => `<tr><td><div class="description-cell"><span class="category-icon">${icons[t.category]}</span><div><strong>${esc(t.desc)}</strong><small>${t.type}${t.recurringId ? ' · Recurring' : ''}<span class="mobile-label"> · ${dateLabel(t.date)}</span></small></div></div></td><td class="category-col"><span class="badge ${t.type.toLowerCase()}">${esc(t.category)}</span></td><td class="date-col" style="color:var(--muted)">${dateLabel(t.date)}</td><td class="amount ${t.type === 'Income' ? 'positive' : ''}">${t.type === 'Income' ? '+' : '−'}${money(t.amount)}</td><td><div class="table-actions"><button class="icon-button" data-action="transaction" data-id="${esc(t.id)}" aria-label="Edit ${esc(t.desc)}">${iconSvg('edit')}</button><button class="icon-button" data-action="delete-transaction" data-id="${esc(t.id)}" aria-label="Delete ${esc(t.desc)}">×</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function budgetRows(s, limit = 4) {
  const budgets = Object.entries(s.budgets)
    .filter(([, v]) => v > 0)
    .slice(0, limit);
  return budgets.length
    ? budgets
        .map(([c, v]) => {
          const spent = s.spent[c] || 0,
            pct = (spent / v) * 100;
          return `<div class="budget-row"><div class="budget-title"><strong>${esc(c)}</strong><small>${money(spent, true)} <span>/ ${money(v, true)}</span></small></div><div class="progress ${pct >= 100 ? 'over' : pct >= 80 ? 'warning' : ''}" role="progressbar" aria-label="${esc(c)} budget used" aria-valuenow="${Math.round(Math.min(pct, 100))}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.min(pct, 100)}%"></span></div><div class="budget-foot"><span>${pct.toFixed(0)}% used</span><span>${money(Math.abs(v - spent), true)} ${spent > v ? 'over budget' : 'left'}</span></div></div>`;
        })
        .join('')
    : empty(
        'A little plan goes a long way.',
        'Set a category budget for this month.',
        'Set your first budget',
        'budget',
      );
}
function goalTile(g) {
  const pct = (g.saved / g.target) * 100;
  return `<article class="goal-tile"><span class="goal-icon">${iconSvg('flag')}</span><h3>${esc(g.name)}</h3><p><strong>${money(g.saved, true)}</strong> / ${money(g.target, true)}</p><div class="progress"><span style="width:${pct}%"></span></div><div class="goal-meta"><span>${pct.toFixed(0)}% of the way there</span><a href="#goals">View goal ${iconSvg('arrow')}</a></div></article>`;
}
function overview(s) {
  return `${!data.transactions.length ? `<section class="welcome-card"><div><h2>A fresh start for your finances.</h2><p>Add your first transaction, or take a look around with sample data.</p></div><button class="button" data-action="sample">Explore sample workspace ↗</button></section>` : ''}${stats(s)}<div class="dashboard-grid">${cashflow()}${spending(s)}</div><div class="dashboard-grid"><section class="panel">${header('Recent transactions', 'The little things add up.', 'View all', 'transactions')}${s.entries.length ? ledger([...s.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)) : empty('Your month starts here.', 'Record an income or expense to see it in your overview.')}</section><section class="panel">${header('Monthly budgets', 'A plan you can actually keep.', 'Manage', 'budgets')}${budgetRows(s)}${Object.values(s.budgets).some((v) => v > 0) ? `<div class="insight"><strong>Keep a little breathing room.</strong><br>${money(s.forecast, true)} projected spending ${selected === monthOf() ? 'at this month’s daily pace' : 'for this period'}. ${s.elapsed ? 'Based on elapsed calendar days.' : 'No elapsed days yet.'}</div>` : ''}</section></div><section class="panel">${header('Little by little, closer to your goals', 'Make room for something that matters.', 'View goals', 'goals')}${data.goals.length ? `<div class="goals-strip">${data.goals.slice(0, 3).map(goalTile).join('')}</div>` : empty('What are you working towards?', 'A rainy day fund, a new laptop, a trip worth saving for.', 'Create a savings goal', 'goal')}</section>`;
}
function filtered(s) {
  return s.entries
    .filter(
      (t) =>
        (filterType === 'all' || t.type === filterType) &&
        (filterCategory === 'all' || t.category === filterCategory) &&
        `${t.desc} ${t.category}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'amount'
        ? b.amount - a.amount
        : sort === 'oldest'
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date),
    );
}
function transactions(s) {
  const entries = filtered(s),
    pages = Math.max(1, Math.ceil(entries.length / 10));
  page = Math.min(page, pages);
  return `<section class="panel">${header('Transaction history', `${monthLabel()} · ${s.entries.length} entries`)}<div class="filterbar"><label>Search transactions<input id="search" type="search" placeholder="Search a description or category" value="${esc(search)}" maxlength="120"></label><label>Type<select id="type-filter"><option value="all">All types</option>${['Income', 'Expense'].map((t) => `<option ${filterType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label>Category<select id="category-filter"><option value="all">All categories</option>${CATEGORIES.map((t) => `<option ${filterCategory === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label>Sort by<select id="sort-filter"><option value="newest" ${sort === 'newest' ? 'selected' : ''}>Newest first</option><option value="oldest" ${sort === 'oldest' ? 'selected' : ''}>Oldest first</option><option value="amount" ${sort === 'amount' ? 'selected' : ''}>Highest amount</option></select></label><button class="button" data-action="csv">↓ Export CSV</button><button class="button" data-action="print">Print / PDF</button></div><p class="filters-caption">${entries.length} matching entries · Expenses ${money(entries.filter((t) => t.type === 'Expense').reduce((n, t) => n + Math.round(t.amount * 100), 0) / 100)}<span class="print-title">Currency: ${data.userProfile.currency} · ${monthLabel()}</span></p>${entries.length ? ledger(entries.slice((page - 1) * 10, page * 10)) : empty('Nothing here just yet.', s.entries.length ? 'Try another search or clear your filters.' : 'Add your first entry for this month.', s.entries.length ? 'Clear filters' : 'Add transaction', s.entries.length ? 'clear-filters' : 'transaction')}<div class="pagination"><button class="button" data-action="previous" ${page === 1 ? 'disabled' : ''}>← Previous</button><span>Page ${page} of ${pages}</span><button class="button" data-action="next" ${page === pages ? 'disabled' : ''}>Next →</button></div></section>`;
}
function budgets(s) {
  const entries = Object.entries(s.budgets).filter(([, v]) => v > 0);
  return `<div class="panel-header"><p class="notes">Budgets apply to ${monthLabel()}. Income categories are excluded from spending.<br>Set a different plan for each month. Removing a budget keeps its transactions.</p><button class="button primary" data-action="budget">＋ Set budget</button></div>${
    entries.length
      ? `<div class="cards-grid">${entries
          .map(([c, v]) => {
            const spent = s.spent[c] || 0;
            return `<section class="panel"><div class="panel-header"><h3>${icons[c]} ${esc(c)}</h3><span class="badge">Monthly</span></div><div class="number">${money(v, true)}</div><p class="card-note">${money(spent, true)} spent this month</p>${budgetRows({ ...s, budgets: { [c]: v } }, 1)}<div class="card-actions"><button class="button" data-action="budget" data-id="${esc(c)}">Edit budget</button><button class="button danger" data-action="delete-budget" data-id="${esc(c)}">Remove</button></div></section>`;
          })
          .join('')}</div>`
      : `<section class="panel">${empty('Give your spending a little direction.', 'Choose a category and a monthly limit to get started.', 'Set your first budget', 'budget')}</section>`
  }`;
}
function goals() {
  return `<div class="panel-header"><p class="notes">Track money you’ve set aside, independently of your transaction balance.<br>Updating a goal doesn’t create a transfer or expense.</p><button class="button primary" data-action="goal">＋ New goal</button></div>${data.goals.length ? `<div class="cards-grid">${data.goals.map((g) => `<section class="panel"><div class="panel-header"><h3>${iconSvg('flag')} ${esc(g.name)}</h3><span class="badge">${g.saved === g.target ? 'Complete' : 'In progress'}</span></div><div class="number">${money(g.saved, true)}</div><p class="card-note">of ${money(g.target, true)} · ${money(g.target - g.saved, true)} to go</p><div class="progress"><span style="width:${(g.saved / g.target) * 100}%"></span></div><div class="card-actions"><button class="button primary" data-action="contribute" data-id="${esc(g.id)}" ${g.saved === g.target ? 'disabled' : ''}>Add savings</button><button class="button" data-action="goal" data-id="${esc(g.id)}">Edit</button><button class="button danger" data-action="delete-goal" data-id="${esc(g.id)}">Delete</button></div></section>`).join('')}</div>` : `<section class="panel">${empty('Every goal starts somewhere.', 'Choose a target and track your progress at your own pace.', 'Create a savings goal', 'goal')}</section>`}`;
}
function recurring() {
  return `<div class="panel-header"><p class="notes">Monthly reminders, not automatic payments. Record each due entry once.<br>Dates near month-end adjust to the last calendar day.</p><button class="button primary" data-action="recurring">＋ Recurring entry</button></div>${
    data.recurring.length
      ? `<div class="cards-grid">${data.recurring
          .map((r) => {
            const status = recurringStatus(data, r, selected);
            return `<section class="panel"><div class="panel-header"><h3>${icons[r.category]} ${esc(r.desc)}</h3><span class="badge">${status}</span></div><div class="number">${money(r.amount, true)}</div><p class="card-note">${r.type} · ${r.category}<br>${status === 'Not started' ? `Starts ${monthLabel(r.startMonth)}` : `${dateLabel(dueDate(r, selected))}, ${selected.slice(0, 4)}`} · Monthly</p><div class="card-actions"><button class="button primary" data-action="record" data-id="${esc(r.id)}" ${status === 'Due' ? '' : 'disabled'}>${status === 'Recorded' ? 'Recorded ✓' : 'Record entry'}</button><button class="button" data-action="recurring" data-id="${esc(r.id)}">Edit</button><button class="button danger" data-action="delete-recurring" data-id="${esc(r.id)}">Delete</button></div></section>`;
          })
          .join('')}</div>`
      : `<section class="panel">${empty('One less thing to remember.', 'Add rent, subscriptions or regular income. You decide when to record it.', 'Create recurring entry', 'recurring')}</section>`
  }`;
}
function settings() {
  return `<div class="settings-grid"><section class="panel"><h2>Workspace preferences</h2><form id="profile-form"><label>Your name<input name="firstName" value="${esc(data.userProfile.firstName)}" maxlength="60" placeholder="How should we call you?"></label><label>Display currency<select name="currency">${CURRENCIES.map((c) => `<option ${c === data.userProfile.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></label><p class="notes">Currency changes the label only. Existing amounts are not converted.</p><button class="button primary" type="submit">Save preferences</button></form></section><section class="panel"><h2>Keep a copy of what matters</h2><p>Download a complete JSON backup of transactions, budgets, goals and recurring entries. Restore it on another browser whenever you need to.</p><p>Restoring replaces this workspace. Export your current data first.</p><div class="card-actions"><button class="button primary" data-action="backup">↓ Download backup</button><button class="button" data-action="import">↑ Restore backup</button></div></section><section class="panel"><h2>A workspace that stays with you</h2><p>MoneyMap runs locally in your browser. No account or password is needed. Your records stay in this browser profile and don’t sync across devices. Clearing browser data removes them, so keep backups.</p><p>Try sample data in an empty workspace to explore the features.</p><button class="button" data-action="sample" ${data.transactions.length || data.goals.length || data.recurring.length || Object.keys(data.monthlyBudgets).length || Object.values(data.budgets).some((v) => v > 0) ? 'disabled' : ''}>Explore sample workspace</button></section><section class="panel"><h2>About MoneyMap</h2><p>A calmer place to understand everyday finances. Built with HTML, CSS and JavaScript, without a backend or build step.</p><p>Have an idea or found something that doesn’t work?</p><a class="button" href="https://github.com/taksh1507/MoneyMap-Finance-Tracker/issues" target="_blank" rel="noopener noreferrer">Open project issues ↗</a><div class="card-actions"><button class="button danger" data-action="reset">Reset workspace</button></div></section></div>`;
}
function render() {
  const s = summary(data, selected);
  document.documentElement.dataset.theme = data.theme;
  $('theme-toggle').innerHTML = iconSvg(data.theme === 'dark' ? 'sun' : 'moon');
  $('theme-toggle').ariaLabel = `Switch to ${data.theme === 'dark' ? 'light' : 'dark'} theme`;
  $('profile-label').textContent = data.userProfile.firstName || 'Your workspace';
  $('avatar').textContent = (data.userProfile.firstName || 'Y').slice(0, 1).toUpperCase();
  $('sample-banner').hidden = !data.containsDemo;
  document.querySelectorAll('[data-view]').forEach((a) => {
    a.classList.toggle('active', a.dataset.view === view);
    if (a.dataset.view === view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('page-title').textContent = titles[view][0];
  $('page-description').textContent = titles[view][1];
  $('crumb').textContent =
    view === 'goals' ? 'Savings goals' : view[0].toUpperCase() + view.slice(1);
  $('selected-month').value = selected;
  $('view').innerHTML =
    view === 'overview'
      ? overview(s)
      : view === 'transactions'
        ? transactions(s)
        : view === 'budgets'
          ? budgets(s)
          : view === 'goals'
            ? goals()
            : view === 'recurring'
              ? recurring()
              : settings();
  document.title = `${$('crumb').textContent} — MoneyMap`;
}
const optionList = (values, current) =>
  values
    .map((v) => `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(v)}</option>`)
    .join('');
function field(label, name, value = '', type = 'text', extra = '', wide = false) {
  return `<label class="${wide ? 'wide' : ''}">${label}<input name="${name}" type="${type}" value="${esc(value)}" required ${extra}></label>`;
}
function select(label, name, values, value, extra = '') {
  return `<label>${label}<select name="${name}" aria-label="${esc(label)}" ${extra}>${optionList(values, value)}</select></label>`;
}
function openEditor(title, fields, onSubmit, save = 'Save changes') {
  $('dialog-title').textContent = title;
  $('dialog-fields').innerHTML = `<div class="form-grid">${fields}</div>`;
  $('form-error').textContent = '';
  $('dialog-save').textContent = save;
  submitEditor = onSubmit;
  $('editor').showModal();
}
function transactionEditor(id) {
  const t = data.transactions.find((t) => t.id === id) || {
    date: today(),
    desc: '',
    amount: '',
    type: 'Expense',
    category: 'Food',
  };
  openEditor(
    id ? 'Edit transaction' : 'Add transaction',
    field('Description', 'desc', t.desc, 'text', 'maxlength="120"', true) +
      field('Amount', 'amount', t.amount, 'number', 'min="0.01" max="1000000000" step="0.01"') +
      field('Date', 'date', t.date, 'date', 'min="1900-01-01" max="2199-12-31"') +
      select('Type', 'type', ['Expense', 'Income'], t.type) +
      select('Category', 'category', CATEGORIES, t.category),
    (f) => {
      const value = { ...f, amount: Number(f.amount) };
      if (id) store.editTransaction(id, value);
      else store.addTransaction(value);
      if (monthOf(f.date) !== selected) selected = monthOf(f.date);
    },
    id ? 'Save changes' : 'Add transaction',
  );
}
function budgetEditor(category) {
  const budgets = summary(data, selected).budgets;
  openEditor(
    'Set monthly budget',
    select(
      'Category',
      'category',
      CATEGORIES.filter((c) => c !== 'Salary'),
      category,
    ) +
      field(
        'Monthly limit',
        'limit',
        category ? budgets[category] : '',
        'number',
        'min="0.01" max="1000000000" step="0.01"',
      ) +
      `<p class="notes wide">For ${monthLabel()}. Saving replaces the limit for this category.</p>`,
    (f) => store.setBudget(selected, f.category, Number(f.limit)),
    'Save budget',
  );
}
function goalEditor(id) {
  const g = data.goals.find((g) => g.id === id) || { name: '', target: '', saved: 0 };
  openEditor(
    id ? 'Edit savings goal' : 'Create savings goal',
    field('Goal name', 'name', g.name, 'text', 'maxlength="60"', true) +
      field(
        'Target amount',
        'target',
        g.target,
        'number',
        'min="0.01" max="1000000000" step="0.01"',
      ) +
      field('Already saved', 'saved', g.saved, 'number', 'min="0" max="1000000000" step="0.01"'),
    (f) => store.putGoal({ ...f, id, target: Number(f.target), saved: Number(f.saved) }),
    'Save goal',
  );
}
function recurringEditor(id) {
  const r = data.recurring.find((r) => r.id === id) || {
    desc: '',
    amount: '',
    type: 'Expense',
    category: 'Bills',
    day: 1,
    startMonth: selected,
  };
  openEditor(
    id ? 'Edit recurring entry' : 'New recurring entry',
    field('Description', 'desc', r.desc, 'text', 'maxlength="120"', true) +
      field('Amount', 'amount', r.amount, 'number', 'min="0.01" max="1000000000" step="0.01"') +
      field('Day of month', 'day', r.day, 'number', 'min="1" max="31" step="1"') +
      select('Type', 'type', ['Expense', 'Income'], r.type) +
      select('Category', 'category', CATEGORIES, r.category) +
      field('Starts in', 'startMonth', r.startMonth, 'month', 'min="1900-01" max="2199-12"', true),
    (f) => store.putRecurring({ ...f, id, amount: Number(f.amount), day: Number(f.day) }),
    'Save recurring entry',
  );
}
function download(content, type, name) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function printReport() {
  const entries = filtered(summary(data, selected));
  const report = document.createElement('section');
  report.id = 'print-report';
  report.innerHTML = `<h1>MoneyMap · Transaction report</h1><p>${monthLabel()} · Currency ${data.userProfile.currency}</p><p>${entries.length} entries · Type: ${esc(filterType)} · Category: ${esc(filterCategory)}${search ? ` · Search: ${esc(search)}` : ''}</p>${ledger(entries)}<p>Income: ${money(entries.filter((t) => t.type === 'Income').reduce((n, t) => n + Math.round(t.amount * 100), 0) / 100)} · Expenses: ${money(entries.filter((t) => t.type === 'Expense').reduce((n, t) => n + Math.round(t.amount * 100), 0) / 100)}</p>`;
  document.body.append(report);
  document.body.dataset.printReport = 'true';
  try {
    window.print();
  } finally {
    report.remove();
    delete document.body.dataset.printReport;
  }
}
function demo() {
  if (
    data.transactions.length ||
    data.goals.length ||
    data.recurring.length ||
    Object.values(data.budgets).some((v) => v > 0) ||
    Object.keys(data.monthlyBudgets).length
  )
    throw new Error('Sample data can only be loaded into an empty workspace.');
  if (!confirm('Load a sample workspace? These are example entries, not your actual finances.'))
    return;
  const d = emptyData();
  d.userProfile = { ...data.userProfile };
  d.theme = data.theme;
  d.containsDemo = true;
  const date = new Date();
  const records = [
    ['Monthly salary', 'Salary', 'Income', 68000, 1],
    ['Grocery run', 'Food', 'Expense', 2450, 3],
    ['Netflix subscription', 'Entertainment', 'Expense', 649, 4],
    ['Apartment rent', 'Bills', 'Expense', 15000, 5],
    ['Coffee & catch-up', 'Food', 'Expense', 420, 7],
    ['Metro card top-up', 'Transport', 'Expense', 800, 8],
    ['New running shoes', 'Shopping', 'Expense', 3200, 10],
    ['Freelance project', 'Other', 'Income', 8500, 12],
    ['Weekend dinner', 'Food', 'Expense', 1650, 13],
  ];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(date.getFullYear(), date.getMonth() - i, 1);
    const prefix = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    records.forEach(([desc, category, type, n, day]) => {
      d.transactions.push({
        id: crypto.randomUUID(),
        date: `${prefix}-${String(i === 0 ? Math.min(day, date.getDate()) : day).padStart(2, '0')}`,
        desc,
        category,
        type,
        amount: Math.round(n * (i === 0 ? 1 : 1 - i * 0.055) * 100) / 100,
      });
    });
  }
  d.monthlyBudgets[monthOf()] = { Food: 6500, Bills: 20000, Entertainment: 2000, Shopping: 5000 };
  d.goals = [
    { id: crypto.randomUUID(), name: 'Emergency fund', target: 100000, saved: 62000 },
    { id: crypto.randomUUID(), name: 'A little getaway', target: 40000, saved: 18500 },
    { id: crypto.randomUUID(), name: 'New laptop', target: 80000, saved: 24000 },
  ];
  d.recurring = [
    {
      id: crypto.randomUUID(),
      desc: 'Internet subscription',
      amount: 999,
      day: 1,
      type: 'Expense',
      category: 'Bills',
      startMonth: monthOf(),
    },
  ];
  store.saveData(d);
  selected = monthOf();
  reload();
  toast('Sample workspace loaded. Example data is clearly marked.');
}
const actions = {
  transaction: transactionEditor,
  budget: budgetEditor,
  goal: goalEditor,
  recurring: recurringEditor,
  sample: demo,
  backup: () => {
    download(store.getRawBackup(), 'application/json', `moneymap-backup-${today()}.json`);
    toast('Backup downloaded. Keep it somewhere you can find it.');
  },
  csv: () => {
    download(
      csv(filtered(summary(data, selected)), data.userProfile.currency),
      'text/csv;charset=utf-8',
      `moneymap-${selected}.csv`,
    );
    toast('Matching transactions exported.');
  },
  print: printReport,
  import: () => $('import-file').click(),
  previous: () => {
    page--;
    render();
  },
  next: () => {
    page++;
    render();
  },
  'clear-filters': () => {
    search = '';
    filterType = filterCategory = 'all';
    page = 1;
    render();
  },
  record: (id) => {
    store.recordRecurring(id, selected);
    reload();
    toast('Recurring entry added to your transactions.');
  },
  contribute: (id) => {
    const g = data.goals.find((g) => g.id === id);
    openEditor(
      'Add to your savings',
      field(
        'Amount to set aside',
        'contribution',
        '',
        'number',
        `min="0.01" max="${g.target - g.saved}" step="0.01"`,
        true,
      ) +
        `<p class="notes wide">${esc(g.name)} · ${money(g.target - g.saved)} left. This updates your goal only.</p>`,
      (f) => {
        const contribution = amount(Number(f.contribution));
        store.putGoal({
          ...g,
          saved: (Math.round(g.saved * 100) + Math.round(contribution * 100)) / 100,
        });
      },
      'Add savings',
    );
  },
  'delete-transaction': (id) => {
    if (confirm('Delete this transaction? This cannot be undone.')) {
      store.deleteTransaction(id);
      reload();
      toast('Transaction deleted.');
    }
  },
  'delete-budget': (category) => {
    if (confirm(`Remove the ${category} budget for ${monthLabel()}? Transactions will stay.`)) {
      store.setBudget(selected, category, 0);
      reload();
      toast('Budget removed.');
    }
  },
  'delete-goal': (id) => {
    if (confirm('Delete this savings goal? Your transactions will stay.')) {
      store.mutate((d) => (d.goals = d.goals.filter((g) => g.id !== id)));
      reload();
      toast('Goal deleted.');
    }
  },
  'delete-recurring': (id) => {
    if (confirm('Delete this reminder? Recorded transactions will stay.')) {
      store.mutate((d) => (d.recurring = d.recurring.filter((g) => g.id !== id)));
      reload();
      toast('Recurring entry deleted.');
    }
  },
  reset: () => {
    openEditor(
      'Reset this workspace',
      `<p class="notes wide">This removes all saved transactions, budgets, goals and reminders from this browser. Download a backup first. Type RESET to continue.</p>` +
        field('Confirmation', 'confirmation', '', 'text', 'pattern="RESET"', true),
      (f) => {
        if (f.confirmation !== 'RESET') throw new Error('Type RESET to continue.');
        store.saveData(emptyData());
      },
      'Reset workspace',
    );
  },
};
$('editor-form').addEventListener('submit', (e) => {
  e.preventDefault();
  try {
    submitEditor(Object.fromEntries(new FormData(e.currentTarget)));
    $('editor').close();
    reload();
    toast('Saved to your workspace.');
  } catch (error) {
    $('form-error').textContent = error.message;
  }
});
document
  .querySelectorAll('[data-close]')
  .forEach((b) => b.addEventListener('click', () => $('editor').close()));
$('editor').addEventListener('click', (e) => {
  if (e.target === $('editor')) {
    const r = $('editor').getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      $('editor').close();
  }
});
$('view').addEventListener('click', (e) => {
  const button = e.target.closest('[data-action]');
  if (button && !button.disabled && !blocked)
    safe(() => actions[button.dataset.action]?.(button.dataset.id));
});
$('view').addEventListener('input', (e) => {
  if (e.target.id === 'search') {
    search = e.target.value;
    page = 1;
    const start = e.target.selectionStart;
    render();
    $('search').focus();
    $('search').setSelectionRange(start, start);
  }
});
$('view').addEventListener('change', (e) => {
  const id = e.target.id;
  if (id === 'type-filter') filterType = e.target.value;
  else if (id === 'category-filter') filterCategory = e.target.value;
  else if (id === 'sort-filter') sort = e.target.value;
  else return;
  page = 1;
  render();
});
$('view').addEventListener('submit', (e) => {
  if (e.target.id === 'profile-form') {
    e.preventDefault();
    safe(() => {
      const form = Object.fromEntries(new FormData(e.target));
      store.mutate((d) => {
        d.userProfile.firstName = form.firstName.trim();
        d.userProfile.currency = form.currency;
      });
      reload();
      toast('Workspace preferences saved.');
    });
  }
});
$('selected-month').addEventListener('change', (e) =>
  safe(() => {
    summary(data, e.target.value);
    selected = e.target.value;
    page = 1;
    render();
  }),
);
$('add-entry').addEventListener('click', () => {
  if (!blocked) transactionEditor();
});
$('theme-toggle').addEventListener('click', () =>
  safe(() => {
    if (blocked) return;
    store.mutate((d) => (d.theme = d.theme === 'light' ? 'dark' : 'light'));
    reload();
  }),
);
$('menu-button').addEventListener('click', () => {
  const open = $('sidebar').classList.toggle('open');
  $('menu-button').setAttribute('aria-expanded', open);
  if (open) document.querySelector('nav a.active')?.focus();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const wasOpen = $('sidebar').classList.contains('open');
    $('sidebar').classList.remove('open');
    if (wasOpen) $('menu-button').focus();
    $('menu-button').setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('click', (e) => {
  if (!$('sidebar').contains(e.target) && !$('menu-button').contains(e.target)) {
    $('sidebar').classList.remove('open');
    $('menu-button').setAttribute('aria-expanded', 'false');
  }
});
function route(event) {
  const target = location.hash.slice(1);
  view = Object.hasOwn(titles, target) ? target : 'overview';
  page = 1;
  $('sidebar').classList.remove('open');
  $('menu-button').setAttribute('aria-expanded', 'false');
  if (!blocked) render();
  if (event?.type === 'hashchange') $('main').focus({ preventScroll: true });
}
window.addEventListener('hashchange', route);
window.addEventListener('storage', (e) => {
  if (e.key === store.STORAGE_KEY || e.key === null) {
    if ($('editor').open) {
      $('editor').close();
      toast('Workspace changed in another tab. Please reopen your edit.');
    }
    safe(() => reload());
  }
});
$('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('Choose a backup smaller than 10 MB.');
    const raw = await file.text();
    const { normalizeData } = await import('./model.js');
    let input;
    try {
      input = normalizeData(JSON.parse(raw));
    } catch {
      throw new Error(
        'This file is not a valid MoneyMap backup. Your current data has not changed.',
      );
    }
    openEditor(
      'Restore your workspace',
      `<p class="notes wide">This backup contains ${input.transactions.length} transactions, ${input.goals.length} goals and ${input.recurring.length} recurring entries. Currency: ${input.userProfile.currency}.</p><p class="notes wide">Restoring replaces all current data. Download your current backup first. Type RESTORE to confirm.</p>` +
        field('Confirmation', 'confirmation', '', 'text', 'pattern="RESTORE"', true),
      (f) => {
        if (f.confirmation !== 'RESTORE') throw new Error('Type RESTORE to continue.');
        store.restoreBackup(raw);
        blocked = false;
        $('storage-error').hidden = true;
        $('add-entry').disabled = false;
      },
      'Restore backup',
    );
  } catch (error) {
    toast(error.message);
  }
});
try {
  data = store.getData();
  route();
} catch (error) {
  blocked = true;
  data = emptyData();
  $('storage-error').textContent = error.message;
  $('storage-error').hidden = false;
  $('add-entry').disabled = true;
  $('view').innerHTML =
    `<section class="panel"><h2>Recover your workspace</h2><p class="card-note">Your original saved data has been left untouched. Download it before choosing a valid backup to restore.</p><div class="card-actions"><button id="recover-download" class="button">Download original data</button><button id="recover-import" class="button primary">Restore valid backup</button></div></section>`;
  $('recover-download').addEventListener('click', () => safe(actions.backup));
  $('recover-import').addEventListener('click', actions.import);
}
