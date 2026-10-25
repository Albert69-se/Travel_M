/**
 * Map provider adapter: Leaflet rendering OpenStreetMap tiles.
 *
 * Deliberately the same shape as the weather adapter. The provider sits behind a
 * small module so it can be replaced or switched off without touching the rest of
 * the application, and a missing provider degrades to a labelled placeholder with
 * a stated reason instead of an empty grey rectangle.
 *
 * Leaflet itself is loaded from a CDN by index.html. Nothing in this module
 * assumes it arrived: every entry point checks for it first, which is what keeps
 * the rest of the application working offline.
 *
 * Leaflet and the OpenStreetMap tile service both work without a key or an
 * account. The tile images come from the OpenStreetMap Foundation's public tile
 * servers, and their tile usage policy requires attribution, expects light use,
 * and does not allow the service to be treated as a free CDN for a product. That
 * is fine for a course prototype, and the README says so rather than leaving it
 * implicit.
 */

import { isFiniteNumber } from './utils.js';

export const MAP_MODES = {
  NONE: 'none',
  LEAFLET_OSM: 'leaflet-osm',
};

/**
 * The map is on by default because neither Leaflet nor OpenStreetMap needs
 * credentials. Set to MAP_MODES.NONE to demonstrate the "provider switched off"
 * placeholder, the way WEATHER_MODES.NONE does for the weather tab.
 */
export const ACTIVE_MAP_MODE = MAP_MODES.LEAFLET_OSM;

const PROVIDER_NAME = 'Leaflet + OpenStreetMap';
const TILE_URL_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_MAX_ZOOM = 19;
/**
 * Plain text on purpose: Leaflet writes its attribution control with innerHTML,
 * so no markup is supplied here. The clickable credit to openstreetmap.org is
 * built as a DOM node in the interface instead. The © character is the literal
 * one, so nothing has to be decoded.
 */
const TILE_ATTRIBUTION = '© OpenStreetMap contributors';
const SINGLE_PLACE_ZOOM = 14;
const FIT_BOUNDS_MAX_ZOOM = 15;
const FIT_BOUNDS_PADDING = [24, 24];

/** Marker styling. Grey, so the map stays consistent with the wireframe look. */
const MARKER_STYLE = {
  radius: 7,
  color: '#1c1c1c',
  weight: 2,
  fillColor: '#f4f4f4',
  fillOpacity: 1,
};

/** The Leaflet global, or null when the library did not load. */
function leaflet() {
  if (typeof window === 'undefined') return null;
  const L = window.L;
  return L && typeof L.map === 'function' ? L : null;
}

export function isLeafletAvailable() {
  return leaflet() !== null;
}

/** What the interface tells the user about where the map comes from. */
export function describeProvider(mode = ACTIVE_MAP_MODE) {
  if (mode === MAP_MODES.NONE) {
    return { provider: 'Not connected', tiles: 'None', licence: 'No map provider is configured.' };
  }
  return {
    provider: PROVIDER_NAME,
    tiles: 'OpenStreetMap standard tiles',
    licence: 'Tiles © OpenStreetMap contributors (ODbL). No API key or account is required.',
  };
}

