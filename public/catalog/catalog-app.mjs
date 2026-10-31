import { observePhotos } from './catalog-photos.mjs';
import {
  validateCatalog, searchCatalog, toggleSave, isSaved,
  currentUser, ownedTrips, addToItinerary, mergeKnownPlace
} from './catalog-core.mjs';

const $ = id => document.getElementById(id);
const state = { places: [], query: '', province: 'All', category: 'All',
  visible: 24, selectedId: null, view: 'list', map: null, markers: [], mapReady: false, mapKey: '' };
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, x =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x])
);
const byId = id => state.places.find(p => p.id === id) || null;
const osmUrl = p => {
  const m = p.id.match(/^osm-([nwr])(\d+)$/);
  const kind = ({ n: 'node', w: 'way', r: 'relation' })[m?.[1]];
  return kind ? `https://www.openstreetmap.org/${kind}/${m[2]}` : 'https://www.openstreetmap.org';
};
const googleMapsUrl = p => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.latitude + ',' + p.longitude)}`;
function toast(message) {
  $('notice').textContent = message;
  $('notice').hidden = false;
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => { $('notice').hidden = true; }, 4000);
}
function matches() {
  return searchCatalog(state.places, state);
}
function renderResults() {
  const filtered = matches();
  $('clear-filters').hidden = !state.query && state.province === 'All' && state.category === 'All';
  $('status').textContent = `Showing ${Math.min(state.visible, filtered.length)} of ${filtered.length} places`;
  if (state.selectedId && !filtered.some(p => p.id === state.selectedId)) closeDetails();
  $('result-count').textContent = `${filtered.length} matching attractions`;
  $('category-hint').textContent = state.province === 'All' ? 'Chiang Mai & Chiang Rai' : state.province.replace(' Province', '');
  const visible = filtered.slice(0, state.visible);
  $('items').innerHTML = visible.map(p => {
    const icon = p.category === 'Nature' ? '♧' : p.category === 'Food' ? '♨' : '⌂';
    const ptag = p.category === 'Nature' ? 'nature' : p.category === 'Food' ? 'food' : '';
    return `<article class="place-row ${p.id === state.selectedId ? 'selected' : ''}" data-id="${p.id}">
      <div class="place-symbol place-photo ${ptag}" data-photo="${p.id}"><span class="photo-placeholder"><span aria-hidden="true">${icon}</span><small>Photo unavailable</small></span></div>
      <div class="place-body">
        <button class="place-title" type="button" data-select="${p.id}" aria-pressed="${p.id === state.selectedId}">${escapeHTML(p.name)}</button>
        <div class="place-meta">${escapeHTML(p.administrativeArea.replace(' Province', ''))} · ${escapeHTML(p.category)}</div>
        <div class="place-subtitle">Explore this place <span aria-hidden="true">↗</span></div>
      </div>
      <button class="save-mini ${isSaved(localStorage, p.id) ? 'saved' : ''}"
        type="button" data-save="${p.id}" aria-label="${isSaved(localStorage, p.id) ? 'Remove' : 'Save'} ${escapeHTML(p.name)}"
        aria-pressed="${isSaved(localStorage, p.id)}" title="${isSaved(localStorage, p.id) ? 'Remove from saved places' : 'Save place'}">☆</button>
    </article>`;
  }).join('');
  observePhotos(document, state.places);
  $('empty').hidden = filtered.length !== 0;
  $('show-more').hidden = state.visible >= filtered.length;
  if (!$('show-more').hidden) $('show-more').textContent = `Show ${Math.min(24, filtered.length - state.visible)} more places`;
  if (state.view === 'map' && state.mapReady) renderMapMarkers(filtered);
}
function syncLayout() {
  const open = Boolean(state.selectedId) || state.view === 'map';
  document.querySelector('.detail-column').hidden = !open;
  document.querySelector('.content-layout').classList.toggle('has-detail', open);
  document.querySelector('.content-layout').classList.toggle('mobile-detail', open);
  const panel = open && matchMedia('(max-width:720px)').matches;
  document.documentElement.classList.toggle('panel-open', panel);
  if (window.parent !== window) parent.postMessage({ type: 'travelm:catalog-panel', open: panel }, location.origin);
}
function closeDetails() {
  const previous = state.selectedId;
  state.selectedId = null;
  setView('list');
  const url = new URL(location.href);
  url.searchParams.delete('place');
  history.replaceState(null, '', url);
  $('details').innerHTML = '';
  syncLayout();
  document.querySelectorAll('.place-row.selected').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('[data-select]').forEach(el => el.setAttribute('aria-pressed', 'false'));
  if (previous) document.querySelector(`[data-select="${previous}"]`)?.focus({ preventScroll: true });
}
function selectPlace(id) {
  const p = byId(id);
  if (!p) return;
  state.selectedId = id;
  syncLayout();
  const q = new URL(window.location.href);
  q.searchParams.set('place', id);
  history.replaceState(null, '', q);
  const trips = ownedTrips(localStorage);
  $('details').innerHTML = `
    <p class="detail-category">${escapeHTML(p.category)} · ${escapeHTML(p.administrativeArea.replace(' Province', ''))}</p>
    <h2 class="detail-title" tabindex="-1">${escapeHTML(p.name)}</h2>
    <p class="detail-province">${escapeHTML(p.locality || p.administrativeArea)} · Thailand</p>
    <div class="place-photo photo-hero" data-photo="${p.id}"><span>Photo unavailable — no matched licensed image yet.</span></div>
    <div class="coordinates"><strong>Location</strong><br>${p.latitude.toFixed(6)}° N, ${p.longitude.toFixed(6)}° E
    <br><a target="_blank" rel="noopener noreferrer" href="${googleMapsUrl(p)}">View exact pin in Google Maps ↗</a></div>
    <p class="detail-heading">About this place</p>
    <p class="detail-copy">${escapeHTML(p.description)}</p>
    <div class="fact-grid">
      <div class="fact"><span>Opening hours</span><b>Not verified</b></div>
      <div class="fact"><span>Entrance fee</span><b>Unknown</b></div>
      <div class="fact"><span>Information status</span><b>Imported / unverified</b></div>
      <div class="fact"><span>OSM extract date</span><b>${escapeHTML(p.lastCheckedAt)}</b></div>
    </div>
    <div class="detail-actions">
      <button class="btn primary" type="button" id="save-detail">${isSaved(localStorage, p.id) ? '★ Saved — remove' : '☆ Save place'}</button>
      <a class="btn" id="full-details" href="/discover/${encodeURIComponent(p.id)}">TravelM place details</a>
      <button class="btn" type="button" id="add-trip">Add to trip</button>
    </div>
    <div id="trip-form" hidden></div>
    <p class="source"><strong>Source:</strong> <a href="${osmUrl(p)}" target="_blank" rel="noopener noreferrer">${escapeHTML(p.sourceReference)} ↗</a><br>
    <strong>Last source extract:</strong> ${escapeHTML(p.lastCheckedAt)}. This is not a site visit or a live verification.<br>
    <strong>Note:</strong> Check official operators for current hours, fees and accessibility before travelling.</p>`;
  $('save-detail').addEventListener('click', () => {
    try {
      const result = toggleSave(localStorage, p);
      toast(result.ok ? (result.saved ? 'Saved to your TravelM account.' : 'Removed from saved places.') : result.message);
      renderResults(); selectPlace(p.id);
    } catch { toast('Could not save. Check browser storage settings.'); }
  });
  $('full-details').addEventListener('click', () => {
    try { mergeKnownPlace(localStorage, p); }
    catch { toast('Browser storage is unavailable. The destination may not load in legacy TravelM.'); }
  });
  $('add-trip').addEventListener('click', () => {
    const form = $('trip-form');
    if (!form.hidden) { form.hidden = true; return; }
    form.hidden = false;
    if (!currentUser(localStorage)) {
      form.innerHTML = '<div class="itinerary-form"><p>Sign in to your TravelM account first, then return to add this place to a trip.</p><a class="btn" href="/signin">Sign in</a></div>';
      return;
    }
    if (!trips.length) {
      form.innerHTML = '<div class="itinerary-form"><p>Create a trip in TravelM, then add this place to a travel day.</p><a class="btn" href="/trips">Create trip</a></div>';
      return;
    }
    form.innerHTML = `<form class="itinerary-form" id="itinerary-form">
      <label for="trip-choice">Choose trip</label>
      <select id="trip-choice" required>${trips.map(t => `<option value="${escapeHTML(t.id)}">${escapeHTML(t.name)} · ${escapeHTML(t.startDate)} to ${escapeHTML(t.endDate)}</option>`).join('')}</select>
      <label for="trip-date">Day in itinerary</label>
      <input id="trip-date" type="date" required>
      <button type="submit" class="btn primary">Add to itinerary</button>
    </form>`;
    const choice = $('trip-choice'), dateInput = $('trip-date');
    const updateRange = () => {
      const trip = trips.find(t => t.id === choice.value);
      if (trip) { dateInput.min = trip.startDate; dateInput.max = trip.endDate; dateInput.value = trip.startDate; }
    };
    choice.addEventListener('change', updateRange);
    updateRange();
    $('itinerary-form').addEventListener('submit', event => {
      event.preventDefault();
      try {
        const result = addToItinerary(localStorage, { place: p, tripId: choice.value, date: dateInput.value });
        toast(result.ok ? 'Added to your trip itinerary.' : result.message);
        if (result.ok) form.hidden = true;
      } catch { toast('Could not save itinerary. Check browser storage settings.'); }
    });
  });
  renderResults();
  $('map-wrapper').hidden = false;
  showGoogleMap(p);
  $('details').querySelector('h2')?.focus({ preventScroll: true });
  if (matchMedia('(max-width:720px)').matches) window.scrollTo(0, 0);
}
let mapsPromise;
function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!state.mapKey) return Promise.reject(Error('Google Maps is not configured.'));
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => reject(Error('Google Maps timed out.')), 12000);
    window.__catalogMapsReady = () => { clearTimeout(timer); resolve(window.google.maps); };
    window.gm_authFailure = () => {
      $('map-caption').textContent = 'Google Maps rejected this key or website. Open the place in Google Maps instead.';
    };
    script.onerror = () => { clearTimeout(timer); reject(Error('Google Maps could not load.')); };
    const url = new URL('https://maps.googleapis.com/maps/api/js');
    url.searchParams.set('key', state.mapKey);
    url.searchParams.set('loading', 'async');
    url.searchParams.set('callback', '__catalogMapsReady');
    script.src = url.toString(); script.async = true; document.head.append(script);
  }).catch(error => { mapsPromise = null; throw error; });
  return mapsPromise;
}
function renderMapMarkers(places, fit = true) {
  if (!state.mapReady || !state.map) return;
  state.markers.forEach(marker => marker.setMap(null));
  state.markers = [];
  const bounds = new google.maps.LatLngBounds();
  for (const p of places) {
    const position = { lat: p.latitude, lng: p.longitude };
    const marker = new google.maps.Marker({ map: state.map, position, title: p.name });
    marker.addListener('click', () => selectPlace(p.id));
    state.markers.push(marker); bounds.extend(position);
  }
  if (fit && places.length) state.map.fitBounds(bounds, 30);
}
async function showGoogleMap(place = null) {
  $('map-wrapper').hidden = false;
  $('map-caption').textContent = 'Loading Google Maps…';
  try {
    const maps = await loadGoogleMaps();
    if ($('map-wrapper').hidden) return;
    if (!state.map) state.map = new maps.Map($('map'), {
      center: { lat: 19.4, lng: 99.4 }, zoom: 8,
      mapTypeControl: false,
      streetViewControl: false, fullscreenControl: false, gestureHandling: 'cooperative',
    });
    state.mapReady = true;
    renderMapMarkers(matches(), !place);
    if (place) { state.map.setCenter({ lat: place.latitude, lng: place.longitude }); state.map.setZoom(14); }
    $('map-caption').textContent = 'Switch to Satellite for aerial imagery. Select a marker to explore a place.';
  } catch {
    $('map-caption').textContent = 'Google Maps is unavailable. Use the Google Maps link in place details.';
  }
}
function showMap() {
  $('map-mode').classList.add('active'); $('map-mode').setAttribute('aria-pressed', 'true');
  $('list-mode').classList.remove('active'); $('list-mode').setAttribute('aria-pressed', 'false');
  state.view = 'map';
  syncLayout();
  showGoogleMap();
}
function setView(view) {
  if (view === 'map') { showMap(); return; }
  state.view = 'list';
  syncLayout();
  $('map-wrapper').hidden = !state.selectedId;
  $('list-mode').classList.add('active'); $('list-mode').setAttribute('aria-pressed', 'true');
  $('map-mode').classList.remove('active'); $('map-mode').setAttribute('aria-pressed', 'false');
}
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'travelm:map-config') return;
  state.mapKey = typeof event.data.key === 'string' ? event.data.key : '';
  if (state.selectedId || state.view === 'map') showGoogleMap(byId(state.selectedId));
});
matchMedia('(max-width:720px)').addEventListener('change', syncLayout);
function bindEvents() {
  for (const [id, type] of [['roadmap-type', 'roadmap'], ['satellite-type', 'hybrid']]) {
    $(id).addEventListener('click', () => {
      if (!state.mapReady) return;
      state.map.setMapTypeId(type);
      $('roadmap-type').setAttribute('aria-pressed', String(type === 'roadmap'));
      $('satellite-type').setAttribute('aria-pressed', String(type === 'hybrid'));
    });
  }
  $('back-results').addEventListener('click', closeDetails);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDetails(); });
  $('clear-filters').addEventListener('click', () => {
    state.query = ''; state.province = 'All'; state.category = 'All'; state.visible = 24;
    $('query').value = ''; $('province').value = 'All'; $('category').value = 'All';
    renderResults(); $('query').focus();
  });
  $('query').addEventListener('input', event => { state.query = event.target.value; state.visible = 24; renderResults(); });
  for (const id of ['province', 'category']) {
    $(id).addEventListener('change', event => {
      state[id] = event.target.value; state.visible = 24; renderResults();
    });
  }
  $('show-more').addEventListener('click', () => { state.visible += 24; renderResults(); });
  $('list-mode').addEventListener('click', () => setView('list'));
  $('map-mode').addEventListener('click', () => setView('map'));
  $('items').addEventListener('click', event => {
    const savedButton = event.target.closest('[data-save]');
    if (savedButton) {
      const place = byId(savedButton.dataset.save);
      if (!place) return;
      try {
        const result = toggleSave(localStorage, place);
        toast(result.ok ? (result.saved ? 'Place saved.' : 'Place removed.') : result.message);
        renderResults();
        if (state.selectedId === place.id) selectPlace(place.id);
      } catch { toast('Browser storage unavailable.'); }
      return;
    }
    const choice = event.target.closest('[data-select]');
    if (choice) selectPlace(choice.dataset.select);
  });
  window.addEventListener('storage', () => { if (state.places.length) { renderResults(); if (state.selectedId) selectPlace(state.selectedId); } });
}
async function start() {
  bindEvents();
  try {
    const files = await Promise.all(['/data/chiang-mai-curated.json', '/data/chiang-rai-curated.json'].map(async url => {
      const resp = await fetch(url, { cache: 'no-cache' });
      if (!resp.ok) throw Error(`Catalog HTTP ${resp.status}`);
      return resp.json();
    }));
    state.places = validateCatalog(files);
    $('status').textContent = '200 sourced attractions · 100 Chiang Mai · 100 Chiang Rai · source extract 16 Oct 2026';
    renderResults();
    const direct = new URLSearchParams(location.search).get('place');
    if (byId(direct)) selectPlace(direct);
  } catch (e) {
    $('status').textContent = 'Catalog unavailable: ' + e.message + '. Your existing TravelM data was not changed.';
    $('items').textContent = '';
  }
}
start();

// Fit the catalog to the app's scrolling surface; never create a second page scroll.
if (window.parent !== window) {
  let resizeTimer;
  const reportSize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!document.documentElement.classList.contains('panel-open')) parent.postMessage({ type: 'travelm:catalog-height', height: Math.ceil(document.body.getBoundingClientRect().height) }, location.origin);
    }, 100);
  };
  new ResizeObserver(reportSize).observe(document.body);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (link && !link.target && new URL(link.href).origin === location.origin) link.target = '_top';
  });
  reportSize();
}
