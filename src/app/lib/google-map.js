/**
 * Optional Google Maps browser adapter for the course demo.
 * The Vite env key is public in the build; restrict by HTTP referrer and API.
 */
import {
  getMappablePlaces, selectVisibleMapPlaces, clusterMapPlaces, MIN_ATTRACTION_MARKER_ZOOM,
} from '../../core/map.js';

const STANDARD_KEY = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || '';
const KEY = STANDARD_KEY || import.meta.env?.VITE_GOOGLE_MAPS_DEMO_KEY || '';

export function googlePlacePhotosEnabled() { return Boolean(STANDARD_KEY.trim()); }
let libraryPromise;
let authRejected = false;

export function googleMapsDemoEnabled() {
  return Boolean(KEY.trim());
}

export function loadGoogleMapsLibrary() {
  if (!googleMapsDemoEnabled()) return Promise.reject(new Error('Google Maps demo mode is disabled.'));
  if (authRejected) return Promise.reject(new Error('Google Maps rejected the key.'));
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps is browser-only.'));
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (libraryPromise) return libraryPromise;

  libraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const callback = '__travelMDemoMapsLoaded';
    let settled = false;
    const timer = setTimeout(() => finish(new Error('Google Maps did not load within 12 seconds.')), 12000);

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      delete window[callback];
      if (error) {
        script.remove();
        libraryPromise = undefined;
        reject(error);
      } else {
        resolve(window.google.maps);
      }
    }

    window.gm_authFailure = () => {
      authRejected = true;
      finish(new Error('Google Maps rejected this key or website origin.'));
      window.dispatchEvent(new Event('travelm:google-auth-failure'));
    };
    window[callback] = () => {
      if (!window.google?.maps?.importLibrary || authRejected) finish(new Error('Google Maps was unavailable.'));
      else finish();
    };
    script.onerror = () => finish(new Error('Google Maps script could not be downloaded.'));
    const url = new URL('https://maps.googleapis.com/maps/api/js');
    url.searchParams.set('key', KEY.trim());
    url.searchParams.set('v', 'weekly');
    url.searchParams.set('loading', 'async');
    url.searchParams.set('callback', callback);
    script.async = true;
    script.src = url.toString();
    document.head.append(script);
  });
  return libraryPromise;
}

/**
 * Pins are cleared at country-level zoom. At city scale only 40 in-bounds
 * attractions are shown. Both map providers share one selection rule.
 */
export async function mountGoogleDemoMap(container, places, onOpenPlace, onMarkerChange, isCancelled = () => false) {
  const mappable = getMappablePlaces(places);
  if (!container || !mappable.length) return { ok: false, reason: 'No locations with usable coordinates.' };
  const maps = await loadGoogleMapsLibrary();
  if (isCancelled() || !container.isConnected) return { ok: false, reason: 'Map view is no longer active.' };

  const { AdvancedMarkerElement } = await maps.importLibrary('marker');
  if (isCancelled() || !container.isConnected) return { ok: false };
  const map = new maps.Map(container, {
    center: { lat: mappable[0].latitude, lng: mappable[0].longitude },
    zoom: 13,
    mapId: 'DEMO_MAP_ID',
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: 'cooperative',
    scrollwheel: false,
  });
  const bounds = new maps.LatLngBounds();
  for (const place of mappable) bounds.extend({ lat: place.latitude, lng: place.longitude });


  let active = [];
  let locationMarker;
  let accuracyCircle;
  let destroyed = false;
  const clearPins = () => {
    for (const { marker, popup, listener } of active) {
      listener.remove();
      popup?.close();
      marker.map = null;
    }
    active = [];
  };

  const refreshPins = () => {
    if (destroyed || !map.getBounds()) return;
    clearPins();
    const shown = selectVisibleMapPlaces(mappable, {
      zoom: map.getZoom(),
      contains: (place) => map.getBounds().contains({ lat: place.latitude, lng: place.longitude }),
    });
    const grouped = mappable.length > 1 && map.getZoom() < MIN_ATTRACTION_MARKER_ZOOM;
    if (grouped) {
      for (const group of clusterMapPlaces(mappable, map.getZoom())) {
        const content = document.createElement('div');
        content.className = 'tm-cluster';
        content.textContent = String(group.places.length);
        const marker = new AdvancedMarkerElement({ map, position: {lat: group.latitude, lng: group.longitude}, content,
          title: `${group.places.length} places near ${group.places[0].administrativeArea || group.places[0].locality}` });
        const listener = marker.addListener('click', () => {
          const groupBounds = new maps.LatLngBounds();
          group.places.forEach(p => groupBounds.extend({lat: p.latitude, lng: p.longitude}));
          map.fitBounds(groupBounds, 60);
          maps.event.addListenerOnce(map, 'idle', () => { if (!destroyed && map.getZoom() > 14) map.setZoom(14); });
        });
        active.push({marker, listener});
      }
    }
    for (const place of shown) {
      const pin = document.createElement('div');
      pin.className = 'tm-place-pin';
      const marker = new AdvancedMarkerElement({
        content: pin, map, position: { lat: place.latitude, lng: place.longitude }, title: place.name,
      });
      const content = document.createElement('div');
      content.className = 'map-popup';
      const heading = document.createElement('strong');
      heading.textContent = place.name;
      const detail = document.createElement('p');
      detail.textContent = [place.category, place.locality].filter(Boolean).join(' · ');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'View details';
      button.addEventListener('click', () => onOpenPlace?.(place.id));
      content.append(heading, detail, button);
      const popup = new maps.InfoWindow({ content });
      const listener = marker.addListener('click', () => popup.open({ anchor: marker, map }));
      active.push({ marker, popup, listener });
    }
    onMarkerChange?.({
      count: shown.length, total: mappable.length, zoom: map.getZoom(),
      minZoom: MIN_ATTRACTION_MARKER_ZOOM, grouped,
    });
  };

  let pendingFocus = null;
  const idleListener = map.addListener('idle', () => {
    if (pendingFocus) {
      const place = pendingFocus;
      pendingFocus = null;
      map.setCenter({lat: place.latitude, lng: place.longitude});
      map.setZoom(14);
    }
    refreshPins();
  });
  if (mappable.length > 1) map.fitBounds(bounds, 28);
  else map.setCenter({ lat: mappable[0].latitude, lng: mappable[0].longitude });

  return {
    ok: true,
    showLocation(point, center = true) {
      if (locationMarker) locationMarker.map = null;
      accuracyCircle?.setMap(null);
      const position = { lat: point.latitude, lng: point.longitude };
      const dot = document.createElement('div');
      dot.className = 'tm-location-pin';
      locationMarker = new AdvancedMarkerElement({ map, position, content: dot, title: 'Your location' });
      accuracyCircle = new maps.Circle({ map, center: position, radius: point.accuracy, strokeColor: '#2563eb', strokeWeight: 1, fillColor: '#2563eb', fillOpacity: 0.1, clickable: false });
      if (center) { pendingFocus = point; map.setCenter(position); map.setZoom(14); }
    },
    focusPlace(place) { pendingFocus = place; map.setCenter({lat: place.latitude, lng: place.longitude}); map.setZoom(14); },
    fitResults() { pendingFocus = null; map.fitBounds(bounds, 40); if (mappable.length === 1) map.setZoom(14); },
    markerCount: 0,
    totalCount: mappable.length,
    cleanup() {
      destroyed = true;
      if (locationMarker) locationMarker.map = null;
      accuracyCircle?.setMap(null);
      idleListener.remove();
      clearPins();
      maps.event.clearInstanceListeners(map);
    },
  };
}
