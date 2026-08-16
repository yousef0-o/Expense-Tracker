import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  addExpense,
  updateExpense,
  deleteExpense,
  listExpenses,
  getSummary,
  setBudget,
  getBudgets,
  exportToCsv,
  clearExpenses
} from '../src/tracker.js';
import { runCli, parseArguments } from '../src/cli.js';
import { formatCurrency, formatExpenseTable } from '../src/formatter.js';

describe('Expense Tracker Logic', () => {
  let tempDir;
  let testStoragePath;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'expense-tracker-test-'));
    testStoragePath = path.join(tempDir, 'test_expenses.json');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should add expenses with auto-incrementing IDs and correct dates', () => {
    const res1 = addExpense({
      description: 'Lunch',
      amount: 20,
      filePath: testStoragePath
    });
    assert.equal(res1.success, true);
    assert.equal(res1.expense.id, 1);
    assert.equal(res1.expense.description, 'Lunch');
    assert.equal(res1.expense.amount, 20);
    assert.match(res1.expense.date, /^\d{4}-\d{2}-\d{2}$/);

    const res2 = addExpense({
      description: 'Dinner',
      amount: 15.5,
      category: 'Food',
      date: '2026-08-16',
      filePath: testStoragePath
    });
    assert.equal(res2.expense.id, 2);
    assert.equal(res2.expense.description, 'Dinner');
    assert.equal(res2.expense.amount, 15.5);
    assert.equal(res2.expense.category, 'Food');
    assert.equal(res2.expense.date, '2026-08-16');

    const all = listExpenses({ filePath: testStoragePath });
    assert.equal(all.length, 2);
  });

  test('should validate inputs when adding an expense', () => {
    assert.throws(
      () => addExpense({ description: '', amount: 20, filePath: testStoragePath }),
      /Expense description is required/
    );

    assert.throws(
      () => addExpense({ description: 'Coffee', amount: -5, filePath: testStoragePath }),
      /Expense amount must be a positive number/
    );

    assert.throws(
      () => addExpense({ description: 'Coffee', amount: 0, filePath: testStoragePath }),
      /Expense amount must be a positive number/
    );

    assert.throws(
      () => addExpense({ description: 'Coffee', amount: 'abc', filePath: testStoragePath }),
      /Expense amount must be a positive number/
    );
  });

  test('should update an existing expense', () => {
    addExpense({ description: 'Lunch', amount: 20, filePath: testStoragePath });
    
    const updateRes = updateExpense({
      id: 1,
      description: 'Super Lunch',
      amount: 25.5,
      category: 'Dining',
      filePath: testStoragePath
    });

    assert.equal(updateRes.success, true);
    assert.equal(updateRes.expense.description, 'Super Lunch');
    assert.equal(updateRes.expense.amount, 25.5);
    assert.equal(updateRes.expense.category, 'Dining');

    // Partial update
    const partialUpdate = updateExpense({
      id: 1,
      amount: 30,
      filePath: testStoragePath
    });
    assert.equal(partialUpdate.expense.description, 'Super Lunch');
    assert.equal(partialUpdate.expense.amount, 30);
  });

  test('should fail when updating non-existent expense or invalid fields', () => {
    addExpense({ description: 'Lunch', amount: 20, filePath: testStoragePath });

    assert.throws(
      () => updateExpense({ id: 999, description: 'Test', filePath: testStoragePath }),
      /Expense with ID 999 not found/
    );

    assert.throws(
      () => updateExpense({ id: 1, amount: -10, filePath: testStoragePath }),
      /Expense amount must be a positive number/
    );

    assert.throws(
      () => updateExpense({ id: 1, filePath: testStoragePath }),
      /Please provide at least one field to update/
    );
  });

  test('should delete an expense by ID', () => {
    addExpense({ description: 'Item 1', amount: 10, filePath: testStoragePath });
    addExpense({ description: 'Item 2', amount: 20, filePath: testStoragePath });

    const delRes = deleteExpense({ id: 1, filePath: testStoragePath });
    assert.equal(delRes.success, true);
    assert.equal(delRes.deletedExpense.id, 1);

    const remaining = listExpenses({ filePath: testStoragePath });
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 2);

    assert.throws(
      () => deleteExpense({ id: 1, filePath: testStoragePath }),
      /Expense with ID 1 not found/
    );
  });

  test('should filter expenses by category', () => {
    addExpense({ description: 'Burger', amount: 12, category: 'Food', filePath: testStoragePath });
    addExpense({ description: 'Train', amount: 5, category: 'Transport', filePath: testStoragePath });
    addExpense({ description: 'Pizza', amount: 18, category: 'food', filePath: testStoragePath });

    const foodExpenses = listExpenses({ category: 'Food', filePath: testStoragePath });
    assert.equal(foodExpenses.length, 2);
    assert.equal(foodExpenses[0].description, 'Burger');
    assert.equal(foodExpenses[1].description, 'Pizza');

    const transportExpenses = listExpenses({ category: 'Transport', filePath: testStoragePath });
    assert.equal(transportExpenses.length, 1);
  });

  test('should calculate summary total, monthly summary, and category summary', () => {
    addExpense({ description: 'Groceries', amount: 50, category: 'Food', date: '2026-08-01', filePath: testStoragePath });
    addExpense({ description: 'Electricity', amount: 100, category: 'Utilities', date: '2026-08-10', filePath: testStoragePath });
    addExpense({ description: 'Internet', amount: 60, category: 'Utilities', date: '2026-07-15', filePath: testStoragePath });

    const overall = getSummary({ filePath: testStoragePath });
    assert.equal(overall.total, 210);
    assert.equal(overall.count, 3);

    const august = getSummary({ month: 8, year: 2026, filePath: testStoragePath });
    assert.equal(august.total, 150);
    assert.equal(august.count, 2);
    assert.equal(august.monthName, 'August');

    const july = getSummary({ month: 7, year: 2026, filePath: testStoragePath });
    assert.equal(july.total, 60);
    assert.equal(july.count, 1);

    const utilities = getSummary({ category: 'Utilities', filePath: testStoragePath });
    assert.equal(utilities.total, 160);

    const augustUtilities = getSummary({ month: 8, year: 2026, category: 'Utilities', filePath: testStoragePath });
    assert.equal(augustUtilities.total, 100);
  });

  test('should handle monthly budgets and exceed warnings', () => {
    setBudget({ month: 8, year: 2026, amount: 100, filePath: testStoragePath });

    const budgets = getBudgets({ month: 8, year: 2026, filePath: testStoragePath });
    assert.equal(budgets.length, 1);
    assert.equal(budgets[0].budget, 100);

    const exp1 = addExpense({
      description: 'Shoes',
      amount: 60,
      date: '2026-08-05',
      filePath: testStoragePath
    });
    assert.equal(exp1.budgetWarning, null);

    const exp2 = addExpense({
      description: 'Watch',
      amount: 50,
      date: '2026-08-12',
      filePath: testStoragePath
    });
    assert.ok(exp2.budgetWarning);
    assert.match(exp2.budgetWarning, /exceeded your budget for August by \$10/);

    const summary = getSummary({ month: 8, year: 2026, filePath: testStoragePath });
    assert.equal(summary.budgetInfo.budget, 100);
    assert.equal(summary.budgetInfo.monthTotal, 110);
    assert.equal(summary.budgetInfo.remaining, -10);
    assert.equal(summary.budgetInfo.exceeded, true);
  });

  test('should export expenses to CSV properly with quotes and escaping', () => {
    addExpense({
      description: 'Dinner, with friends "celebration"',
      amount: 85.5,
      category: 'Food',
      date: '2026-08-15',
      filePath: testStoragePath
    });

    const csvFile = path.join(tempDir, 'output.csv');
    const result = exportToCsv({ targetFile: csvFile, filePath: testStoragePath });

    assert.equal(result.count, 1);
    assert.ok(fs.existsSync(csvFile));

    const csvText = fs.readFileSync(csvFile, 'utf8');
    const lines = csvText.trim().split('\n');
    assert.equal(lines[0], 'ID,Date,Description,Amount,Category');
    assert.equal(lines[1], '1,2026-08-15,"Dinner, with friends ""celebration""",85.5,Food');
  });

  test('should clear all expenses with confirmation', () => {
    addExpense({ description: 'Item 1', amount: 10, filePath: testStoragePath });
    addExpense({ description: 'Item 2', amount: 20, filePath: testStoragePath });

    assert.throws(
      () => clearExpenses({ confirm: false, filePath: testStoragePath }),
      /pass --confirm/
    );

    const clearRes = clearExpenses({ confirm: true, filePath: testStoragePath });
    assert.equal(clearRes.clearedCount, 2);
    assert.equal(listExpenses({ filePath: testStoragePath }).length, 0);

    // Verify next ID resets to 1
    const newExp = addExpense({ description: 'New item', amount: 5, filePath: testStoragePath });
    assert.equal(newExp.expense.id, 1);
  });
});

