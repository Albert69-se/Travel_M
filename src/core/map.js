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
/**
 * The map draws at most this many markers. Discover can hold thousands of
 * results; the canvas renderer keeps drawing cheap, and the cap keeps the
 * tooltip/popup layer responsive. When the cap applies, the adapter reports
 * how many of how many were drawn so the interface can say so rather than
 * silently showing a subset.
 */
export const MIN_ATTRACTION_MARKER_ZOOM = 10;
export const ATTRACTION_MARKER_LIMIT = 40;

/**
 * At nationwide/region zoom the map is deliberately free of attraction pins.
 * A single place-detail pin always remains visible, even below the threshold.
 * At city zoom only in-viewport places render, capped for readability.
 */
export function selectVisibleMapPlaces(places, { zoom = 0, contains = () => true, limit = ATTRACTION_MARKER_LIMIT } = {}) {
  const mappable = getMappablePlaces(places);
  if (mappable.length !== 1 && zoom < MIN_ATTRACTION_MARKER_ZOOM) return [];
  return mappable.filter((place) => contains(place)).slice(0, limit);
}

/** Group nearby results at regional zoom; every valid place is represented. */
export function clusterMapPlaces(places, zoom = 5) {
  const cell = 360 / (2 ** Math.max(0, zoom)) * 0.28;
  const groups = new Map();
  for (const place of getMappablePlaces(places)) {
    const key = `${Math.floor(place.latitude / cell)}:${Math.floor(place.longitude / cell)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(place);
  }
  return [...groups.values()].map((members) => ({
    places: members,
    latitude: members.reduce((sum, p) => sum + p.latitude, 0) / members.length,
    longitude: members.reduce((sum, p) => sum + p.longitude, 0) / members.length,
  }));
}

/** Marker styling. Grey, so the map stays consistent with the wireframe look. */
const MARKER_STYLE = {
  radius: 9,
  color: '#ffffff',
  weight: 2,
  fillColor: '#147d70',
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

  return node;
}

/**
 * Draws the map. Returns `{ ok: true, map, markerCount, totalCount, truncated }`
 * or `{ ok: false, reason }` and never throws: a mapping failure must not take
 * the page down with it. Markers are drawn on a canvas and capped at
 * MARKER_LIMIT; the result reports the totals either way.
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
      // Hundreds of markers are routine here, so the canvas renderer draws
      // them without a DOM node per circle. Popups and tooltips still work.
      preferCanvas: true,
    });

    L.tileLayer(TILE_URL_TEMPLATE, {
      maxZoom: TILE_MAX_ZOOM,
      attribution: TILE_ATTRIBUTION,
    }).addTo(map);

    // Bounds come from all result places, but a country-scale map has NO pins.
    // Markers update as the visitor zooms and pans into an individual city.
    const latLngs = mappable.map((place) => [place.latitude, place.longitude]);
    const markerLayer = L.layerGroup().addTo(map);
    const updateMarkers = () => {
      markerLayer.clearLayers();
      const shown = selectVisibleMapPlaces(mappable, {
        zoom: map.getZoom(),
        contains: (place) => map.getBounds().contains([place.latitude, place.longitude]),
      });
      const grouped = mappable.length > 1 && map.getZoom() < MIN_ATTRACTION_MARKER_ZOOM;
      if (grouped) {
        for (const group of clusterMapPlaces(mappable, map.getZoom())) {
          const label = `${group.places.length} places near ${group.places[0].administrativeArea || group.places[0].locality}`;
          const marker = L.marker([group.latitude, group.longitude], {
            title: label, keyboard: true,
            icon: L.divIcon({ className: 'tm-cluster', html: `<span>${group.places.length}</span>`, iconSize: [42, 42], iconAnchor: [21, 21] }),
          }).addTo(markerLayer);
          marker.on('click', () => map.fitBounds(L.latLngBounds(group.places.map(p => [p.latitude, p.longitude])), { padding: [45, 45], maxZoom: 13 }));
        }
      }
      for (const place of shown) {
        L.circleMarker([place.latitude, place.longitude], MARKER_STYLE)
          .addTo(markerLayer)
          .bindTooltip(place.name, { direction: 'top' })
          .bindPopup(() => popupContent(place));
      }
      options.onMarkerChange?.({
        count: shown.length, total: mappable.length, zoom: map.getZoom(),
        minZoom: MIN_ATTRACTION_MARKER_ZOOM, grouped,
      });
    };

    const signature = `${context}:${mappable.map((place) => place.id).join('|')}`;
    const remembered = rememberedViews.get(signature);
    if (remembered) {
      map.setView(remembered.center, remembered.zoom);
    } else if (latLngs.length === 1) {
      map.setView(latLngs[0], SINGLE_PLACE_ZOOM);
    } else {
      map.fitBounds(L.latLngBounds(latLngs), { padding: FIT_BOUNDS_PADDING, maxZoom: FIT_BOUNDS_MAX_ZOOM });
    }
    map.on('moveend', updateMarkers);
    updateMarkers();

    // Leaflet measures the container when it is created; the interface mounts
    // maps right after painting, so one pass after layout keeps the tiles aligned.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => map.invalidateSize());
    }

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.invalidateSize()) : null;
    resizeObserver?.observe(container);
    const locationLayer = L.layerGroup().addTo(map);
    const entry = { map, signature };
    mounted.push(entry);
    return {
      ok: true,
      map,
      showLocation(point, center = true) {
        locationLayer.clearLayers();
        const latLng = [point.latitude, point.longitude];
        L.circle(latLng, { radius: point.accuracy, color: '#2563eb', weight: 1, fillOpacity: 0.1 }).addTo(locationLayer);
        L.circleMarker(latLng, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(locationLayer).bindTooltip('Your location');
        if (center) map.setView(latLng, 14);
      },
      focusPlace(place) { map.setView([place.latitude, place.longitude], 14); },
      fitResults() { map.fitBounds(L.latLngBounds(latLngs), { padding: [35, 35], maxZoom: 14 }); },
      cleanup() {
        resizeObserver?.disconnect();
        rememberedViews.set(signature, { center: map.getCenter(), zoom: map.getZoom() });
        if (rememberedViews.size > 30) rememberedViews.delete(rememberedViews.keys().next().value);
        map.remove();
        const index = mounted.indexOf(entry);
        if (index >= 0) mounted.splice(index, 1);
      },
      markerCount: markerLayer.getLayers().length,
      totalCount: mappable.length,
      truncated: mappable.length > markerLayer.getLayers().length,
    };
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
