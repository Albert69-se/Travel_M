/**
 * TravelM curated catalog compatibility layer.
 * Reads/writes only documented TravelM localStorage keys. No resets or migrations.
 * Works in browsers and is independently tested using an injected storage object.
 */
export const KEYS = Object.freeze({
  places: 'travelm.places',
  saved: 'travelm.savedPlaces',
  trips: 'travelm.trips',
  itinerary: 'travelm.itinerary',
  session: 'travelm.session',
  users: 'travelm.users'
});

export function readArray(storage, key) {
  try { const v = JSON.parse(storage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
export function readSession(storage) {
  try {
    const value = JSON.parse(storage.getItem(KEYS.session) || 'null');
    return value && typeof value.userId === 'string' ? value : null;
  } catch { return null; }
}
export function currentUser(storage) {
  const session = readSession(storage);
  if (!session) return null;
  return readArray(storage, KEYS.users).find(user => user.id === session.userId) || null;
}
export function ownedTrips(storage) {
  const user = currentUser(storage);
  return user ? readArray(storage, KEYS.trips).filter(trip => trip.userId === user.id) : [];
}
export function mergeKnownPlace(storage, place) {
  if (!place || !/^osm-[nwr]\d+$/.test(place.id)) throw new Error('Invalid imported place ID');
  const records = readArray(storage, KEYS.places);
  if (records.some(item => item.id === place.id)) return false;
  const { id, name, category, locality, administrativeArea, latitude, longitude,
    description, sourceReference, lastCheckedAt, contentStatus } = place;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Invalid coordinates');
  const appended = { id, name, category, locality, administrativeArea, countryCode: 'TH',
    latitude, longitude, description, sourceReference, lastCheckedAt,
    contentStatus: contentStatus || 'imported', estimatedCost: null,
    estimatedCostNote: 'Entrance fee unknown; verify directly.', openingHours: null
  };
  // Append only. Existing local records, edits, and place references remain unchanged.
  storage.setItem(KEYS.places, JSON.stringify([...records, appended]));
  return true;
}
export function isSaved(storage, placeId) {
  const user = currentUser(storage);
  return !!user && readArray(storage, KEYS.saved).some(s => s.userId === user.id && s.placeId === placeId);
}
export function toggleSave(storage, place) {
  const user = currentUser(storage);
  if (!user) return { ok: false, message: 'Sign in to TravelM to save places.' };
  const saved = readArray(storage, KEYS.saved);
  const existing = saved.some(s => s.userId === user.id && s.placeId === place.id);
  if (existing) {
    storage.setItem(KEYS.saved, JSON.stringify(saved.filter(s => !(s.userId === user.id && s.placeId === place.id))));
  } else {
    mergeKnownPlace(storage, place);
    storage.setItem(KEYS.saved, JSON.stringify([
      ...saved, { id: `saved-${user.id}-${place.id}`, userId: user.id,
        placeId: place.id, createdAt: new Date().toISOString() }
    ]));
  }
  return { ok: true, saved: !existing };
}
export function addToItinerary(storage, { place, tripId, date }) {
  const user = currentUser(storage);
  if (!user) return { ok: false, message: 'Sign in to TravelM first.' };
  const trip = readArray(storage, KEYS.trips).find(t => t.id === tripId && t.userId === user.id);
  if (!trip) return { ok: false, message: 'Choose one of your trips.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date + 'T00:00:00Z')) ||
      date < trip.startDate || date > trip.endDate) {
    return { ok: false, message: 'Choose a valid date within your trip.' };
  }
  const itinerary = readArray(storage, KEYS.itinerary);
  if (itinerary.some(x => x.tripId === tripId && x.date === date && x.placeId === place.id)) {
    return { ok: false, message: 'This place is already on that day.' };
  }
  mergeKnownPlace(storage, place);
  const orderIndex = itinerary.filter(x => x.tripId === tripId && x.date === date).length;
  const record = {
    id: 'item-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)),
    tripId, placeId: place.id, title: place.name, date, notes: '', estimatedCost: 0, orderIndex
  };
  storage.setItem(KEYS.itinerary, JSON.stringify([...itinerary, record]));
  return { ok: true, item: record };
}
export function searchCatalog(places, { query = '', province = 'All', category = 'All' } = {}) {
  const term = query.toLocaleLowerCase().trim();
  return places.filter(p =>
    (province === 'All' || p.administrativeArea === province) &&
    (category === 'All' || p.category === category) &&
    (!term || [p.name, p.locality, p.administrativeArea, p.category].some(
      val => String(val || '').toLocaleLowerCase().includes(term)
    ))
  );
}
export function validateCatalog(files) {
  const places = files.flatMap(file => file?.places || []);
  if (places.length !== 200) throw new Error(`Catalog expected 200 records, found ${places.length}`);
  if (new Set(places.map(p => p.id)).size !== places.length) throw new Error('Duplicate catalog IDs');
  for (const p of places) {
    if (!/^osm-[nwr]\d+$/.test(p.id) || !p.name || !p.sourceReference || !p.lastCheckedAt ||
      !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) ||
      p.latitude < 17 || p.latitude > 21 || p.longitude < 97 || p.longitude > 101.5 ||
      p.contentStatus !== 'imported' || p.verificationStatus !== 'unverified' ||
      p.estimatedCost !== null || p.openingHours !== null) {
      throw new Error('Invalid catalog data: ' + p.id);
    }
  }
  return places;
}
