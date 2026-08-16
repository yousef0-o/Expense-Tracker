/**
 * Formats a numeric amount to currency string (e.g. $20 or $20.50).
 *
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0';
  }
  if (Number.isInteger(amount)) {
    return `$${amount}`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * Formats an array of expense objects as a clean aligned CLI table.
 *
 * @param {Array<{ id: number, date: string, description: string, amount: number, category?: string }>} expenses
 * @param {boolean} [showCategory=true]
 * @returns {string}
 */
export function formatExpenseTable(expenses, showCategory = true) {
  if (!expenses || expenses.length === 0) {
    return 'No expenses found.';
  }

  const hasCategory = showCategory && expenses.some(e => Boolean(e.category));

  const headers = ['ID', 'Date', 'Description', 'Amount'];
  if (hasCategory) {
    headers.push('Category');
  }

  // Calculate maximum column widths
  const rows = expenses.map(e => {
    const row = [
      String(e.id),
      e.date || '',
      e.description || '',
      formatCurrency(e.amount)
    ];
    if (hasCategory) {
      row.push(e.category || 'General');
    }
    return row;
  });

  const colWidths = headers.map((header, colIdx) => {
    const maxDataLen = Math.max(...rows.map(r => (r[colIdx] || '').length), 0);
    return Math.max(header.length, maxDataLen);
  });

  const formatRow = (cols) => {
    return cols
      .map((col, idx) => {
        // Amount column right-aligned or left-aligned with spacing
        const width = colWidths[idx];
        return col.padEnd(width);
      })
      .join('  ');
  };

  const headerLine = formatRow(headers);
  const dataLines = rows.map(formatRow);

  return [headerLine, ...dataLines].join('\n');
}
