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
} from './tracker.js';
import { formatExpenseTable, formatCurrency } from './formatter.js';
import { MONTH_NAMES } from './constants.js';

/**
 * Parses command line arguments array into command, options object, and positionals.
 *
 * @param {string[]} args
 * @returns {{ command: string, subcommand: string|null, options: Record<string, any>, positionals: string[] }}
 */
export function parseArguments(args) {
  const options = {};
  const positionals = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const equalIndex = arg.indexOf('=');
      if (equalIndex !== -1) {
        const key = arg.slice(2, equalIndex);
        const value = arg.slice(equalIndex + 1);
        options[key] = value;
      } else {
        const key = arg.slice(2);
        const nextArg = args[i + 1];
        if (nextArg !== undefined && !nextArg.startsWith('-')) {
          options[key] = nextArg;
          i += 1;
        } else {
          options[key] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      const shortKey = arg.slice(1);
      const nextArg = args[i + 1];
      if (nextArg !== undefined && !nextArg.startsWith('-')) {
        options[shortKey] = nextArg;
        i += 1;
      } else {
        options[shortKey] = true;
      }
    } else {
      positionals.push(arg);
    }
    i += 1;
  }

  // Map short flags to standard option names
  const flagMap = {
    'd': 'description',
    'a': 'amount',
    'c': 'category',
    'i': 'id',
    'm': 'month',
    'y': 'year',
    'f': 'file',
    'h': 'help',
    'v': 'version'
  };

  for (const [short, full] of Object.entries(flagMap)) {
    if (options[short] !== undefined && options[full] === undefined) {
      options[full] = options[short];
    }
  }

  const command = positionals[0] || (options.help ? 'help' : options.version ? 'version' : 'help');
  const subcommand = positionals[1] || null;

  return { command, subcommand, options, positionals };
}

/**
 * Returns help documentation string.
 */
export function getHelpText() {
  return `
Expense Tracker CLI - Manage and track your personal finances

Usage:
  expense-tracker <command> [options]

Commands:
  add                     Add a new expense
                          Options: --description, -d <text> (required)
                                   --amount, -a <number> (required)
                                   --category, -c <text>
                                   --date <YYYY-MM-DD>

  update                  Update an existing expense
                          Options: --id, -i <number> (required)
                                   --description, -d <text>
                                   --amount, -a <number>
                                   --category, -c <text>
                                   --date <YYYY-MM-DD>

  delete                  Delete an expense by ID
                          Options: --id, -i <number> (required)

  list                    List all expenses or filter by category
                          Options: --category, -c <text>

  summary                 View total expenses summary
                          Options: --month, -m <1-12>
                                   --category, -c <text>
                                   --year, -y <YYYY>

  set-budget              Set a monthly spending budget
                          Options: --month, -m <1-12> (required)
                                   --amount, -a <number> (required)
                                   --year, -y <YYYY>

  budget                  View monthly budgets and current spending status
                          Options: --month, -m <1-12>
                                   --year, -y <YYYY>

  export                  Export expenses to a CSV file
                          Options: --file, -f <filename> (default: expenses.csv)

  clear                   Clear all expenses
                          Options: --confirm (required)

  help, --help, -h        Display this help message

Examples:
  $ expense-tracker add --description "Lunch" --amount 20 --category "Food"
  $ expense-tracker list
  $ expense-tracker summary
  $ expense-tracker summary --month 8
  $ expense-tracker set-budget --month 8 --amount 500
  $ expense-tracker delete --id 2
  $ expense-tracker export --file my_expenses.csv
`;
}

/**
 * Main CLI handler.
 *
 * @param {string[]} rawArgs - Process arguments (e.g. process.argv.slice(2))
 * @param {object} [config] - Optional config for testing
 * @param {string} [config.storagePath] - Custom storage file path
 * @param {(msg: string) => void} [config.logger] - Custom stdout logger
 * @param {(msg: string) => void} [config.errorLogger] - Custom stderr logger
 * @returns {number} Exit code (0 for success, 1 for error)
 */
