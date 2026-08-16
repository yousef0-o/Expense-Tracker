import fs from 'node:fs';
import path from 'node:path';
import { MONTH_NAMES } from './constants.js';
import { loadData, saveData } from './storage.js';

/**
 * Helper to get current YYYY-MM-DD date string.
 * @param {Date} [d]
 * @returns {string}
 */
export function getFormattedDate(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to get YYYY-MM key from date string.
 * @param {string} dateStr
 * @returns {string}
 */
export function getMonthKey(dateStr) {
  return dateStr.slice(0, 7);
}

/**
 * Checks budget for a specific month and returns warning text if exceeded.
 * @param {string} monthKey - e.g. "2026-08"
 * @param {Array<any>} expenses
 * @param {Record<string, number>} budgets
 * @returns {string|null}
 */
function checkBudgetWarning(monthKey, expenses, budgets) {
  const budget = budgets[monthKey];
  if (budget === undefined || budget === null) {
    return null;
  }

  const [yearStr, monthStr] = monthKey.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthStr;

  const monthTotal = expenses
    .filter(e => e.date && e.date.startsWith(monthKey))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  if (monthTotal > budget) {
    const diff = monthTotal - budget;
    const diffFormatted = Number.isInteger(diff) ? `$${diff}` : `$${diff.toFixed(2)}`;
    return `Warning: You have exceeded your budget for ${monthName} by ${diffFormatted}!`;
  }

  return null;
}

/**
 * Adds a new expense.
 *
 * @param {object} params
 * @param {string} params.description
 * @param {number} params.amount
 * @param {string} [params.category]
 * @param {string} [params.date]
 * @param {string} [params.filePath]
 * @returns {{ success: boolean, expense: object, budgetWarning: string|null }}
 */
export function addExpense({ description, amount, category, date, filePath }) {
  if (!description || typeof description !== 'string' || !description.trim()) {
    throw new Error('Expense description is required.');
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Expense amount must be a positive number greater than 0.');
  }

  const expenseDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())
    ? date.trim()
    : getFormattedDate();

  const data = loadData(filePath);

  const newExpense = {
    id: data.nextId,
    date: expenseDate,
    description: description.trim(),
    amount: parsedAmount,
    category: category && typeof category === 'string' && category.trim() ? category.trim() : undefined
  };

  data.expenses.push(newExpense);
  data.nextId += 1;

  saveData(data, filePath);

  const monthKey = getMonthKey(expenseDate);
  const budgetWarning = checkBudgetWarning(monthKey, data.expenses, data.budgets);

  return {
    success: true,
    expense: newExpense,
    budgetWarning
  };
}

/**
 * Updates an existing expense.
 *
 * @param {object} params
 * @param {number} params.id
 * @param {string} [params.description]
 * @param {number} [params.amount]
 * @param {string} [params.category]
 * @param {string} [params.date]
 * @param {string} [params.filePath]
 * @returns {{ success: boolean, expense: object, budgetWarning: string|null }}
 */
export function updateExpense({ id, description, amount, category, date, filePath }) {
  const expenseId = parseInt(id, 10);
  if (isNaN(expenseId) || expenseId <= 0) {
    throw new Error('A valid numeric expense ID is required.');
  }

  if (description === undefined && amount === undefined && category === undefined && date === undefined) {
    throw new Error('Please provide at least one field to update (--description, --amount, --category, or --date).');
  }

  const data = loadData(filePath);
  const expense = data.expenses.find(e => e.id === expenseId);

  if (!expense) {
    throw new Error(`Expense with ID ${expenseId} not found.`);
  }

  if (description !== undefined) {
    if (typeof description !== 'string' || !description.trim()) {
      throw new Error('Expense description cannot be empty.');
    }
    expense.description = description.trim();
  }

  if (amount !== undefined) {
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Expense amount must be a positive number greater than 0.');
    }
    expense.amount = parsedAmount;
  }

  if (category !== undefined) {
    expense.category = category.trim() || undefined;
  }

  if (date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      throw new Error('Date must be in YYYY-MM-DD format.');
    }
    expense.date = date.trim();
  }

  saveData(data, filePath);

  const monthKey = getMonthKey(expense.date);
  const budgetWarning = checkBudgetWarning(monthKey, data.expenses, data.budgets);

  return {
    success: true,
    expense,
    budgetWarning
  };
}