describe('Formatters and CLI Helpers', () => {
  test('formatCurrency formats integer and floating points', () => {
    assert.equal(formatCurrency(20), '$20');
    assert.equal(formatCurrency(20.5), '$20.50');
    assert.equal(formatCurrency(20.55), '$20.55');
    assert.equal(formatCurrency(0), '$0');
  });

  test('formatExpenseTable formats table nicely', () => {
    const table = formatExpenseTable([
      { id: 1, date: '2024-08-06', description: 'Lunch', amount: 20, category: 'Food' },
      { id: 2, date: '2024-08-06', description: 'Dinner', amount: 10, category: 'Food' }
    ]);
    assert.match(table, /ID\s+Date\s+Description\s+Amount\s+Category/);
    assert.match(table, /1\s+2024-08-06\s+Lunch\s+\$20\s+Food/);
  });

  test('parseArguments handles various syntax formats', () => {
    const parsed1 = parseArguments(['add', '--description', 'Lunch', '--amount', '20', '--category', 'Food']);
    assert.equal(parsed1.command, 'add');
    assert.equal(parsed1.options.description, 'Lunch');
    assert.equal(parsed1.options.amount, '20');
    assert.equal(parsed1.options.category, 'Food');

    const parsed2 = parseArguments(['update', '-i', '1', '-d', 'New Lunch', '-a', '25']);
    assert.equal(parsed2.command, 'update');
    assert.equal(parsed2.options.id, '1');
    assert.equal(parsed2.options.description, 'New Lunch');
    assert.equal(parsed2.options.amount, '25');

    const parsed3 = parseArguments(['add', '--description="Dinner at 8"', '--amount=45']);
    assert.equal(parsed3.options.description, '"Dinner at 8"');
    assert.equal(parsed3.options.amount, '45');
  });
});

