/**
 * Place search, filtering, and saved-place links.
 * Pure functions only, so the filtering rules can be unit tested without a DOM.
 */

import { isNonEmptyString } from './utils.js';

/** Case-insensitive keyword match across the fields a traveller would search. */
export function matchesQuery(place, query) {
  if (!isNonEmptyString(query)) return true;
  const needle = query.trim().toLowerCase();
  const haystack = [place.name, place.locality, place.administrativeArea, place.countryCode, place.category, place.description]
    .filter(isNonEmptyString)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

export function matchesCategory(place, category) {
  if (!isNonEmptyString(category) || category === 'All') return true;
  return place.category === category;
}

/** Applies the active filters together; every result satisfies both. */
export function findPlaces(places, { query = '', category = 'All' } = {}) {
  if (!Array.isArray(places)) return [];
  return places.filter((place) => matchesQuery(place, query) && matchesCategory(place, category));
}

export function getPlaceById(places, placeId) {
  if (!Array.isArray(places)) return null;
  return places.find((place) => place.id === placeId) || null;
}

export function isPlaceSaved(savedPlaces, userId, placeId) {
  if (!Array.isArray(savedPlaces)) return false;
  return savedPlaces.some((link) => link.userId === userId && link.placeId === placeId);
}

/**
 * Adds a saved-place link. One traveller can save a given place only once,
 * so a duplicate request returns the original list unchanged.
 */
export function savePlace(savedPlaces, userId, placeId, now = new Date().toISOString()) {
  const links = Array.isArray(savedPlaces) ? savedPlaces : [];
  if (isPlaceSaved(links, userId, placeId)) return links;
  return [...links, { id: `saved-${userId}-${placeId}`, userId, placeId, createdAt: now }];
}

export function removeSavedPlace(savedPlaces, userId, placeId) {
  if (!Array.isArray(savedPlaces)) return [];
  return savedPlaces.filter((link) => !(link.userId === userId && link.placeId === placeId));
}

/** Joins saved links back to full place records for display. */
export function getSavedPlaces(savedPlaces, places, userId) {
  if (!Array.isArray(savedPlaces)) return [];
  return savedPlaces
    .filter((link) => link.userId === userId)
    .map((link) => getPlaceById(places, link.placeId))
    .filter((place) => place !== null);
}

/** Wording used by the interface for a record's provenance. */
export function describeProvenance(place) {
  const source = isNonEmptyString(place.sourceReference) ? place.sourceReference : 'Source not supplied';
  const checked = isNonEmptyString(place.lastCheckedAt) ? `Last checked ${place.lastCheckedAt}` : 'Last checked: unknown';
  const status = isNonEmptyString(place.contentStatus) ? place.contentStatus.replace('_', ' ') : 'status unknown';
  return { source, checked, status };
}
