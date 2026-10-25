/**
 * Demand-loaded Google Places photos (New). No photo URLs, photo names or
 * image bytes are saved to localStorage, files, or persistent caches.
 *
 * Google permits storing place IDs, so we reuse IDs in memory for this tab.
 * Every mounted photo receives fresh metadata from a fresh Place object.
 */
import { googlePlacePhotosEnabled, loadGoogleMapsLibrary } from './google-map.js';

const placeIds = new Map();
const MAX_PARALLEL_LOOKUPS = 2;
const pending = [];
let running = 0;

function runQueue() {
  while (running < MAX_PARALLEL_LOOKUPS && pending.length) {
    const { task, resolve, reject } = pending.shift();
    running += 1;
    Promise.resolve().then(task).then(resolve, reject).finally(() => {
      running -= 1;
      runQueue();
    });
  }
}

function limited(task) {
  return new Promise((resolve, reject) => {
    pending.push({ task, resolve, reject });
    runQueue();
  });
}

export function hasGooglePlacePhotos() {
  return googlePlacePhotosEnabled();
}

function kmDistance(a, b) {
  const rad = (value) => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function findPlaceId(Place, seed) {
  if (seed.googlePlaceId) return seed.googlePlaceId;
  if (placeIds.has(seed.id)) return placeIds.get(seed.id);

  const query = seed.googleSearchQuery ||
    [seed.name, seed.locality, seed.administrativeArea, 'Thailand'].filter(Boolean).join(', ');
  const { places } = await Place.searchByText({
    textQuery: query, fields: ['id', 'displayName', 'location'],
    region: 'th', language: 'en', maxResultCount: 4,
  });
  if (!places?.length) return null;
  const a = { lat: seed.latitude, lng: seed.longitude };
  const candidates = places
    .filter((entry) => entry.id && entry.location)
    .map((entry) => ({
      id: entry.id,
      distance: kmDistance(a, {
        lat: typeof entry.location.lat === 'function' ? entry.location.lat() : entry.location.lat,
        lng: typeof entry.location.lng === 'function' ? entry.location.lng() : entry.location.lng,
      }),
    }))
    .filter((entry) => Number.isFinite(entry.distance))
    .sort((x, y) => x.distance - y.distance);
  // Avoid silently pairing an attraction with an unrelated Google photo.
  if (!candidates.length || candidates[0].distance > 35) return null;
  placeIds.set(seed.id, candidates[0].id);
  return candidates[0].id;
}

export function fetchGooglePlacePhoto(place, maxWidth = 420) {
  return limited(async () => {
    if (!hasGooglePlacePhotos() || !place?.id) return null;
    const maps = await loadGoogleMapsLibrary();
    const { Place } = await maps.importLibrary('places');
    const id = await findPlaceId(Place, place);
    if (!id) return null;
    const details = new Place({ id });
    await details.fetchFields({ fields: ['photos'] });
    const photo = details.photos?.[0];
    if (!photo) return null;
    return {
      src: photo.getURI({ maxWidth }),
      authors: (photo.authorAttributions || []).map((author) => ({
        name: author.displayName || 'Google Maps contributor',
        uri: author.uri || null,
      })),
      mapsUri: photo.googleMapsURI || null,
    };
  });
}
