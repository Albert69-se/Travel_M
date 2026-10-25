/**
 * Formatting helpers. All date and money formatting goes through the core
 * utilities so the React build and the HTML prototype print identical strings.
 */
import { EXPENSE_CATEGORIES } from '../../core/data.js';
import { formatDate, formatMoney, listDatesInRange, todayIsoDate } from '../../core/utils.js';
import { tripDayCount } from '../../core/trips.js';

export { tripDayCount };

export function money(amount, currencyCode = 'THB') {
  return formatMoney(amount, currencyCode);
}

export function shortDate(isoDate) {
  return formatDate(isoDate);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2026-11-12" -> "Wed 12 Nov" */
export function weekdayDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return `${WEEKDAYS[date.getDay()]} ${formatDate(isoDate)}`;
}

/** "2026-11-12" + "2026-11-15" -> "12 Nov 2026 – 15 Nov 2026" */
export function dateRange(startDate, endDate) {
  if (!startDate && !endDate) return 'Dates not set';
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

export function dayCountLabel(trip) {
  const days = tripDayCount(trip);
  const nights = Math.max(0, days - 1);
  return `${days} ${days === 1 ? 'day' : 'days'} · ${nights} ${nights === 1 ? 'night' : 'nights'}`;
}

/** Whole days from today until the trip starts; negative once it has started. */
export function daysUntil(startDate) {
  if (!startDate) return null;
  const today = new Date(`${todayIsoDate()}T00:00:00`);
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  return Math.round((start - today) / 86400000);
}

export function countdownLabel(startDate) {
  const days = daysUntil(startDate);
  if (days === null) return 'Dates not set';
  if (days > 1) return `Starts in ${days} days`;
  if (days === 1) return 'Starts tomorrow';
  if (days === 0) return 'Starts today';
  return 'Already under way';
}

export function tripDates(trip) {
  if (!trip) return [];
  return listDatesInRange(trip.startDate, trip.endDate);
}

/** A dot colour per expense category, in the order the vocabulary is declared. */
const CATEGORY_COLOURS = ['bg-accent', 'bg-success', 'bg-warning', 'bg-danger', 'bg-ink-tertiary', 'bg-ink-secondary'];

export function categoryColour(category) {
  const index = EXPENSE_CATEGORIES.indexOf(category);
  return CATEGORY_COLOURS[index === -1 ? CATEGORY_COLOURS.length - 1 : index];
}

export function percentage(part, whole) {
  if (!whole || whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

/** A destination photo is only decoration; this keeps a stable pick per place. */
export function titleCase(value) {
  if (typeof value !== 'string' || value.length === 0) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
