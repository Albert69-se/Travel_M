/**
 * Official Google Maps URLs are independent of the Maps JavaScript API and
 * don't consume a demo-key quota. Coordinates are Travel-M records, not
 * independently verified Google Places records.
 */
import { isUsableCoordinate } from './map.js';

function destination(place) {
  return place && isUsableCoordinate(place.latitude, place.longitude)
    ? `${place.latitude},${place.longitude}`
    : [place?.name, place?.locality, place?.administrativeArea].filter(Boolean).join(', ');
}

export function mapsPlaceUrl(place) {
  const params = new URLSearchParams({ api: '1', query: destination(place) });
  return `https://www.google.com/maps/search/?${params}`;
}

export function mapsDirectionsUrl(place) {
  const params = new URLSearchParams({ api: '1', destination: destination(place) });
  return `https://www.google.com/maps/dir/?${params}`;
}
