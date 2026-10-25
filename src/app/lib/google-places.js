import { loadGoogleMapsLibrary } from './google-map.js';
import { discoverGooglePlaces, GOOGLE_PLACE_FIELDS, normalizeGooglePlace } from '../../core/google-places.js';

let catalogPromise;
let snapshot = { status: 'loading', places: [], meta: null, message: '' };
const listeners = new Set();
const details = new Map();
function publish(next) {
  snapshot = next;
  for (const listener of listeners) listener(next);
}

/** One bounded discovery run per tab, shared by StrictMode and every view. */
export function subscribeGoogleCatalog(listener) {
  listeners.add(listener);
  listener(snapshot);
  loadGoogleCatalog();
  return () => listeners.delete(listener);
}
export function loadGoogleCatalog(retry = false) {
  if (retry && snapshot.status !== 'loading') catalogPromise = null;
  if (catalogPromise) return catalogPromise;
  publish({ ...snapshot, status: 'loading', message: '' });
  catalogPromise = (async () => {
    try {
      const maps = await loadGoogleMapsLibrary();
      const { Place } = await maps.importLibrary('places');
      const result = await discoverGooglePlaces(Place, places => publish({ status: 'loading', places, meta: null, message: '' }));
      publish(result);
    } catch {
      publish({ status: 'error', places: [], meta: null, message: 'Google Places is unavailable. Enable Maps JavaScript API and Places API (New), billing and this website’s referrer access, then retry.' });
    }
    return snapshot;
  })();
  return catalogPromise;
}

/** Bookmarks store only the ID. Rehydrate fresh data even if search rankings change. */
export async function resolveGooglePlace(id) {
  if (!/^google-[A-Za-z0-9_-]+$/.test(id || '')) return null;
  const known = snapshot.places.find(place => place.id === id);
  if (known) return known;
  if (details.has(id)) return details.get(id);
  const promise = (async () => {
    try {
      const maps = await loadGoogleMapsLibrary();
      const { Place } = await maps.importLibrary('places');
      const place = new Place({ id: id.slice(7), requestedLanguage: 'en', requestedRegion: 'th' });
      await place.fetchFields({ fields: GOOGLE_PLACE_FIELDS });
      return normalizeGooglePlace(place);
    } catch { return null; }
  })();
  details.set(id, promise);
  const result = await promise;
  if (!result) details.delete(id);
  return result;
}
