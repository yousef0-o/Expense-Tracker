import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_STORAGE_PATH } from './constants.js';

const INITIAL_DATA = {
  expenses: [],
  budgets: {},
  nextId: 1
};

/**
 * Loads the storage data from the JSON file.
 * Creates the file if it does not exist.
 *
 * @param {string} [filePath]
 * @returns {{ expenses: Array<any>, budgets: Record<string, number>, nextId: number }}
 */
export function loadData(filePath = DEFAULT_STORAGE_PATH) {
  try {
    if (!fs.existsSync(filePath)) {
      saveData(INITIAL_DATA, filePath);
      return JSON.parse(JSON.stringify(INITIAL_DATA));
    }

    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) {
      saveData(INITIAL_DATA, filePath);
      return JSON.parse(JSON.stringify(INITIAL_DATA));
    }

    const parsed = JSON.parse(content);
    return {
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      budgets: parsed.budgets && typeof parsed.budgets === 'object' ? parsed.budgets : {},
      nextId: typeof parsed.nextId === 'number' ? parsed.nextId : (parsed.expenses?.length ? Math.max(...parsed.expenses.map(e => e.id || 0)) + 1 : 1)
    };
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Data file at "${filePath}" contains invalid JSON. Please check or reset the file.`);
    }
    throw err;
  }
}

/**
 * Saves storage data to the JSON file.
 *
 * @param {{ expenses: Array<any>, budgets: Record<string, number>, nextId: number }} data
 * @param {string} [filePath]
 */
export function saveData(data, filePath = DEFAULT_STORAGE_PATH) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = JSON.stringify(data, null, 2);
  // Write atomically via temporary file to prevent partial writes
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, filePath);
}