describe('CLI Integration End-to-End Tests', () => {
  let tempDir;
  let testStoragePath;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'expense-tracker-cli-test-'));
    testStoragePath = path.join(tempDir, 'cli_expenses.json');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function executeCli(args) {
    const stdout = [];
    const stderr = [];
    const exitCode = runCli(args, {
      storagePath: testStoragePath,
      logger: (msg) => stdout.push(msg),
      errorLogger: (msg) => stderr.push(msg)
    });
    return { exitCode, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
  }

  test('runs the full sequence of commands from prompt specification', () => {
    // 1. $ expense-tracker add --description "Lunch" --amount 20
    const add1 = executeCli(['add', '--description', 'Lunch', '--amount', '20']);
    assert.equal(add1.exitCode, 0);
    assert.equal(add1.stdout, 'Expense added successfully (ID: 1)');

    // 2. $ expense-tracker add --description "Dinner" --amount 10
    const add2 = executeCli(['add', '--description', 'Dinner', '--amount', '10']);
    assert.equal(add2.exitCode, 0);
    assert.equal(add2.stdout, 'Expense added successfully (ID: 2)');

    // 3. $ expense-tracker list
    const list1 = executeCli(['list']);
    assert.equal(list1.exitCode, 0);
    assert.match(list1.stdout, /ID\s+Date\s+Description\s+Amount/);
    assert.match(list1.stdout, /1\s+\d{4}-\d{2}-\d{2}\s+Lunch\s+\$20/);
    assert.match(list1.stdout, /2\s+\d{4}-\d{2}-\d{2}\s+Dinner\s+\$10/);

    // 4. $ expense-tracker summary
    const sum1 = executeCli(['summary']);
    assert.equal(sum1.exitCode, 0);
    assert.equal(sum1.stdout, 'Total expenses: $30');

    // 5. $ expense-tracker delete --id 2
    const del = executeCli(['delete', '--id', '2']);
    assert.equal(del.exitCode, 0);
    assert.equal(del.stdout, 'Expense deleted successfully');

    // 6. $ expense-tracker summary
    const sum2 = executeCli(['summary']);
    assert.equal(sum2.exitCode, 0);
    assert.equal(sum2.stdout, 'Total expenses: $20');

    // 7. $ expense-tracker summary --month <current month>
    const curMonth = new Date().getMonth() + 1;
    const curMonthName = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ][curMonth - 1];
    const sumMonth = executeCli(['summary', '--month', String(curMonth)]);
    assert.equal(sumMonth.exitCode, 0);
    assert.equal(sumMonth.stdout, `Total expenses for ${curMonthName}: $20`);
  });

  test('handles invalid commands and arguments gracefully with proper error messages', () => {
    const invalidCmd = executeCli(['unknown-command']);
    assert.equal(invalidCmd.exitCode, 1);
    assert.match(invalidCmd.stderr, /Unknown command "unknown-command"/);

    const missingAmount = executeCli(['add', '--description', 'Coffee']);
    assert.equal(missingAmount.exitCode, 1);
    assert.match(missingAmount.stderr, /Missing required option: --amount/);

    const invalidId = executeCli(['delete', '--id', '999']);
    assert.equal(invalidId.exitCode, 1);
    assert.match(invalidId.stderr, /Expense with ID 999 not found/);
  });
});