/**
 * Deletes an expense by ID.
 *
 * @param {object} params
 * @param {number} params.id
 * @param {string} [params.filePath]
 * @returns {{ success: boolean, deletedExpense: object }}
 */
export function deleteExpense({ id, filePath }) {
  const expenseId = parseInt(id, 10);
  if (isNaN(expenseId) || expenseId <= 0) {
    throw new Error('A valid numeric expense ID is required.');
  }

  const data = loadData(filePath);
  const index = data.expenses.findIndex(e => e.id === expenseId);

  if (index === -1) {
    throw new Error(`Expense with ID ${expenseId} not found.`);
  }

  const [deletedExpense] = data.expenses.splice(index, 1);
  saveData(data, filePath);

  return {
    success: true,
    deletedExpense
  };
}

/**
 * Lists expenses, optionally filtered by category.
 *
 * @param {object} [params]
 * @param {string} [params.category]
 * @param {string} [params.filePath]
 * @returns {Array<object>}
 */
export function listExpenses({ category, filePath } = {}) {
  const data = loadData(filePath);
  let expenses = data.expenses;

  if (category && typeof category === 'string' && category.trim()) {
    const filterCat = category.trim().toLowerCase();
    expenses = expenses.filter(e => (e.category || '').toLowerCase() === filterCat);
  }

  return expenses;
}

/**
 * Gets expense summary (total and optionally for month/year or category).
 *
 * @param {object} [params]
 * @param {number} [params.month]
 * @param {number} [params.year]
 * @param {string} [params.category]
 * @param {string} [params.filePath]
 * @returns {object}
 */
export function getSummary({ month, year, category, filePath } = {}) {
  const data = loadData(filePath);
  let filtered = data.expenses;
  let targetMonthName = null;
  let targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
  let budgetInfo = null;

  if (month !== undefined && month !== null) {
    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error('Month must be an integer between 1 and 12.');
    }

    targetMonthName = MONTH_NAMES[monthNum - 1];
    const monthStr = String(monthNum).padStart(2, '0');
    const monthKey = `${targetYear}-${monthStr}`;

    filtered = filtered.filter(e => {
      if (!e.date) return false;
      return e.date.startsWith(monthKey);
    });

    if (data.budgets && data.budgets[monthKey] !== undefined) {
      const budgetAmount = data.budgets[monthKey];
      const monthTotal = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);
      const remaining = budgetAmount - monthTotal;
      budgetInfo = {
        budget: budgetAmount,
        monthTotal,
        remaining,
        exceeded: monthTotal > budgetAmount
      };
    }
  }

  if (category && typeof category === 'string' && category.trim()) {
    const cat = category.trim().toLowerCase();
    filtered = filtered.filter(e => (e.category || '').toLowerCase() === cat);
  }

  const total = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);

  return {
    total,
    count: filtered.length,
    month: month !== undefined && month !== null ? parseInt(month, 10) : null,
    monthName: targetMonthName,
    year: targetYear,
    category: category ? category.trim() : null,
    budgetInfo
  };
}

/**
 * Sets a budget for a given month and year.
 *
 * @param {object} params
 * @param {number} params.month
 * @param {number} [params.year]
 * @param {number} params.amount
 * @param {string} [params.filePath]
 * @returns {object}
 */