export function runCli(rawArgs, config = {}) {
  const logger = config.logger || console.log;
  const errorLogger = config.errorLogger || console.error;
  const filePath = config.storagePath;

  try {
    const { command, subcommand, options } = parseArguments(rawArgs);

    if (options.help || command === 'help') {
      logger(getHelpText().trim());
      return 0;
    }

    if (options.version || command === 'version') {
      logger('expense-tracker v1.0.0');
      return 0;
    }

    switch (command) {
      case 'add': {
        const { description, amount, category, date } = options;
        if (!description) {
          throw new Error('Missing required option: --description');
        }
        if (amount === undefined) {
          throw new Error('Missing required option: --amount');
        }

        const result = addExpense({ description, amount, category, date, filePath });
        logger(`Expense added successfully (ID: ${result.expense.id})`);
        if (result.budgetWarning) {
          logger(result.budgetWarning);
        }
        return 0;
      }

      case 'update': {
        const { id, description, amount, category, date } = options;
        if (!id) {
          throw new Error('Missing required option: --id');
        }

        const result = updateExpense({ id, description, amount, category, date, filePath });
        logger('Expense updated successfully');
        if (result.budgetWarning) {
          logger(result.budgetWarning);
        }
        return 0;
      }

      case 'delete': {
        const { id } = options;
        if (!id) {
          throw new Error('Missing required option: --id');
        }

        deleteExpense({ id, filePath });
        logger('Expense deleted successfully');
        return 0;
      }

      case 'list': {
        const { category } = options;
        const expenses = listExpenses({ category, filePath });
        logger(formatExpenseTable(expenses));
        return 0;
      }

      case 'summary': {
        const { month, year, category } = options;
        const summary = getSummary({ month, year, category, filePath });

        let output = '';
        if (summary.monthName && summary.category) {
          output = `Total expenses for ${summary.monthName} (${summary.category}): ${formatCurrency(summary.total)}`;
        } else if (summary.monthName) {
          output = `Total expenses for ${summary.monthName}: ${formatCurrency(summary.total)}`;
        } else if (summary.category) {
          output = `Total expenses for ${summary.category}: ${formatCurrency(summary.total)}`;
        } else {
          output = `Total expenses: ${formatCurrency(summary.total)}`;
        }

        logger(output);

        if (summary.budgetInfo) {
          const { budget, remaining, exceeded } = summary.budgetInfo;
          if (exceeded) {
            logger(`Warning: Budget of ${formatCurrency(budget)} exceeded by ${formatCurrency(Math.abs(remaining))}!`);
          } else {
            logger(`Budget: ${formatCurrency(budget)} | Remaining: ${formatCurrency(remaining)}`);
          }
        }
        return 0;
      }

      case 'set-budget': {
        const { month, year, amount } = options;
        if (month === undefined) {
          throw new Error('Missing required option: --month');
        }
        if (amount === undefined) {
          throw new Error('Missing required option: --amount');
        }

        const result = setBudget({ month, year, amount, filePath });
        logger(`Budget for ${result.monthName} set to ${formatCurrency(result.amount)}`);
        return 0;
      }

      case 'budget': {
        if (subcommand === 'set') {
          const { month, year, amount } = options;
          if (month === undefined) {
            throw new Error('Missing required option: --month');
          }
          if (amount === undefined) {
            throw new Error('Missing required option: --amount');
          }
          const result = setBudget({ month, year, amount, filePath });
          logger(`Budget for ${result.monthName} set to ${formatCurrency(result.amount)}`);
          return 0;
        }

        const { month, year } = options;
        const budgets = getBudgets({ month, year, filePath });
        if (budgets.length === 0) {
          logger('No budgets or expenses found for the specified period.');
          return 0;
        }

        const lines = ['Month      Budget    Spent     Remaining Status'];
        lines.push('------------------------------------------------');
        for (const b of budgets) {
          const m = b.monthName.padEnd(10);
          const bg = (b.budget !== null ? formatCurrency(b.budget) : 'N/A').padEnd(9);
          const sp = formatCurrency(b.spent).padEnd(9);
          const rem = (b.remaining !== null ? formatCurrency(b.remaining) : 'N/A').padEnd(10);
          const status = b.budget === null
            ? '-'
            : b.exceeded
            ? 'EXCEEDED'
            : `${Math.round((b.spent / b.budget) * 100)}% used`;
          lines.push(`${m} ${bg} ${sp} ${rem}${status}`);
        }
        logger(lines.join('\n'));
        return 0;
      }

      case 'export': {
        const targetFile = options.file || 'expenses.csv';
        const result = exportToCsv({ targetFile, filePath });
        logger(`Expenses exported successfully to ${result.targetFile} (${result.count} record${result.count === 1 ? '' : 's'})`);
        return 0;
      }

      case 'clear': {
        const { confirm } = options;
        if (!confirm) {
          throw new Error('Please specify --confirm to clear all expenses.');
        }
        const result = clearExpenses({ confirm: true, filePath });
        logger(`Cleared ${result.clearedCount} expense record${result.clearedCount === 1 ? '' : 's'}.`);
        return 0;
      }

      default: {
        errorLogger(`Error: Unknown command "${command}".`);
        logger('Run "expense-tracker --help" for a list of available commands.');
        return 1;
      }
    }
  } catch (err) {
    errorLogger(`Error: ${err.message}`);
    return 1;
  }
}
