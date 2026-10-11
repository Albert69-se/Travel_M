/**
 * Shared helpers: validation, id generation, date and money formatting.
 * No DOM and no storage access here, so this module is directly unit testable.
 */

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Money is displayed with two decimals per BR-15. Change to 0 for whole units. */
const MONEY_DECIMALS = 2;

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isPositiveNumber(value) {
  return isFiniteNumber(value) && value > 0;
}

export function isNonNegativeNumber(value) {
  return isFiniteNumber(value) && value >= 0;
}

export function isValidIsoDate(value) {
  if (!isNonEmptyString(value)) return false;
  const trimmed = value.trim();
  return ISO_DATE_PATTERN.test(trimmed) && !Number.isNaN(Date.parse(trimmed));
}

/** Rounds to cents so repeated add/subtract does not drift (BR-15). */
export function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount, currencyCode = 'THB') {
  if (!isFiniteNumber(amount)) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: MONEY_DECIMALS,
    maximumFractionDigits: MONEY_DECIMALS,
  }).format(amount);
}

/** "2026-11-12" -> "12 Nov 2026" */
export function formatDate(isoDate) {
  if (!isValidIsoDate(isoDate)) return '-';
  const [year, month, day] = isoDate.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[month - 1]} ${year}`;
}

export function createId(prefix) {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

/** True when the inclusive range is ordered and both ends are real dates. */
export function isValidDateRange(startDate, endDate) {
  return isValidIsoDate(startDate) && isValidIsoDate(endDate) && startDate <= endDate;
}

export function isDateWithinRange(date, startDate, endDate) {
  return isValidIsoDate(date) && date >= startDate && date <= endDate;
}

/** Every calendar date from start to end inclusive. */
export function listDatesInRange(startDate, endDate) {
  if (!isValidDateRange(startDate, endDate)) return [];
  const dates = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const last = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function sumBy(items, selector) {
  return roundMoney(items.reduce((total, item) => total + (Number(selector(item)) || 0), 0));
}

export function sortByIsoDate(a, b) {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

/** Creates an element with text set via textContent, never innerHTML. */
export function el(tagName, options = {}, children = []) {
  const node = document.createElement(tagName);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = String(options.text);
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      if (value !== undefined && value !== null) node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child) node.append(child);
  }
  return node;
}