export function setBudget({ month, year, amount, filePath }) {
  const monthNum = parseInt(month, 10);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new Error('Month must be an integer between 1 and 12.');
  }

  const budgetAmount = Number(amount);
  if (isNaN(budgetAmount) || budgetAmount <= 0) {
    throw new Error('Budget amount must be a positive number greater than 0.');
  }

  const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
  if (isNaN(targetYear) || targetYear < 1900 || targetYear > 2200) {
    throw new Error('Invalid year provided.');
  }

  const monthStr = String(monthNum).padStart(2, '0');
  const monthKey = `${targetYear}-${monthStr}`;

  const data = loadData(filePath);
  if (!data.budgets) {
    data.budgets = {};
  }

  data.budgets[monthKey] = budgetAmount;
  saveData(data, filePath);

  return {
    month: monthNum,
    monthName: MONTH_NAMES[monthNum - 1],
    year: targetYear,
    amount: budgetAmount,
    monthKey
  };
}

/**
 * Gets budget information for a month or all months.
 *
 * @param {object} [params]
 * @param {number} [params.month]
 * @param {number} [params.year]
 * @param {string} [params.filePath]
 * @returns {Array<object>}
 */
export function getBudgets({ month, year, filePath } = {}) {
  const data = loadData(filePath);
  const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
  const budgets = data.budgets || {};

  const results = [];

  if (month !== undefined && month !== null) {
    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error('Month must be an integer between 1 and 12.');
    }
    const monthStr = String(monthNum).padStart(2, '0');
    const monthKey = `${targetYear}-${monthStr}`;
    const budget = budgets[monthKey];

    const spent = data.expenses
      .filter(e => e.date && e.date.startsWith(monthKey))
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    results.push({
      monthKey,
      month: monthNum,
      monthName: MONTH_NAMES[monthNum - 1],
      year: targetYear,
      budget: budget !== undefined ? budget : null,
      spent,
      remaining: budget !== undefined ? budget - spent : null,
      exceeded: budget !== undefined ? spent > budget : false
    });
  } else {
    // List all months that have either budget or expenses in targetYear
    for (let m = 1; m <= 12; m++) {
      const monthStr = String(m).padStart(2, '0');
      const monthKey = `${targetYear}-${monthStr}`;
      const budget = budgets[monthKey];

      const spent = data.expenses
        .filter(e => e.date && e.date.startsWith(monthKey))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      if (budget !== undefined || spent > 0) {
        results.push({
          monthKey,
          month: m,
          monthName: MONTH_NAMES[m - 1],
          year: targetYear,
          budget: budget !== undefined ? budget : null,
          spent,
          remaining: budget !== undefined ? budget - spent : null,
          exceeded: budget !== undefined ? spent > budget : false
        });
      }
    }
  }

  return results;
}

/**
 * Exports expenses to a CSV file.
 *
 * @param {object} [params]
 * @param {string} [params.targetFile]
 * @param {string} [params.filePath]
 * @returns {{ count: number, targetFile: string }}
 */
export function exportToCsv({ targetFile = 'expenses.csv', filePath } = {}) {
  const data = loadData(filePath);
  const expenses = data.expenses;

  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '';
    const text = String(str);
    if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const headers = ['ID', 'Date', 'Description', 'Amount', 'Category'];
  const lines = [headers.join(',')];

  for (const exp of expenses) {
    const row = [
      exp.id,
      escapeCsv(exp.date),
      escapeCsv(exp.description),
      exp.amount,
      escapeCsv(exp.category || '')
    ];
    lines.push(row.join(','));
  }

  const csvContent = lines.join('\n');
  const resolvedPath = path.resolve(process.cwd(), targetFile);
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(resolvedPath, csvContent, 'utf8');

  return {
    count: expenses.length,
    targetFile
  };
}

/**
 * Clears all expenses.
 *
 * @param {object} params
 * @param {boolean} params.confirm
 * @param {string} [params.filePath]
 * @returns {{ success: boolean, clearedCount: number }}
 */
export function clearExpenses({ confirm, filePath }) {
  if (!confirm) {
    throw new Error('To clear all expenses, pass --confirm.');
  }

  const data = loadData(filePath);
  const count = data.expenses.length;
  data.expenses = [];
  data.nextId = 1;
  saveData(data, filePath);

  return {
    success: true,
    clearedCount: count
  };
}
