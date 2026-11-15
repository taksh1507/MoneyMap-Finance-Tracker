import { test, expect } from '@playwright/test';
const month = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
async function nav(page, name) {
  await page.goto('/#' + name);
  await expect(page.locator('#crumb')).toHaveText(
    name === 'goals' ? 'Savings goals' : name[0].toUpperCase() + name.slice(1),
  );
}
async function add(page, desc, value, type = 'Expense') {
  await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Description', { exact: true }).fill(desc);
  await dialog.getByLabel('Amount', { exact: true }).fill(value);
  await dialog.getByLabel('Type', { exact: true }).selectOption(type);
  await dialog.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
async function noOverflow(page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
}
test('ledger, monthly budgets, goals, reminders and backup restore work together', async ({
  page,
}, info) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByText('A fresh start for your finances.')).toBeVisible();
  await noOverflow(page);
  await add(page, 'Paycheck', '50000', 'Income');
  await add(page, 'Groceries', '2500');
  await nav(page, 'transactions');
  await expect(page.getByRole('cell', { name: 'Groceries Expense' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Groceries', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Amount', { exact: true }).fill('2700');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('−₹2,700.00', { exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('Paycheck');
  await expect(page.getByRole('button', { name: 'Edit Groceries', exact: true })).toHaveCount(0);
  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const csvFile = await csvDownload;
  expect(csvFile.suggestedFilename()).toBe(`moneymap-${month()}.csv`);
  const csvText = await (await import('node:fs/promises')).readFile(await csvFile.path(), 'utf8');
  expect(csvText).toContain('Paycheck');
  expect(csvText).not.toContain('Groceries');
  await page.getByRole('searchbox').fill('');
  await page.getByLabel('Selected month').fill('2020-01');
  await expect(page.getByText('Add your first entry for this month.')).toBeVisible();
  await page.getByLabel('Selected month').fill(month());
  await nav(page, 'budgets');
  await page.getByRole('button', { name: 'Set budget', exact: false }).first().click();
  await page.getByRole('dialog').getByLabel('Category').selectOption('Food');
  await page.getByRole('dialog').getByLabel('Monthly limit').fill('5000');
  await page.getByRole('button', { name: 'Save budget', exact: true }).click();
  await expect(page.getByText('54% used')).toBeVisible();
  await nav(page, 'goals');
  await page.getByRole('button', { name: 'New goal' }).click();
  await page.getByLabel('Goal name').fill('Rainy day');
  await page.getByLabel('Target amount').fill('20000');
  await page.getByLabel('Already saved').fill('1000');
  await page.getByRole('button', { name: 'Save goal', exact: true }).click();
  await page.getByRole('button', { name: 'Add savings', exact: true }).click();
  await page.getByLabel('Amount to set aside').fill('500');
  await page.getByRole('dialog').getByRole('button', { name: 'Add savings', exact: true }).click();
  await expect(page.getByText('₹1,500', { exact: true })).toBeVisible();
  await nav(page, 'recurring');
  await page.getByRole('button', { name: 'Recurring entry', exact: false }).first().click();
  await page.getByLabel('Description', { exact: true }).fill('Internet plan');
  await page.getByRole('dialog').getByLabel('Amount', { exact: true }).fill('999');
  await page.getByLabel('Day of month').fill('1');
  await page.getByRole('button', { name: 'Save recurring entry', exact: true }).click();
  await page.getByRole('button', { name: 'Record entry', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Recorded ✓', exact: true })).toBeDisabled();
  await nav(page, 'settings');
  await page.getByLabel('Your name').fill('Taksh');
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.locator('#profile-label')).toHaveText('Taksh');
  const backupEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const backup = await backupEvent;
  const file = await backup.path();
  await add(page, 'Temporary', '1');
  await page.locator('#import-file').setInputFiles(file);
  await page.getByLabel('Confirmation', { exact: true }).fill('RESTORE');
  await page.getByRole('button', { name: 'Restore backup', exact: true }).last().click();
  await nav(page, 'transactions');
  await expect(page.getByRole('button', { name: 'Edit Temporary', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit Internet plan', exact: true })).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete Groceries', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit Groceries', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Edit Paycheck', exact: true })).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});
test('sample workspace is explicit and renders well at every viewport', async ({ page }, info) => {
  await page.goto('/');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Explore sample workspace' }).click();
  await expect(page.locator('#sample-banner')).toBeVisible();
  await noOverflow(page);
  await expect(page.getByRole('status')).toBeHidden();
  await page.screenshot({ path: test.info().outputPath('overview.png'), fullPage: true });
  await nav(page, 'transactions');
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath('transactions.png'), fullPage: true });
  await nav(page, 'goals');
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath('goals.png'), fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath('dark.png'), fullPage: true });
  await page.getByRole('button', { name: 'New goal' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  if (info.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await page.getByRole('link', { name: 'Budgets', exact: false }).first().click();
    await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
  }
});
test('legacy data survives migration and invalid import does not replace it', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('moneyMapData'))
      localStorage.setItem(
        'moneyMapData',
        JSON.stringify({
          userProfile: { firstName: 'Original', lastName: '', email: '', currency: 'INR' },
          transactions: [
            {
              id: 'legacy-id',
              date: new Date().toLocaleDateString('en-CA'),
              desc: 'Original entry',
              type: 'Expense',
              category: 'Food',
              amount: 123,
            },
          ],
          budgets: { Food: 1000 },
        }),
      );
  });
  await page.goto('/#transactions');
  await expect(
    page.getByRole('button', { name: 'Edit Original entry', exact: true }),
  ).toBeVisible();
  await page.locator('#import-file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"transactions":"wrong"}'),
  });
  await expect(page.getByRole('status')).toContainText('not a valid MoneyMap backup');
  await expect(
    page.getByRole('button', { name: 'Edit Original entry', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit Original entry', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Description', { exact: true })
    .fill('<img src=x onerror=alert(1)>');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('.ledger img')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Edit <img src=x onerror=alert(1)>', exact: true }),
  ).toBeVisible();
});
test('unreadable storage offers recovery instead of deleting records', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('moneyMapData', '{broken'));
  await page.goto('/');
  await expect(page.getByText('Recover your workspace', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add transaction', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('moneyMapData'))).toBe('{broken');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download original data' }).click();
  await event;
});

