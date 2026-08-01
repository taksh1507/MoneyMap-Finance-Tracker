const STORAGE_KEY = 'moneyMapData';

function getInitialData() {
    return {
        userProfile: {
            firstName: '',
            lastName: '',
            email: '',
            currency: 'INR'
        },
        transactions: [],
        budgets: {
            Food: 0,
            Bills: 0,
            EMI: 0,
            Entertainment: 0
        },
        income: 0
    };
}

export function getData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : getInitialData();
}

export function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Transactions
export function addTransaction(transaction) {
    const data = getData();
    transaction.id = Date.now().toString();
    data.transactions.push(transaction);
    saveData(data);
    return transaction.id;
}

export function editTransaction(id, updatedTransaction) {
    const data = getData();
    const index = data.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        data.transactions[index] = { ...data.transactions[index], ...updatedTransaction };
        saveData(data);
    }
}

export function deleteTransaction(id) {
    const data = getData();
    data.transactions = data.transactions.filter(t => t.id !== id);
    saveData(data);
}

export function getTransactions() {
    return getData().transactions;
}

// Budgets
export function updateBudgets(newBudgets) {
    const data = getData();
    data.budgets = { ...data.budgets, ...newBudgets };
    saveData(data);
}

export function getBudgets() {
    return getData().budgets;
}

// Income
export function updateIncome(income) {
    const data = getData();
    data.income = income;
    saveData(data);
}

export function getIncome() {
    return getData().income;
}

// User Profile
export function updateUserProfile(profile) {
    const data = getData();
    data.userProfile = { ...data.userProfile, ...profile };
    saveData(data);
}

export function getUserProfile() {
    return getData().userProfile;
}

// Auth
export function login(email) {
    localStorage.setItem('loggedInUserEmail', email);
}

export function logout() {
    localStorage.removeItem('loggedInUserEmail');
}

export function getLoggedInUser() {
    return localStorage.getItem('loggedInUserEmail');
}
