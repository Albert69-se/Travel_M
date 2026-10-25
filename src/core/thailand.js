/**
 * Curated Thailand-wide editorial shortlist. Unlike the 12,389-record OSM
 * extract this loads locally without downloading a giant JSON.
 * Historical OSM references can still resolve on demand for saved places/trips.
 */
import { PLACE_CATEGORIES } from './data.js';
import { POPULAR_THAILAND_PLACES } from './featured.js';

const CATEGORIES = PLACE_CATEGORIES.filter((category) => category !== 'All');
let legacyPromise = null;

export function isImportablePlace(record) {
  return Boolean(record) && typeof record === 'object' &&
    typeof record.id === 'string' && Boolean(record.id) &&
    typeof record.name === 'string' && Boolean(record.name) &&
    CATEGORIES.includes(record.category) &&
    Number.isFinite(record.latitude) && record.latitude >= -90 && record.latitude <= 90 &&
    Number.isFinite(record.longitude) && record.longitude >= -180 && record.longitude <= 180 &&
    typeof record.sourceReference === 'string' && Boolean(record.sourceReference);
}

export async function loadThailandPlaces() {
  const places = POPULAR_THAILAND_PLACES.filter(isImportablePlace);
  return places.length
    ? { status: 'ok', places, meta: { title: 'Popular places across Thailand', selection: 'Editorial shortlist; not an official popularity ranking' }, message: '' }
    : { status: 'error', places: [], meta: null, message: 'The popular places list is unavailable.' };
}

/** Recover historic OSM records only when the traveller actually references one.
 * Archival assets are not part of the Discover catalog or map.
 */
export async function loadReferencedLegacyPlaces(ids) {
  const referenced = new Set((ids || []).filter((id) => typeof id === 'string' && id.startsWith('osm-')));
  if (!referenced.size) return [];
  if (!legacyPromise) {
    legacyPromise = (async () => {
      try {
        const base = typeof window !== 'undefined' ? `${window.location.origin}/` : 'http://localhost/';
        const response = await fetch(new URL('data/thailand-places.json', base));
        if (!response.ok) throw new Error(`Legacy HTTP ${response.status}`);
        const payload = await response.json();
        return Array.isArray(payload.places) ? payload.places : [];
      } catch (error) {
        console.warn('Previously saved OSM places could not be recovered:', error);
        legacyPromise = null;
        return [];
      }
    })();
  }
  const imported = await legacyPromise;
  return imported.filter((place) => referenced.has(place.id) && isImportablePlace(place))
    .map((place) => ({ ...place, archived: true }));
}
