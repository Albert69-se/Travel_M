const cities = {
  'chiang mai': { id: 'weather-chiang-mai', name: 'Chiang Mai', latitude: 18.7883, longitude: 98.9853 },
  'chiang rai': { id: 'weather-chiang-rai', name: 'Chiang Rai', latitude: 19.9072, longitude: 99.8309 },
};
const label = value => String(value || '').trim().toLowerCase().replace(/\s+province$/, '');
const usable = place => place && Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90 &&
  Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180;

/** Explicit destinations win; city labels do not accidentally select a mountain. */
export function resolveWeatherPlace(places, trip, activities = []) {
  const candidates = places.filter(usable);
  const linked = candidates.find(place => place.id === trip.destinationId);
  if (linked) return linked;
  const destination = label(trip.destinationLabel);
  if (cities[destination]) return cities[destination];
  if (destination) {
    const named = candidates.find(place => label(place.name) === destination);
    if (named) return named;
    const regional = candidates.find(place => [place.locality, place.administrativeArea]
      .some(value => label(value) === destination));
    if (regional) return regional;
  }
  for (const activity of activities) {
    const place = candidates.find(entry => entry.id === activity.placeId);
    if (place) return place;
  }
  return null;
}
