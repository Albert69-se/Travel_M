/**
 * Expenses — where the trip's money went.
 *
 * Totals, the remaining balance and the budget level all come from `useTripData`
 * so this screen never re-derives the arithmetic. Category bars are limited to
 * categories that actually appear in the records.
 */
import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, Check, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';

import {
  Button,
  Card,
  CardHeader,
  Divider,
  EmptyState,
  Field,
  FinePrint,
  IconButton,
  Notice,
  ProgressBar,
  Select,
  Stat,
  TextInput,
} from '../components/ui.jsx';
import { useData } from '../lib/store.jsx';
import { categoryColour, money, percentage, shortDate, tripDayCount } from '../lib/format.js';
import { EXPENSE_CATEGORIES } from '../../core/data.js';

const PROGRESS_TONE = { ok: 'success', nearing: 'warning', over: 'danger', unknown: 'accent' };
const NOTICE_TONE = { nearing: 'warning', over: 'danger' };

function emptyForm(date) {
  return { date, description: '', category: EXPENSE_CATEGORIES[0], amount: '' };
}

export default function ExpensesView() {
  const { trip, expenses, spent, remaining, budget, categoryTotals } = useOutletContext();
  const { addExpense, updateExpense, deleteExpense } = useData();

  const [form, setForm] = useState(() => emptyForm(trip.startDate));
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [errors, setErrors] = useState({});

  const dayCount = tripDayCount(trip);
  const dailyAverage = dayCount > 0 ? spent / dayCount : 0;

  // Only categories present in the records, and never a zero-value bar.
  const bars = useMemo(() => categoryTotals.filter((entry) => entry.amount > 0), [categoryTotals]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const clearForm = () => {
    setEditingId(null);
    setErrors({});
    setForm(emptyForm(trip.startDate));
  };

  const startEdit = (expense) => {
    setConfirmId(null);
    setErrors({});
    setEditingId(expense.id);
    setForm({
      date: expense.date,
      description: expense.description,
      category: expense.category,
      amount: String(expense.amount ?? ''),
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const input = {
      date: form.date,
      description: form.description,
      category: form.category,
      amount: form.amount,
    };
    const result = editingId ? updateExpense(editingId, input) : addExpense(trip.id, input);
    if (!result.ok) {
      setErrors(result.errors || {});
      return;
    }
    clearForm();
  };

  const handleDelete = (expenseId) => {
    deleteExpense(expenseId);
    setConfirmId(null);
    if (editingId === expenseId) clearForm();
  };

  const budgetWarning =
    budget.level === 'nearing' || budget.level === 'over' ? (
      <Notice tone={NOTICE_TONE[budget.level]} icon={AlertTriangle}>
        <span className="font-medium">{budget.label}.</span> {budget.message}
      </Notice>
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-ink">Expenses</h1>
          <p className="mt-0.5 text-body text-ink-secondary tm-numeric">
            {expenses.length === 1 ? '1 record' : `${expenses.length} records`} · planned budget{' '}
            {money(trip.expectedBudget)}
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Budget"
          value={money(trip.expectedBudget)}
          hint="Planned for this trip"
        />
        <Stat
          label="Spent"
          value={money(spent)}
          hint={`${budget.percentSpent}% of the planned budget`}
          progress={{
            value: budget.percentSpent,
            max: 100,
            tone: PROGRESS_TONE[budget.level] || 'accent',
            label: 'Share of budget spent',
          }}
        />
        <Stat
          label="Remaining"
          value={money(remaining)}
          tone={remaining < 0 ? 'danger' : 'success'}
          hint={remaining < 0 ? 'Over the planned budget' : 'Still available'}
        />
        <Stat
          label="Daily average"
          value={money(dailyAverage)}
          hint={dayCount === 1 ? 'Across 1 day' : `Across ${dayCount} days`}
        />
      </div>

      {budgetWarning}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card padded={false} className="overflow-hidden">
          <div className="p-4">
            <CardHeader
              title="Expense records"
              meta={`${expenses.length === 1 ? '1 entry' : `${expenses.length} entries`} · newest dates first`}
            />
          </div>
          <Divider />
          {expenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses recorded"
              description="Add the first expense with the form beside this table, and the totals will follow."
            />
          ) : (
            <div className="tm-scroll max-h-[560px] overflow-x-auto overflow-y-auto">
              <table className="w-full border-collapse text-body">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="px-3 py-2 text-left text-micro font-medium uppercase text-ink-tertiary">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-micro font-medium uppercase text-ink-tertiary">
                      Description
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-micro font-medium uppercase text-ink-tertiary">
                      Category
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-right text-micro font-medium uppercase text-ink-tertiary"
                    >
                      Amount
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-micro font-medium uppercase text-ink-tertiary">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-line hover:bg-canvas">
                      <td className="whitespace-nowrap px-3 py-2 text-label text-ink-secondary tm-numeric">
                        {shortDate(expense.date)}
                      </td>
                      <td className="px-3 py-2 text-ink">{expense.description}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-label text-ink-secondary">
                          <span
                            aria-hidden="true"
                            className={`size-2 shrink-0 rounded-chip ${categoryColour(expense.category)}`}
                          />
                          {expense.category}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-body font-medium text-ink tm-numeric">
                        {money(expense.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-0.5">
                          {confirmId === expense.id ? (
                            <>
                              <Button size="sm" variant="danger" onClick={() => handleDelete(expense.id)}>
                                Delete
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <IconButton
                                icon={Pencil}
                                label={`Edit ${expense.description}`}
                                onClick={() => startEdit(expense)}
                              />
                              <IconButton
                                icon={Trash2}
                                label={`Delete ${expense.description}`}
                                onClick={() => setConfirmId(expense.id)}
                              />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line-strong">
                    <td colSpan={3} className="px-3 py-2.5 text-label font-medium text-ink-secondary">
                      Total spent
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-body font-semibold text-ink tm-numeric">
                      {money(spent)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <CardHeader
              title="By category"
              meta={
                bars.length === 0
                  ? 'No categories yet'
                  : bars.length === 1
                    ? '1 category with spending'
                    : `${bars.length} categories with spending`
              }
            />
            {bars.length === 0 ? (
              <p className="text-label text-ink-tertiary">
                Category shares appear once an expense is recorded. Only categories in the records are shown.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {bars.map((entry) => (
                  <li key={entry.category} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-body text-ink">
                        <span
                          aria-hidden="true"
                          className={`size-2 shrink-0 rounded-chip ${categoryColour(entry.category)}`}
                        />
                        {entry.category}
                      </span>
                      <span className="shrink-0 text-label text-ink-secondary tm-numeric">
                        {money(entry.amount)} · {percentage(entry.amount, spent)}%
                      </span>
                    </div>
                    <ProgressBar
                      value={entry.amount}
                      max={spent > 0 ? spent : 1}
                      label={`${entry.category} share of spending`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <CardHeader
              title={editingId ? 'Edit expense' : 'Add expense'}
              meta={editingId ? 'Saving replaces the stored record.' : 'Recorded against this trip only.'}
            />
            <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
              <Field label="Date" htmlFor="expense-date" error={errors.date}>
                <TextInput
                  id="expense-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => setField('date', event.target.value)}
                />
              </Field>

              <Field label="Description" htmlFor="expense-description" error={errors.description}>
                <TextInput
                  id="expense-description"
                  value={form.description}
                  onChange={(event) => setField('description', event.target.value)}
                  placeholder="e.g. Museum entry"
                />
              </Field>

              <Field label="Category" htmlFor="expense-category" error={errors.category}>
                <Select
                  id="expense-category"
                  value={form.category}
                  onChange={(event) => setField('category', event.target.value)}
                >
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Amount" htmlFor="expense-amount" error={errors.amount}>
                <TextInput
                  id="expense-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) => setField('amount', event.target.value)}
                />
              </Field>

              {errors.form ? (
                <p className="text-label text-danger" role="alert">
                  {errors.form}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="primary" icon={editingId ? Check : Plus}>
                  {editingId ? 'Save changes' : 'Add expense'}
                </Button>
                {editingId ? (
                  <Button variant="ghost" onClick={clearForm}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
            <FinePrint>Amounts are entered by hand; totals come from the records stored for this trip.</FinePrint>
          </Card>
        </div>
      </div>
    </div>
  );
}
