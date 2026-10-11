/**
 * Expenses, totals, and budget status.
 *
 * Business rules applied here:
 *   totalSpent        = sum of the trip's expenses
 *   remainingBudget   = expectedBudget - totalSpent
 *   nearing budget    = totalSpent >= 80% of a positive budget
 *   over budget       = remainingBudget < 0  (never clamped to zero)
 */

import { createId, isNonEmptyString, isValidIsoDate, isPositiveNumber, roundMoney, sumBy, sortByIsoDate } from './utils.js';
import { EXPENSE_CATEGORIES } from './data.js';

export const NEARING_BUDGET_RATIO = 0.8;

export function validateExpense(input) {
  const errors = {};
  const description = isNonEmptyString(input.description) ? input.description.trim() : '';
  const amount = typeof input.amount === 'string' ? Number(input.amount) : input.amount;
  const category = isNonEmptyString(input.category) ? input.category : '';
  const date = isNonEmptyString(input.date) ? input.date.trim() : '';
  const notes = isNonEmptyString(input.notes) ? input.notes.trim() : '';

  if (!description) errors.description = 'Enter a description.';
  if (!isPositiveNumber(amount)) errors.amount = 'Enter an amount greater than zero.';
  if (!EXPENSE_CATEGORIES.includes(category)) errors.category = 'Choose a category.';
  if (!isValidIsoDate(date)) errors.date = 'Enter a valid expense date.';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: {
      description,
      amount: isPositiveNumber(amount) ? roundMoney(amount) : 0,
      category,
      date,
      notes,
    },
  };
}

export function addExpense(expenses, tripId, input) {
  const { valid, errors, values } = validateExpense(input);
  if (!valid) return { ok: false, errors };
  const expense = { id: createId('expense'), tripId, ...values };
  return { ok: true, expenses: [...(Array.isArray(expenses) ? expenses : []), expense] };
}

export function updateExpense(expenses, expenseId, input) {
  const { valid, errors, values } = validateExpense(input);
  if (!valid) return { ok: false, errors };

  let found = false;
  const next = (Array.isArray(expenses) ? expenses : []).map((expense) => {
    if (expense.id !== expenseId) return expense;
    found = true;
    return { ...expense, ...values };
  });
  if (!found) return { ok: false, errors: { form: 'That expense no longer exists.' } };
  return { ok: true, expenses: next };
}

export function deleteExpense(expenses, expenseId) {
  if (!Array.isArray(expenses)) return [];
  return expenses.filter((expense) => expense.id !== expenseId);
}

export function listByTrip(expenses, tripId) {
  if (!Array.isArray(expenses)) return [];
  return expenses.filter((expense) => expense.tripId === tripId).sort(sortByIsoDate);
}

export function totalSpent(expenses, tripId) {
  return sumBy(listByTrip(expenses, tripId), (expense) => expense.amount);
}

export function remainingBudget(expenses, trip) {
  if (!trip) return 0;
  return roundMoney(trip.expectedBudget - totalSpent(expenses, trip.id));
}

/** Category groups always sum back to the same total spending. */
export function totalsByCategory(expenses, tripId) {
  const totals = new Map();
  for (const expense of listByTrip(expenses, tripId)) {
    totals.set(expense.category, roundMoney((totals.get(expense.category) || 0) + expense.amount));
  }
  return [...totals.entries()].map(([category, amount]) => ({ category, amount }));
}

/**
 * Deterministic budget status. `over` takes precedence over `nearing`, and a
 * negative remainder is reported as over budget rather than clamped to zero.
 */
export function budgetStatus(expenses, trip) {
  if (!trip) return { level: 'unknown', label: 'No trip', percentSpent: 0 };
  const spent = totalSpent(expenses, trip.id);
  const remaining = roundMoney(trip.expectedBudget - spent);
  const percentSpent = trip.expectedBudget > 0 ? Math.round((spent / trip.expectedBudget) * 100) : 0;

  if (remaining < 0) {
    return {
      level: 'over',
      label: 'Over budget',
      percentSpent,
      spent,
      remaining,
      message: `Spending is over the planned budget by ${Math.abs(remaining).toFixed(2)}.`,
    };
  }
  if (trip.expectedBudget > 0 && spent >= NEARING_BUDGET_RATIO * trip.expectedBudget) {
    return {
      level: 'nearing',
      label: 'Nearing budget',
      percentSpent,
      spent,
      remaining,
      message: 'Spending has reached at least 80% of the planned budget.',
    };
  }
  return { level: 'ok', label: 'Within budget', percentSpent, spent, remaining, message: '' };
}