test('pagination, filtered full reports and theme controls remain usable', async ({ page }) => {
  await page.addInitScript(() => {
    const d = new Date(),
      date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    localStorage.setItem(
      'moneyMapData',
      JSON.stringify({
        version: 2,
        transactions: Array.from({ length: 24 }, (_, i) => ({
          id: `row-${i}`,
          desc: `Entry ${String(i + 1).padStart(2, '0')}`,
          date,
          amount: i + 1,
          type: 'Expense',
          category: 'Food',
        })),
        budgets: {},
        monthlyBudgets: {},
        goals: [],
        recurring: [],
        userProfile: { currency: 'INR' },
      }),
    );
  });
  await page.goto('/#transactions');
  await expect(page.locator('.ledger tbody tr')).toHaveCount(10);
  await page.getByRole('button', { name: 'Next', exact: false }).click();
  await expect(page.getByText('Page 2 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: false }).click();
  await expect(page.locator('.ledger tbody tr')).toHaveCount(4);
  await page.evaluate(() => {
    window.print = () => {
      window.reportHTML = document.getElementById('print-report').outerHTML;
      window.reportCount = document.querySelectorAll('#print-report tbody tr').length;
    };
  });
  await page.getByRole('button', { name: 'Print / PDF' }).click();
  expect(await page.evaluate(() => window.reportCount)).toBe(24);
  await page.getByRole('searchbox').fill('Entry 24');
  await expect(page.locator('.ledger tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Print / PDF' }).click();
  expect(await page.evaluate(() => window.reportCount)).toBe(1);
  expect(await page.evaluate(() => window.reportHTML)).toContain('Entry 24');
  await page.getByLabel('Selected month').fill('1900-01');
  await expect(page.getByText('Add your first entry for this month.')).toBeVisible();
  await nav(page, 'overview');
  await expect(page.locator('.stats')).toBeVisible();
});
test('dialogs handle failed saves, cancel changes and restore keyboard focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await page.getByLabel('Description', { exact: true }).fill('Unsaved entry');
  await page.getByLabel('Amount', { exact: true }).fill('100');
  await page.evaluate(() => {
    window.originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Add transaction', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('could not be saved');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Add transaction', exact: true })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('moneyMapData'))).toBeNull();
  await page.evaluate(() => (Storage.prototype.setItem = window.originalSet));
});

test('workspace has usable labels, contrast and keyboard landmarks', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await page.goto('/');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Explore sample workspace' }).click();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  for (const target of ['transactions', 'budgets', 'goals', 'recurring', 'settings']) {
    await nav(page, target);
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
      [],
    );
  }
  await nav(page, 'overview');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  const dark = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(dark.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
});
