import {
  addTransaction,
  deleteTransaction,
  editTransaction as updateTransaction,
  getTransactions,
  getBudgets,
  updateBudgets,
} from './storage.js';

let budgetChart, expensesChart;
let editingTransactionId = null;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function init() {
  // Load initial budgets
  const budgets = getBudgets();
  document.getElementById('foodBudget').value = budgets.Food || '';
  document.getElementById('billsBudget').value = budgets.Bills || '';
  document.getElementById('emiBudget').value = budgets.EMI || '';
  document.getElementById('entertainmentBudget').value = budgets.Entertainment || '';

  // Default date to today
  document.getElementById('transactionDate').valueAsDate = new Date();

  // Attach event listeners
  document.getElementById('setBudgetBtn').addEventListener('click', handleSetBudget);
  document.getElementById('addTransactionBtn').addEventListener('click', handleAddTransaction);
  document.getElementById('generatePdfBtn').addEventListener('click', generatePDF);
  document.getElementById('generateCsvBtn').addEventListener('click', generateCSV);

  // Initial render
  renderDashboard();
}

function handleSetBudget() {
  const newBudgets = {
    Food: parseFloat(document.getElementById('foodBudget').value) || 0,
    Bills: parseFloat(document.getElementById('billsBudget').value) || 0,
    EMI: parseFloat(document.getElementById('emiBudget').value) || 0,
    Entertainment: parseFloat(document.getElementById('entertainmentBudget').value) || 0,
  };
  if (Object.values(newBudgets).some(value => !Number.isFinite(value) || value < 0)) {
    alert('Budgets must be finite, non-negative amounts.');
    return;
  }
  updateBudgets(newBudgets);
  renderDashboard();
}

function handleAddTransaction() {
  const date = document.getElementById('transactionDate').value;
  const desc = document.getElementById('transactionDesc').value.trim();
  const amount = parseFloat(document.getElementById('transactionAmount').value);
  const type = document.getElementById('transactionType').value;
  const category = document.getElementById('transactionCategory').value;

  if (!date || !desc || !Number.isFinite(amount) || amount <= 0) {
    alert('Please enter valid transaction details.');
    return;
  }

  if (editingTransactionId !== null) {
    updateTransaction(editingTransactionId, { date, desc, amount, type, category });
    editingTransactionId = null;
    document.getElementById('addTransactionBtn').textContent = 'Add Transaction';
  } else {
    addTransaction({ date, desc, amount, type, category });
  }
  
  // Clear inputs
  document.getElementById('transactionDesc').value = '';
  document.getElementById('transactionAmount').value = '';

  renderDashboard();
}

// Ensure deleteTransaction and editTransaction are accessible from inline HTML string
window.removeTransaction = function(id) {
  if (confirm('Are you sure you want to delete this transaction?')) {
    deleteTransaction(id);
    if (editingTransactionId === id) {
      editingTransactionId = null;
      document.getElementById('transactionDesc').value = '';
      document.getElementById('transactionAmount').value = '';
      document.getElementById('addTransactionBtn').textContent = 'Add Transaction';
    }
    renderDashboard();
  }
};

window.editTransaction = function(id) {
  const transactions = getTransactions();
  const t = transactions.find(t => t.id === id);
  if (t) {
    document.getElementById('transactionDate').value = t.date;
    document.getElementById('transactionDesc').value = t.desc;
    document.getElementById('transactionAmount').value = t.amount;
    document.getElementById('transactionType').value = t.type;
    document.getElementById('transactionCategory').value = t.category;
    
    editingTransactionId = id;
    document.getElementById('addTransactionBtn').textContent = 'Save Changes';
    document.getElementById('transactionDesc').focus();
  }
};

