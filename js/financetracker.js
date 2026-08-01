import {
  addTransaction,
  deleteTransaction,
  getTransactions,
  getBudgets,
  updateBudgets,
} from './storage.js';

let budgetChart, expensesChart;

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
  updateBudgets(newBudgets);
  renderDashboard();
}

function handleAddTransaction() {
  const date = document.getElementById('transactionDate').value;
  const desc = document.getElementById('transactionDesc').value;
  const amount = parseFloat(document.getElementById('transactionAmount').value);
  const type = document.getElementById('transactionType').value;
  const category = document.getElementById('transactionCategory').value;

  if (!date || !desc || isNaN(amount) || amount <= 0) {
    alert('Please enter valid transaction details.');
    return;
  }

  addTransaction({ date, desc, amount, type, category });
  
  // Clear inputs
  document.getElementById('transactionDesc').value = '';
  document.getElementById('transactionAmount').value = '';

  renderDashboard();
}

// Ensure deleteTransaction and editTransaction are accessible from inline HTML string
window.removeTransaction = function(id) {
  if (confirm('Are you sure you want to delete this transaction?')) {
    deleteTransaction(id);
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
    
    // Remove the old transaction so the user can save the updated one
    deleteTransaction(id);
    renderDashboard();
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
      <td style="padding: 10px 0;">${t.date}</td>
      <td style="padding: 10px 0;">${t.desc}</td>
      <td style="padding: 10px 0;">${t.category}</td>
      <td style="padding: 10px 0; color: ${t.type === 'Income' ? '#4BC0C0' : '#FF6384'}">${t.type}</td>
      <td style="padding: 10px 0;">₹${t.amount.toFixed(2)}</td>
      <td style="padding: 10px 0;">
        <button onclick="window.editTransaction('${t.id}')" style="padding: 5px 10px; background: #36A2EB; border: none; border-radius: 4px; color: white; cursor: pointer; margin-right: 5px;">Edit</button>
        <button onclick="window.removeTransaction('${t.id}')" style="padding: 5px 10px; background: #ff4d4d; border: none; border-radius: 4px; color: white; cursor: pointer;">Delete</button>
      </td>
    `;
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

// Initialize application on load
document.addEventListener('DOMContentLoaded', init);
