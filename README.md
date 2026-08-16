# 💰 Expense Tracker CLI

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-blue.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-15%2F15%20passing-success.svg)](test/tracker.test.js)
[![roadmap.sh Project](https://img.shields.io/badge/roadmap.sh-Expense%20Tracker-blueviolet.svg)](https://roadmap.sh/projects/expense-tracker)

A lightweight, zero-dependency command-line expense tracker application to effortlessly record, categorize, monitor, and summarize personal finances directly from your terminal. Built according to the [roadmap.sh Expense Tracker Project](https://roadmap.sh/projects/expense-tracker) specification.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Project Specification](#-project-specification)
- [Key Features](#-key-features)
- [Installation & Getting Started](#-installation--getting-started)
- [Command Reference & Examples](#-command-reference--examples)
  - [1. Add an Expense](#1-add-an-expense)
  - [2. Update an Expense](#2-update-an-expense)
  - [3. Delete an Expense](#3-delete-an-expense)
  - [4. List Expenses](#4-list-expenses)
  - [5. View Summary Reports](#5-view-summary-reports)
  - [6. Monthly Budgeting & Warnings](#6-monthly-budgeting--warnings)
  - [7. Export to CSV](#7-export-to-csv)
  - [8. Clear All Data](#8-clear-all-data)
- [Project Architecture & File Structure](#-project-architecture--file-structure)
- [Data Storage Format](#-data-storage-format)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Error Handling & Edge Cases](#-error-handling--edge-cases)
- [License](#-license)

---

## 🌟 Overview

The **Expense Tracker CLI** is designed following clean architecture principles and zero external runtime dependencies. It uses modern Node.js ES modules, native JSON storage with atomic writes, and built-in formatting utilities to ensure speed, reliability, and portability across Windows, macOS, and Linux.

---

## 🎯 Project Specification

This project is built based on the official project roadmap requirements from [roadmap.sh](https://roadmap.sh):

🔗 **Project URL:** [https://roadmap.sh/projects/expense-tracker](https://roadmap.sh/projects/expense-tracker)

It fulfills all core requirements, command contracts, and extended challenges including categorization, monthly budgeting, warnings, and CSV export.

---

## ✨ Key Features

- ➕ **Add Expenses**: Record expenses with descriptions, positive monetary amounts, categories, and custom/automatic timestamps.
- ✏️ **Update Expenses**: Modify description, amount, category, or date for any existing expense by ID.
- 🗑️ **Delete Expenses**: Safely remove expenses by ID.
- 📋 **Tabular Listing**: View expenses formatted in a clean table with dynamic column alignment.
- 🏷️ **Categorization & Filtering**: Organize spending by category (e.g., Food, Transport, Utilities) and filter listings or summaries.
- 📊 **Summary Reports**: Generate instant total spending reports overall, for specific months, or by category.
- 🎯 **Monthly Budgeting**: Set monthly spending targets and receive instant warnings when exceeding budgets.
- 📁 **CSV Export**: Export all records into standard RFC-4180 compliant CSV files with character escaping.
- 🔒 **Safe Persistence**: Stores data locally in `expenses.json` using atomic temporary file swaps to prevent corruption.

---

## 🚀 Installation & Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) **v18.0.0** or higher installed.

### Quick Start

1. **Clone or navigate to the project directory**:
   ```bash
   cd "Expense Tracker"
   ```

2. **Option A: Link globally (Recommended)**
   ```bash
   npm link
   ```
   *Now you can run `expense-tracker` directly from any terminal window.*

3. **Option B: Run directly via Node**
   ```bash
   node bin/expense-tracker.js <command> [options]
   ```

4. **Option C: Run on Windows using launcher**
   ```cmd
   expense-tracker <command> [options]
   ```

---

## 📖 Command Reference & Examples

### 1. Add an Expense
Adds a new expense with an auto-generated incremental ID and the current date (unless `--date` is specified).

```bash
# Basic expense
$ expense-tracker add --description "Lunch" --amount 20
# Output: Expense added successfully (ID: 1)

# Expense with category
$ expense-tracker add --description "Dinner" --amount 10 --category "Food"
# Output: Expense added successfully (ID: 2)

# Expense with custom past/future date (YYYY-MM-DD)
$ expense-tracker add --description "Train Ticket" --amount 15.50 --category "Transport" --date 2026-08-01
# Output: Expense added successfully (ID: 3)
```

**Options:**
- `--description`, `-d` *(required)*: Description text.
- `--amount`, `-a` *(required)*: Monetary amount (must be positive number).
- `--category`, `-c` *(optional)*: Spending category.
- `--date` *(optional)*: Date in `YYYY-MM-DD` format (defaults to today).

---

### 2. Update an Expense
Updates one or more fields of an existing expense record.

```bash
$ expense-tracker update --id 1 --description "Business Lunch" --amount 25
# Output: Expense updated successfully
```

**Options:**
- `--id`, `-i` *(required)*: Numeric ID of the expense to modify.
- `--description`, `-d` *(optional)*: New description.
- `--amount`, `-a` *(optional)*: New amount.
- `--category`, `-c` *(optional)*: New category.
- `--date` *(optional)*: New date (`YYYY-MM-DD`).

---

### 3. Delete an Expense
Removes an expense record by its ID.

```bash
$ expense-tracker delete --id 2
# Output: Expense deleted successfully
```

**Options:**
- `--id`, `-i` *(required)*: Numeric ID of the expense to delete.

---

### 4. List Expenses
Displays all recorded expenses in an aligned table.

```bash
$ expense-tracker list
# ID  Date        Description     Amount  Category
# 1   2026-08-16  Business Lunch  $25     Food
# 3   2026-08-01  Train Ticket    $15.50  Transport

# Filter by category:
$ expense-tracker list --category "Transport"
# ID  Date        Description   Amount  Category
# 3   2026-08-01  Train Ticket  $15.50  Transport
```

**Options:**
- `--category`, `-c` *(optional)*: Filter expenses by category (case-insensitive).

---

### 5. View Summary Reports
Computes total spending across all expenses, for a specific month, or for a category.

```bash
# Overall summary
$ expense-tracker summary
# Output: Total expenses: $40.50

# Summary for specific month (e.g. Month 8 = August)
$ expense-tracker summary --month 8
# Output: Total expenses for August: $40.50

# Summary for a specific category
$ expense-tracker summary --category "Transport"
# Output: Total expenses for Transport: $15.50
```

**Options:**
- `--month`, `-m` *(optional)*: Month number (`1` to `12`).
- `--year`, `-y` *(optional)*: Target year (defaults to current year).
- `--category`, `-c` *(optional)*: Category name.

---

### 6. Monthly Budgeting & Warnings
Set monthly spending targets. When an added or updated expense pushes total monthly spending above the budget, a warning is immediately printed.

```bash
# Set monthly budget for August (Month 8)
$ expense-tracker set-budget --month 8 --amount 50
# Output: Budget for August set to $50

# Add an expense that causes spending to exceed budget:
$ expense-tracker add --description "Team Dinner" --amount 20
# Output:
# Expense added successfully (ID: 4)
# Warning: You have exceeded your budget for August by $10.50!

# View budget tracking summary:
$ expense-tracker budget
# Output:
# Month      Budget    Spent     Remaining Status
# ------------------------------------------------
# August     $50       $60.50    -$10.50   EXCEEDED
```

---

### 7. Export to CSV
Exports all expense entries into a CSV spreadsheet.

```bash
$ expense-tracker export --file my_expenses.csv
# Output: Expenses exported successfully to my_expenses.csv (3 records)
```

**Options:**
- `--file`, `-f` *(optional)*: Destination file path (defaults to `expenses.csv`).

---

### 8. Clear All Data
Resets all expense records and restores ID sequence back to 1.

```bash
$ expense-tracker clear --confirm
# Output: Cleared 3 expense records.
```

---

## 🏗️ Project Architecture & File Structure

```
Expense Tracker/
├── bin/
│   └── expense-tracker.js   # CLI entry point (Node.js shebang)
├── src/
│   ├── cli.js               # Argument parsing and command routing
│   ├── tracker.js           # Core business logic & budget calculations
│   ├── storage.js           # Atomic JSON persistence layer
│   ├── formatter.js         # Table formatting and currency display helpers
│   └── constants.js         # Month names and constant values
├── test/
│   └── tracker.test.js      # Automated unit and integration test suite
├── expense-tracker.cmd      # Windows Command Prompt launcher
├── expense-tracker.ps1      # Windows PowerShell launcher
├── package.json             # Project metadata and test configuration
└── README.md                # Comprehensive project documentation
```

---

## 💾 Data Storage Format

Data is stored locally in JSON format (`expenses.json`) in the current working directory:

```json
{
  "expenses": [
    {
      "id": 1,
      "date": "2026-08-16",
      "description": "Lunch",
      "amount": 20,
      "category": "Food"
    }
  ],
  "budgets": {
    "2026-08": 500
  },
  "nextId": 2
}
```

---

## 🧪 Testing & Quality Assurance

The project includes automated unit and integration tests using Node.js's native test runner (`node:test`).

To run the complete test suite:
```bash
npm test
```

### Test Coverage Highlights:
- ✅ Expense addition, auto-incrementing IDs, and timestamp generation.
- ✅ Input validation (empty descriptions, negative/zero amounts, NaN values).
- ✅ Partial and full field updates.
- ✅ Safe deletion & non-existent ID handling.
- ✅ Tabular formatting & category filtering.
- ✅ Monthly & category summary calculations.
- ✅ Budget enforcement & budget exceeded warnings.
- ✅ CSV export formatting & special character escaping (commas, quotes, newlines).
- ✅ Full end-to-end CLI command integration tests.

---

## 🛡️ Error Handling & Edge Cases

| Scenario | Handled Behavior |
| :--- | :--- |
| **Negative or zero amount** | Rejects with clear message: `Expense amount must be a positive number greater than 0.` |
| **Empty description** | Rejects with message: `Expense description is required.` |
| **Non-existent ID** | Returns error: `Expense with ID <id> not found.` |
| **Invalid month number** | Validates month between `1` and `12`. |
| **Missing JSON file** | Auto-creates initial storage structure on first run. |
| **Corrupted data file** | Catches syntax errors and prompts user with clear error guidance. |
| **CSV special characters** | Safely escapes quotes and commas according to RFC-4180 standards. |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