function renderDashboard() {
  const transactions = getTransactions();
  const budgets = getBudgets();

  // Render Table
  const tbody = document.querySelector('#transactionsTable tbody');
  tbody.innerHTML = '';
  
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryExpenses = { Food: 0, Bills: 0, EMI: 0, Entertainment: 0, Salary: 0, Other: 0 };

  transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
    if (t.type === 'Income') {
      totalIncome += t.amount;
    } else {
      totalExpenses += t.amount;
      if (categoryExpenses[t.category] !== undefined) {
        categoryExpenses[t.category] += t.amount;
      } else {
        categoryExpenses.Other += t.amount;
      }
    }

    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    row.innerHTML = `
      <td style="padding: 10px 0;">${escapeHtml(t.date)}</td>
      <td style="padding: 10px 0;">${escapeHtml(t.desc)}</td>
      <td style="padding: 10px 0;">${escapeHtml(t.category)}</td>
      <td style="padding: 10px 0; color: ${t.type === 'Income' ? '#4BC0C0' : '#FF6384'}">${escapeHtml(t.type)}</td>
      <td style="padding: 10px 0;">₹${t.amount.toFixed(2)}</td>
      <td style="padding: 10px 0;">
        <button data-action="edit" class="btn-edit">Edit</button>
        <button data-action="delete" class="btn-delete">Delete</button>
      </td>
    `;
    row.querySelector('[data-action="edit"]').addEventListener('click', () => window.editTransaction(t.id));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => window.removeTransaction(t.id));
    tbody.appendChild(row);
  });

  // Update Summary
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  const monthlySavings = totalIncome - totalExpenses;
  const budgetUtilization = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

  document.getElementById("totalIncome").textContent = totalIncome.toFixed(2);
  document.getElementById("totalBudget").textContent = totalBudget.toFixed(2);
  document.getElementById("totalExpenses").textContent = totalExpenses.toFixed(2);
  document.getElementById("monthlySavings").textContent = monthlySavings.toFixed(2);
  document.getElementById("budgetUtilization").textContent = budgetUtilization.toFixed(2);

  const savingElement = document.getElementById("monthlySavings");
  if(monthlySavings >= 0) {
    savingElement.style.color = '#4BC0C0';
  } else {
    savingElement.style.color = '#FF6384';
  }

  // Calculate Forecast (Simple 30-day projection based on historical average daily expense)
  let totalHistoricalExpenses = 0;
  const expenseDates = new Set();
  transactions.forEach(t => {
    if (t.type === 'Expense') {
      totalHistoricalExpenses += t.amount;
      expenseDates.add(t.date);
    }
  });
  
  let expenseForecast = 0;
  if (expenseDates.size > 0) {
    const avgDailyExpense = totalHistoricalExpenses / expenseDates.size;
    expenseForecast = avgDailyExpense * 30;
  }
  document.getElementById("expenseForecast").textContent = expenseForecast.toFixed(2);

  // Render Charts
  renderCharts(budgets, categoryExpenses);
}

function renderCharts(budgets, categoryExpenses) {
  // Budget Chart
  const budgetCtx = document.getElementById("budgetPieChart").getContext("2d");
  if (budgetChart) budgetChart.destroy();
  
  const budgetLabels = Object.keys(budgets).filter(k => budgets[k] > 0);
  const budgetData = budgetLabels.map(k => budgets[k]);

  budgetChart = new Chart(budgetCtx, {
    type: "pie",
    data: {
      labels: budgetLabels.length > 0 ? budgetLabels : ['No Budget Set'],
      datasets: [{
        data: budgetData.length > 0 ? budgetData : [1],
        backgroundColor: budgetData.length > 0 ? ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"] : ["#333"],
      }],
    },
    options: { responsive: true, plugins: { title: { display: true, text: "Budget Allocation", color: '#fff' }, legend: { labels: { color: '#fff' } } } },
  });

  // Expense Chart
  const expCtx = document.getElementById("expensesBarChart").getContext("2d");
  if (expensesChart) expensesChart.destroy();
  
  const expLabels = Object.keys(categoryExpenses).filter(k => categoryExpenses[k] > 0);
  const expData = expLabels.map(k => categoryExpenses[k]);

  expensesChart = new Chart(expCtx, {
    type: "bar",
    data: {
      labels: expLabels.length > 0 ? expLabels : ['No Expenses'],
      datasets: [{
        label: "Expenses",
        data: expData.length > 0 ? expData : [0],
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"],
      }],
    },
    options: { 
      responsive: true,
      plugins: { legend: { labels: { color: '#fff' } } },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#fff' } },
        x: { ticks: { color: '#fff' } }
      }
    },
  });
}

function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text("Personal Finance Report", 105, 15, null, null, "center");
  doc.setFontSize(12);
  doc.text(`Total Income: INR ${document.getElementById("totalIncome").textContent}`, 20, 30);
  doc.text(`Total Budget: INR ${document.getElementById("totalBudget").textContent}`, 20, 40);
  doc.text(`Total Expenses: INR ${document.getElementById("totalExpenses").textContent}`, 20, 50);
  doc.text(`Monthly Savings: INR ${document.getElementById("monthlySavings").textContent}`, 20, 60);
  doc.text(`Budget Utilization: ${document.getElementById("budgetUtilization").textContent}%`, 20, 70);

  html2canvas(document.getElementById("budgetPieChart")).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");
    doc.addImage(imgData, "PNG", 15, 80, 80, 60);
    html2canvas(document.getElementById("expensesBarChart")).then((canvas2) => {
      const imgData2 = canvas2.toDataURL("image/png");
      doc.addImage(imgData2, "PNG", 110, 80, 80, 60);
      doc.save("personal_finance_report.pdf");
    });
  });
}

function generateCSV() {
  const transactions = getTransactions();
  if (transactions.length === 0) {
    alert("No transactions to export.");
    return;
  }
  
  const csvCell = value => {
    let text = String(value);
    if (/^[\s]*[=+@-]/.test(text) && typeof value !== 'number') text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const headers = ["Date", "Description", "Category", "Type", "Amount"];
  const csvRows = [headers.join(",")];
  
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
    const row = [
      t.date,
      t.desc,
      t.category,
      t.type,
      t.amount
    ];
    csvRows.push(row.map(csvCell).join(","));
  });
  
  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "transactions_report.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Initialize application on load
document.addEventListener('DOMContentLoaded', init);
