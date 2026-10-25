/**
 * Optional Google Maps JavaScript provider for the COURSE DEMO only.
 *
 * The API key is read from maps-config.local.json, which is gitignored.
 * Important: browser keys remain visible in network requests; never treat
 * this local file as a secure way to hold a server-side credential.
 *
 * OpenStreetMap + Leaflet remain a working fallback if this provider fails.
 * Place names/coordinates are still Travel-M data, not verified Google facts.
 */
import { getMappablePlaces } from './map.js';

export function googleMapsSearchUrl(place) {
  const params = new URLSearchParams({ api: '1' });
  const hasCoordinates = getMappablePlaces([place]).length === 1;
  params.set('query', hasCoordinates
    ? `${place.latitude},${place.longitude}`
    : [place?.name, place?.locality, place?.administrativeArea].filter(Boolean).join(', '));
  return `https://www.google.com/maps/search/?${params}`;
}

export function googleMapsDirectionsUrl(place) {
  const params = new URLSearchParams({ api: '1' });
  const hasCoordinates = getMappablePlaces([place]).length === 1;
  params.set('destination', hasCoordinates
    ? `${place.latitude},${place.longitude}`
    : [place?.name, place?.locality, place?.administrativeArea].filter(Boolean).join(', '));
  return `https://www.google.com/maps/dir/?${params}`;
}

/** A missing local config is normal: a deployed keyless app uses Leaflet. */
export async function readLocalGoogleMapsKey(fetcher = fetch) {
  try {
    const response = await fetcher(new URL('./maps-config.local.json', import.meta.url), { cache: 'no-store' });
    if (!response.ok) return null;
    const config = await response.json();
    return typeof config?.apiKey === 'string' && config.apiKey.trim() ? config.apiKey.trim() : null;
  } catch {
    return null;
  }
}

let libraryPromise = null;
let authorizationFailed = false;
const mounted = [];

function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Google Maps requires a browser.'));
  }
  if (authorizationFailed) return Promise.reject(new Error('Google Maps authorization was rejected.'));
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (libraryPromise) return libraryPromise;

  libraryPromise = new Promise((resolve, reject) => {
    const callback = '__travelmGoogleMapsReady';
    let complete = false;
    const script = document.createElement('script');
    const url = new URL('https://maps.googleapis.com/maps/api/js');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('v', 'weekly');
    url.searchParams.set('loading', 'async');
    url.searchParams.set('callback', callback);
    const timeout = window.setTimeout(() => finish(new Error('Google Maps timed out.')), 12000);

    function finish(error) {
      if (complete) return;
      complete = true;
      window.clearTimeout(timeout);
      delete window[callback];
      if (error) {
        libraryPromise = null;
        script.remove();
        reject(error);
      } else {
        resolve(window.google.maps);
      }
    }

    // The Maps API calls this hook when a key/referrer is rejected.
    window.gm_authFailure = () => {
      authorizationFailed = true;
      finish(new Error('Google Maps rejected this demo key or website referrer.'));
      // Auth failure can also arrive after the script's ready callback.
      window.dispatchEvent(new Event('travelm:google-maps-error'));
    };
    window[callback] = () => {
      if (!window.google?.maps?.Map || authorizationFailed) {
        finish(new Error('Google Maps did not initialize.'));
      } else {
        finish(null);
      }
    };
    script.onerror = () => finish(new Error('Google Maps script could not load.'));
    script.async = true;
    script.src = url.href;
    document.head.append(script);
  });
  return libraryPromise;
}

function popupContent(place) {
  const wrapper = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = place.name;
  const detail = document.createElement('p');
  detail.textContent = [place.category, place.locality].filter(Boolean).join(' · ');
  const maps = document.createElement('a');
  maps.textContent = 'Open in Google Maps';
  maps.href = googleMapsSearchUrl(place);
  maps.target = '_blank';
  maps.rel = 'noopener noreferrer';
  wrapper.append(name, detail, maps);
  return wrapper;
}

/** Returns an explicit failure for the caller to switch to Leaflet. */
export async function mountGoogleMap(container, places, apiKey) {
  const mappable = getMappablePlaces(places);
  if (!container || !mappable.length || !apiKey) {
    return { ok: false, reason: 'Google Maps needs a key and a place with valid coordinates.' };
  }
  try {
    const maps = await loadGoogleMaps(apiKey);
    if (!container.isConnected) return { ok: false, reason: 'This map view was closed.' };
    const bounds = new maps.LatLngBounds();
    const first = mappable[0];
    const map = new maps.Map(container, {
      center: { lat: first.latitude, lng: first.longitude },
      zoom: 14,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      mapId: 'DEMO_MAP_ID',
    });
    const listeners = [];
    let AdvancedMarkerElement = null;
    if (typeof maps.importLibrary === 'function') {
      try {
        ({ AdvancedMarkerElement } = await maps.importLibrary('marker'));
      } catch {
        // Older Maps versions still supply the standard Marker constructor.
      }
    }
    if (!container.isConnected) return { ok: false, reason: 'This map view was closed.' };
    for (const place of mappable) {
      const position = { lat: place.latitude, lng: place.longitude };
      bounds.extend(position);
      const marker = AdvancedMarkerElement
        ? new AdvancedMarkerElement({ map, position, title: place.name })
        : new maps.Marker({ map, position, title: place.name });
      const info = new maps.InfoWindow({ content: popupContent(place) });
      listeners.push(marker.addListener('click', () => info.open({ anchor: marker, map })));
    }
    if (mappable.length > 1) map.fitBounds(bounds, 28);
    mounted.push({ map, listeners });
    return { ok: true, map, markerCount: mappable.length };
  } catch (error) {
    return { ok: false, reason: error?.message || 'Google Maps unavailable.' };
  }
}

export function releaseGoogleMaps() {
  while (mounted.length) {
    const { map, listeners } = mounted.pop();
    for (const listener of listeners) listener?.remove?.();
    // Google Maps instances are owned by their removed container.
    // Detach listeners so repeated app renders do not leak callbacks.
    if (typeof window !== 'undefined') window.google?.maps?.event?.clearInstanceListeners?.(map);
  }
}
