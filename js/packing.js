/**
 * Packing checklist, kept separate for every trip.
 *
 * Suggested items may be drafted, but a suggestion is only ever added on an
 * explicit action and never overwrites what the traveller has already confirmed.
 */

import { createId, isNonEmptyString } from './utils.js';
import { DEFAULT_PACKING_NAMES } from './data.js';

export function addPackingItem(packing, tripId, name) {
  const label = isNonEmptyString(name) ? name.trim() : '';
  if (!label) return { ok: false, errors: { name: 'Enter an item name.' } };

  const item = { id: createId('packing'), tripId, name: label, isPacked: false };
  return { ok: true, packing: [...(Array.isArray(packing) ? packing : []), item] };
}

export function togglePackingItem(packing, itemId) {
  if (!Array.isArray(packing)) return [];
  return packing.map((item) => (item.id === itemId ? { ...item, isPacked: !item.isPacked } : item));
}

export function renamePackingItem(packing, itemId, name) {
  const label = isNonEmptyString(name) ? name.trim() : '';
  if (!label) return packing;
  return (Array.isArray(packing) ? packing : []).map((item) => (item.id === itemId ? { ...item, name: label } : item));
}

export function deletePackingItem(packing, itemId) {
  if (!Array.isArray(packing)) return [];
  return packing.filter((item) => item.id !== itemId);
}

/** Only this trip's items; items from another trip must never appear. */
export function listByTrip(packing, tripId) {
  if (!Array.isArray(packing)) return [];
  return packing.filter((item) => item.tripId === tripId);
}

export function packingCounts(packing, tripId) {
  const items = listByTrip(packing, tripId);
  const packed = items.filter((item) => item.isPacked === true).length;
  return { packed, total: items.length, remaining: items.length - packed };
}

/**
 * Drafts the default suggestions for a trip, skipping any name it already has,
 * so an existing checklist is never regenerated over.
 */
export function suggestPackingItems(packing, tripId, suggestedNames = DEFAULT_PACKING_NAMES) {
  const existing = listByTrip(packing, tripId).map((item) => item.name.toLowerCase());
  const additions = suggestedNames
    .filter((name) => !existing.includes(name.toLowerCase()))
    .map((name, index) => ({ id: `packing-suggested-${tripId}-${index}-${Date.now().toString(36)}`, tripId, name, isPacked: false }));
  return [...(Array.isArray(packing) ? packing : []), ...additions];
}

/** Suggestions are not weather-based until a forecast is actually available. */
export function describeSuggestionSource(weatherAvailable) {
  return weatherAvailable
    ? 'Suggestions drafted from trip dates, destination and available weather.'
    : 'Suggestions are not weather-based until a forecast is available.';
}