/** A coordinate pair is only usable if both numbers are real and on the globe. */
export function isUsableCoordinate(latitude, longitude) {
  return (
    isFiniteNumber(latitude) &&
    isFiniteNumber(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/** Only places with usable coordinates can be placed on a map. */
export function getMappablePlaces(places) {
  if (!Array.isArray(places)) return [];
  return places.filter((place) => place && isUsableCoordinate(place.latitude, place.longitude));
}

/**
 * Pure decision function, so the reason a map is not shown can be tested without
 * a DOM: a provider that is switched off, a library that did not load, or data
 * with no usable coordinates are three different situations and are never
 * presented as the same one.
 */
export function describeAvailability({ mode = ACTIVE_MAP_MODE, leafletAvailable = false, places = [], subject = 'record' } = {}) {
  if (mode === MAP_MODES.NONE) {
    return { available: false, reason: 'The map provider is switched off, so these locations are not shown on a map.' };
  }
  if (!leafletAvailable) {
    return {
      available: false,
      reason: 'The map library did not load — the page may be offline. Locations are still listed with their recorded coordinates.',
    };
  }
  if (!Array.isArray(places) || places.length === 0) {
    return { available: false, reason: `Nothing to map: no ${subject} to show.` };
  }
  if (getMappablePlaces(places).length === 0) {
    return { available: false, reason: `Nothing to map: no ${subject} here has usable coordinates.` };
  }
  return { available: true, reason: '' };
}

/** Bounding box for a set of places, or null when none of them can be mapped. */
export function boundsForPlaces(places) {
  const mappable = getMappablePlaces(places);
  if (mappable.length === 0) return null;
  return mappable.reduce(
    (box, place) => ({
      minLatitude: Math.min(box.minLatitude, place.latitude),
      maxLatitude: Math.max(box.maxLatitude, place.latitude),
      minLongitude: Math.min(box.minLongitude, place.longitude),
      maxLongitude: Math.max(box.maxLongitude, place.longitude),
    }),
    {
      minLatitude: mappable[0].latitude,
      maxLatitude: mappable[0].latitude,
      minLongitude: mappable[0].longitude,
      maxLongitude: mappable[0].longitude,
    },
  );
}

/** "18.8049° N, 98.9216° E" — hemisphere letters, so it is readable in a sentence. */
export function formatCoordinates(latitude, longitude) {
  if (!isUsableCoordinate(latitude, longitude)) return 'Coordinates not recorded';
  const lat = `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lng}`;
}

/* ------------------------------------------------------------ rendering --- */

/**
 * Leaflet cannot measure a container that is not in the document yet, so the
 * interface builds the container during render and calls mountMap afterwards.
 */
const mounted = [];
/** Remembers the last view per marker set, so a re-render does not reset a pan. */
const rememberedViews = new Map();

/** A popup built from DOM nodes and textContent, never from an HTML string. */
function popupContent(place) {
  const node = document.createElement('div');
  node.className = 'map-popup';

  const name = document.createElement('strong');
  name.textContent = place.name;
  node.append(name);

  const detail = document.createElement('p');
  detail.textContent = `${place.category} · ${place.locality}`;
  node.append(detail);

  const coordinates = document.createElement('p');
  coordinates.className = 'map-popup-coordinates';
  coordinates.textContent = formatCoordinates(place.latitude, place.longitude);
  node.append(coordinates);

  const link = document.createElement('button');
  link.type = 'button';
  link.textContent = 'View details';
  link.setAttribute('data-action', 'place:view');
  link.setAttribute('data-place-id', place.id);
  node.append(link);

  // Official Maps URL syntax requires no Google API key; it remains available
  // when the in-page map provider is switched off or a demo quota is exhausted.
  const external = document.createElement('a');
  const params = new URLSearchParams({ api: '1', query: `${place.latitude},${place.longitude}` });
  external.href = `https://www.google.com/maps/search/?${params}`;
  external.target = '_blank';
  external.rel = 'noopener noreferrer';
  external.textContent = 'Open in Google Maps';
  node.append(external);

  return node;
}

/**
 * Draws the map. Returns { ok: true, map } or { ok: false, reason } and never
 * throws: a mapping failure must not take the page down with it.
 */
export function mountMap(container, places, options = {}) {
  const { mode = ACTIVE_MAP_MODE, context = 'map' } = options;
  const availability = describeAvailability({ mode, leafletAvailable: isLeafletAvailable(), places, subject: options.subject });
  if (!container || !availability.available) {
    return { ok: false, reason: availability.reason };
  }

  const L = leaflet();
  const mappable = getMappablePlaces(places);

  try {
    const map = L.map(container, {
      // The page is the primary surface and the map is a supporting view, so a
      // scroll over the map must not trap the page. Zoom control and dragging
      // still work.
      scrollWheelZoom: false,
      worldCopyJump: true,
    });

    L.tileLayer(TILE_URL_TEMPLATE, {
      maxZoom: TILE_MAX_ZOOM,
      attribution: TILE_ATTRIBUTION,
    }).addTo(map);

    const latLngs = [];
    for (const place of mappable) {
      const latLng = [place.latitude, place.longitude];
      latLngs.push(latLng);
      L.circleMarker(latLng, MARKER_STYLE)
        .addTo(map)
        .bindTooltip(place.name, { direction: 'top' })
        .bindPopup(popupContent(place));
    }

    const signature = `${context}:${mappable.map((place) => place.id).join('|')}`;
    const remembered = rememberedViews.get(signature);
    if (remembered) {
      map.setView(remembered.center, remembered.zoom);
    } else if (latLngs.length === 1) {
      map.setView(latLngs[0], SINGLE_PLACE_ZOOM);
    } else {
      map.fitBounds(L.latLngBounds(latLngs), { padding: FIT_BOUNDS_PADDING, maxZoom: FIT_BOUNDS_MAX_ZOOM });
    }

    // Leaflet measures the container when it is created; the interface mounts
    // maps right after painting, so one pass after layout keeps the tiles aligned.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => map.invalidateSize());
    }

    mounted.push({ map, signature });
    return { ok: true, map, markerCount: latLngs.length };
  } catch (error) {
    return { ok: false, reason: `The map could not be drawn: ${error.message}` };
  }
}

/**
 * Drops the previous maps before a re-render, so Leaflet instances do not pile
 * up, and remembers where each set of markers was left.
 */
export function releaseMountedMaps() {
  while (mounted.length > 0) {
    const entry = mounted.pop();
    try {
      const center = entry.map.getCenter();
      rememberedViews.set(entry.signature, { center: [center.lat, center.lng], zoom: entry.map.getZoom() });
      entry.map.remove();
    } catch {
      // A map that is already gone needs no cleanup.
    }
  }
}
