/**
 * Application entry point: session handling, navigation, and rendering.
 *
 * Rendering builds DOM nodes and sets text with textContent, so user-entered
 * values are never interpreted as markup. Business rules live in the other
 * modules; this file only wires them to the interface.
 */

import * as storageApi from './storage.js';
import * as authApi from './auth.js';
import { EXPENSE_CATEGORIES, PLACE_CATEGORIES } from './data.js';
import { el, formatDate, formatMoney, todayIsoDate } from './utils.js';
import {
  describeProvenance,
  findPlaces,
  getPlaceById,
  getSavedPlaces,
  isPlaceSaved,
  removeSavedPlace,
  savePlace,
} from './places.js';
import * as tripsApi from './trips.js';
import * as itineraryApi from './itinerary.js';
import * as packingApi from './packing.js';
import * as expensesApi from './expenses.js';
import { getWeatherForPlace, hasTemperature } from './weather.js';

const state = {
  places: [],
  trips: [],
  itinerary: [],
  packing: [],
  expenses: [],
  savedPlaces: [],
  users: [],
  session: null,
  authTab: 'signin',
  section: 'home',
  activePlaceId: null,
  activeTripId: null,
  tripTab: 'overview',
  filters: { query: '', category: 'All' },
  loginOpen: false,
  formErrors: {},
  weather: { tripId: null, loading: false, result: null },
  status: '',
};

const view = document.getElementById('view');
const navHost = document.getElementById('nav');
const sessionHost = document.getElementById('session-bar');
const statusLine = document.getElementById('status-line');

/* ---------------------------------------------------------------- data ---- */

function loadData() {
  state.places = storageApi.readList(storageApi.STORAGE_KEYS.places);
  state.trips = storageApi.readList(storageApi.STORAGE_KEYS.trips);
  state.itinerary = storageApi.readList(storageApi.STORAGE_KEYS.itinerary);
  state.packing = storageApi.readList(storageApi.STORAGE_KEYS.packing);
  state.expenses = storageApi.readList(storageApi.STORAGE_KEYS.expenses);
  state.savedPlaces = storageApi.readList(storageApi.STORAGE_KEYS.savedPlaces);
  state.users = storageApi.readList(storageApi.STORAGE_KEYS.users);
  state.session = authApi.resolveSession(storageApi.readSession(), state.users);
}

function save(keys) {
  for (const key of keys) {
    storageApi.writeList(storageApi.STORAGE_KEYS[key], state[key]);
  }
}

function isMember() {
  return state.session !== null;
}

function currentUserId() {
  return state.session ? state.session.id : null;
}

/** A trip is only reachable by the traveller who owns it. */
function activeTrip() {
  const trip = tripsApi.getTripById(state.trips, state.activeTripId);
  if (!trip || !state.session || trip.userId !== state.session.id) return null;
  return trip;
}

function setStatus(message) {
  state.status = message;
  statusLine.textContent = message;
}

/* ----------------------------------------------------------- primitives --- */

function panel(title, children, className = '') {
  return el('section', { className: `panel ${className}`.trim() }, [
    title ? el('h2', { text: title }) : null,
    ...children,
  ]);
}

function labelledField(labelText, control, hint) {
  const id = control.id;
  return el('p', { className: 'field' }, [
    el('label', { text: labelText, attrs: { for: id } }),
    control,
    hint ? el('span', { className: 'hint', text: hint }) : null,
  ]);
}

function errorFor(field) {
  const message = state.formErrors[field];
  return message ? el('span', { className: 'error', text: message, attrs: { role: 'alert' } }) : null;
}

function input(name, options = {}) {
  return el('input', {
    attrs: {
      id: `field-${name}`,
      name,
      type: options.type || 'text',
      value: options.value === undefined ? '' : options.value,
      placeholder: options.placeholder,
      min: options.min,
      max: options.max,
      step: options.step,
      required: options.required ? 'required' : undefined,
      'aria-describedby': options.describedBy,
    },
  });
}

function select(name, options, selected) {
  const node = el('select', { attrs: { id: `field-${name}`, name } });
  for (const option of options) {
    node.append(
      el('option', {
        text: typeof option === 'string' ? option : option.label,
        attrs: {
          value: typeof option === 'string' ? option : option.value,
          selected: (typeof option === 'string' ? option : option.value) === selected ? 'selected' : undefined,
        },
      }),
    );
  }
  return node;
}

function button(label, action, className = '', extraAttrs = {}) {
  return el('button', {
    text: label,
    className,
    attrs: { type: 'button', 'data-action': action, ...extraAttrs },
  });
}

function provenanceBlock(place) {
  const { source, checked, status } = describeProvenance(place);
  return el('div', { className: 'provenance' }, [
    el('p', { className: 'label', text: 'SOURCE & FRESHNESS' }),
    el('p', { text: `${source} · ${checked} · content status: ${status}` }),
    ['draft', 'needs_update'].includes(place.contentStatus)
      ? el('p', { className: 'notice', text: 'Not verified — this record still needs a source and review.' })
      : null,
  ]);
}

function mapPlaceholder(context) {
  return el('div', { className: 'map-placeholder' }, [
    el('p', { className: 'label', text: 'MAP PLACEHOLDER' }),
    el('p', { text: `Map provider is not connected, so ${context} cannot be shown on a map.` }),
  ]);
}

function budgetLine(trip) {
  const status = expensesApi.budgetStatus(state.expenses, trip);
  return el('div', { className: 'budget' }, [
    el('p', { text: `Budget ${formatMoney(trip.expectedBudget, trip.currencyCode)}` }),
    el('p', { text: `Spent ${formatMoney(status.spent, trip.currencyCode)} · ${status.percentSpent}% spent` }),
    el('p', { text: `Remaining ${formatMoney(status.remaining, trip.currencyCode)}` }),
    el('p', {
      className: `status status-${status.level}`,
      text: status.message ? `${status.label} — ${status.message}` : status.label,
    }),
  ]);
}

/* -------------------------------------------------------------- session --- */

function renderNav() {
  navHost.textContent = '';
  const items = [
    ['home', 'Home'],
    ['discover', 'Discover'],
  ];
  if (isMember()) {
    items.push(['trips', 'My Trips'], ['saved', 'Saved Places']);
  }
  for (const [section, label] of items) {
    navHost.append(
      el('button', {
        text: label,
        className: state.section === section ? 'nav-link nav-link-active' : 'nav-link',
        attrs: { type: 'button', 'data-action': `nav:${section}`, 'aria-current': state.section === section ? 'page' : undefined },
      }),
    );
  }
}

function renderSessionBar() {
  sessionHost.textContent = '';
  if (isMember()) {
    sessionHost.append(
      el('span', { className: 'session-name', text: `Signed in as ${state.session.name} <${state.session.email}>` }),
      button('Log out', 'logout'),
    );
    return;
  }
  sessionHost.append(el('span', { className: 'session-name', text: 'Guest view' }), button('Log in', 'login:open'));
}

function renderLoginPanel() {
  const showRegister = state.authTab === 'register';

  const signInForm = el('form', { attrs: { id: 'signin-form', novalidate: 'novalidate' } }, [
    labelledField('Email', input('signinEmail', { type: 'email', required: true, placeholder: 'you@example.com' })),
    errorFor('email'),
    labelledField('Password', input('signinPassword', { type: 'password', required: true })),
    errorFor('password'),
    errorFor('form'),
    el('div', { className: 'actions' }, [el('button', { text: 'Sign in', attrs: { type: 'submit' } })]),
  ]);

  const registerForm = el('form', { attrs: { id: 'register-form', novalidate: 'novalidate' } }, [
    labelledField('Name', input('registerName', { required: true })),
    errorFor('name'),
    labelledField('Email', input('registerEmail', { type: 'email', required: true })),
    errorFor('email'),
    labelledField('Password', input('registerPassword', { type: 'password', required: true }), `At least ${authApi.PASSWORD_MIN_LENGTH} characters.`),
    errorFor('password'),
    labelledField('Confirm password', input('registerConfirmPassword', { type: 'password', required: true })),
    errorFor('confirmPassword'),
    errorFor('form'),
    el('div', { className: 'actions' }, [el('button', { text: 'Create account and sign in', attrs: { type: 'submit' } })]),
  ]);

  return el('section', { className: 'panel' }, [
    el('h2', { text: 'Log in' }),
    el('p', {
      text: 'Accounts are stored only in this browser. Passwords are salted and hashed, never stored as text — but this is still a prototype, not real security.',
    }),
    el('div', { className: 'tabs' }, [
      el('button', {
        text: 'Sign in',
        className: showRegister ? 'tab' : 'tab tab-active',
        attrs: { type: 'button', 'data-action': 'auth:tab', 'data-tab': 'signin', 'aria-pressed': String(!showRegister) },
      }),
      el('button', {
        text: 'Create account',
        className: showRegister ? 'tab tab-active' : 'tab',
        attrs: { type: 'button', 'data-action': 'auth:tab', 'data-tab': 'register', 'aria-pressed': String(showRegister) },
      }),
    ]),
    showRegister ? registerForm : signInForm,
    el('p', { className: 'label', text: 'DEMO ACCOUNT' }),
    el('p', { text: `${authApi.DEMO_CREDENTIALS.email} · password ${authApi.DEMO_CREDENTIALS.password}` }),
    el('div', { className: 'actions' }, [
      button('Log in with demo account', 'auth:demologin', 'primary'),
      button('Cancel', 'login:cancel'),
    ]),
    el('p', { className: 'hint', text: 'Guest view: browse places and weather only.' }),
  ]);
}

/* ---------------------------------------------------------------- views --- */

function renderHome() {
  const nodes = [
    el('section', { className: 'panel hero' }, [
      el('h2', { text: isMember() ? `Welcome back, ${state.session.name}` : 'A calmer way to plan a trip' }),
      el('p', {
        text: isMember()
          ? 'Pick up your trip, check the budget, and keep planning.'
          : 'Browse sample places first. Log in with the demo account to plan a trip, track a budget, and keep a packing list.',
      }),
    ]),
  ];

  const searchForm = el('form', { attrs: { id: 'home-search', novalidate: 'novalidate' } }, [
    el('h2', { text: 'DESTINATION' }),
    labelledField('Search a place or attraction', input('homeQuery', { placeholder: 'Try “temple”, “museum”, or a city' })),
    el('div', { className: 'actions' }, [el('button', { text: 'Discover places', attrs: { type: 'submit' } })]),
  ]);
  nodes.push(panel('', [searchForm], 'search-panel'));

  if (isMember()) {
    const memberTrips = tripsApi.getTripsForUser(state.trips, currentUserId());
    const trip = memberTrips[0] || null;

    if (trip) {
      nodes.push(
        panel('Upcoming trip', [
          el('p', { className: 'metric', text: trip.name }),
          el('p', { text: `${trip.destinationLabel} · ${formatDate(trip.startDate)} – ${formatDate(trip.endDate)} (sample dates)` }),
          button('Open trip', 'trip:view', 'primary', { 'data-trip-id': trip.id }),
        ]),
      );
      nodes.push(panel('Budget overview', [budgetLine(trip)]));
      nodes.push(panel('Weather status', [weatherSummary(trip)]));
    } else {
      nodes.push(panel('Upcoming trip', [el('p', { text: 'No trips yet.' }), button('Create a trip', 'trips:new', 'primary')]));
    }

    nodes.push(
      panel('Continue planning', [
        el('p', { text: 'Discover a place, then add it to your trip.' }),
        button('Discover places', 'nav:discover', 'primary'),
      ]),
    );
  } else {
    nodes.push(
      panel('Weather status', [
        el('p', { text: 'Weather provider is not connected. No conditions or temperature are shown.' }),
      ]),
      panel('Continue planning', [
        el('p', { text: 'Sign in with the demo account to create trips, budgets, and packing lists.' }),
        button('Log in with demo account', 'auth:demologin', 'primary'),
      ]),
    );
  }

  return nodes;
}

function renderDiscover() {
  const results = findPlaces(state.places, state.filters);

  const searchForm = el('form', { attrs: { id: 'discover-search', novalidate: 'novalidate' } }, [
    el('h2', { text: 'SEARCH PLACES' }),
    labelledField('Keyword', input('query', { value: state.filters.query, placeholder: 'Try “temple”, “museum”, or a destination' })),
    el('div', { className: 'actions' }, [
      el('button', { text: 'Search', attrs: { type: 'submit' } }),
      button('Clear', 'filter:clear'),
    ]),
  ]);

  const chips = el('div', { className: 'chips', attrs: { role: 'group', 'aria-label': 'Filter by category' } }, [
    el('p', { className: 'label', text: 'FILTER BY CATEGORY' }),
    ...PLACE_CATEGORIES.map((category) =>
      el('button', {
        text: category,
        className: category === state.filters.category ? 'chip chip-active' : 'chip',
        attrs: {
          type: 'button',
          'data-action': 'filter:category',
          'data-category': category,
          'aria-pressed': category === state.filters.category ? 'true' : 'false',
        },
      }),
    ),
  ]);

  const list = el('ul', { className: 'result-list' });
  if (results.length === 0) {
    list.append(el('li', { className: 'notice', text: 'No places match these filters. Try a different keyword or category.' }));
  }
  for (const place of results) {
    const saved = isMember() && isPlaceSaved(state.savedPlaces, currentUserId(), place.id);
    list.append(
      el('li', { className: 'result' }, [
        el('div', { className: 'result-image', text: 'IMAGE PLACEHOLDER' }),
        el('div', { className: 'result-body' }, [
          el('h3', { text: place.name }),
          el('p', { text: `${place.category} · ${place.locality}` }),
          el('p', { text: place.estimatedCostNote || 'Fee not stated' }),
          el('p', { className: 'hint', text: place.estimatedCost > 0 ? `${formatMoney(place.estimatedCost)} estimated fee` : 'No fee recorded' }),
          el('div', { className: 'actions' }, [
            button('View details', 'place:view', '', { 'data-place-id': place.id }),
            isMember()
              ? button(saved ? 'Saved' : 'Save place', saved ? 'place:unsave' : 'place:save', '', { 'data-place-id': place.id })
              : el('span', { className: 'hint', text: 'Log in to save places' }),
          ]),
        ]),
      ]),
    );
  }

  return [
    el('section', { className: 'panel hero' }, [
      el('h2', { text: 'Find places worth your time' }),
      el('p', { text: 'Browse sample records. Fees and details are estimates until verified.' }),
    ]),
    mapPlaceholder('search results'),
    searchForm,
    chips,
    panel(`${results.length} place(s)`, [list]),
  ];
}

function renderPlaceDetails() {
  const place = getPlaceById(state.places, state.activePlaceId);
  if (!place) {
    return [panel('Place not found', [el('p', { text: 'That place is no longer in the dataset.' }), button('Back to Discover', 'nav:discover')])];
  }
  const saved = isMember() && isPlaceSaved(state.savedPlaces, currentUserId(), place.id);
  const memberTrips = isMember() ? tripsApi.getTripsForUser(state.trips, currentUserId()) : [];

  const addToTrip = isMember()
    ? el('form', { attrs: { id: 'add-to-trip', novalidate: 'novalidate' } }, [
        el('h2', { text: 'Add to a trip' }),
        memberTrips.length === 0
          ? el('p', { text: 'Create a trip first, then come back to add this place.' })
          : labelledField('Trip', select('tripId', memberTrips.map((trip) => ({ value: trip.id, label: trip.name })), memberTrips[0].id)),
        memberTrips.length === 0 ? null : el('div', { className: 'actions' }, [el('button', { text: 'Add to itinerary', attrs: { type: 'submit' } })]),
        errorFor('form'),
      ])
    : el('p', { className: 'hint', text: 'Log in with the demo account to add this place to a trip.' });

  return [
    el('section', { className: 'panel hero' }, [
      el('h2', { text: place.name }),
      el('p', { text: `${place.locality}, ${place.administrativeArea} · ${place.category}` }),
    ]),
    mapPlaceholder('the location'),
    panel('About', [el('p', { text: place.description })]),
    panel('Information status', [
      el('ul', { className: 'info-list' }, [
        el('li', {}, [el('strong', { text: 'Entrance fee' }), el('span', { text: place.estimatedCostNote || 'Not recorded' })]),
        el('li', {}, [el('strong', { text: 'Location' }), el('span', { text: `Sample coordinates ${place.latitude}, ${place.longitude}; verify map pin` })]),
        el('li', {}, [el('strong', { text: 'Opening hours' }), el('span', { text: 'Not verified' })]),
      ]),
      provenanceBlock(place),
    ]),
    panel('Save and plan', [
      el('div', { className: 'actions' }, [
        isMember()
          ? button(saved ? 'Remove from saved places' : 'Save this place', saved ? 'place:unsave' : 'place:save', '', { 'data-place-id': place.id })
          : button('Log in to save', 'login:open'),
        button('Back to Discover', 'nav:discover'),
      ]),
      addToTrip,
    ]),
  ];
}

function renderSaved() {
  if (!isMember()) {
    return [panel('Saved Places', [el('p', { text: 'Saved places belong to a signed-in traveller.' }), button('Log in with demo account', 'auth:demologin', 'primary')])];
  }
  const places = getSavedPlaces(state.savedPlaces, state.places, currentUserId());
  const list = el('ul', { className: 'result-list' });
  if (places.length === 0) {
    list.append(el('li', { className: 'notice', text: 'Nothing saved yet.' }));
  }
  for (const place of places) {
    list.append(
      el('li', { className: 'result' }, [
        el('div', { className: 'result-body' }, [
          el('h3', { text: place.name }),
          el('p', { text: `${place.category} · ${place.locality}` }),
          el('div', { className: 'actions' }, [
            button('View details', 'place:view', '', { 'data-place-id': place.id }),
            button('Remove', 'place:unsave', '', { 'data-place-id': place.id }),
          ]),
        ]),
      ]),
    );
  }
  return [el('section', { className: 'panel hero' }, [el('h2', { text: 'Saved Places' }), el('p', { text: 'One entry per place, per traveller.' })]), panel(`${places.length} saved`, [list])];
}

function tripForm(trip) {
  const editing = Boolean(trip);
  return el('form', { attrs: { id: 'trip-form', novalidate: 'novalidate' } }, [
    labelledField('Trip name', input('name', { value: trip ? trip.name : '', required: true }), null),
    errorFor('name'),
    labelledField('Destination', input('destination', { value: trip ? trip.destinationLabel : '', required: true })),
    errorFor('destination'),
    labelledField('Start date', input('startDate', { type: 'date', value: trip ? trip.startDate : todayIsoDate(), required: true })),
    errorFor('startDate'),
    labelledField('End date', input('endDate', { type: 'date', value: trip ? trip.endDate : todayIsoDate(), required: true })),
    errorFor('endDate'),
    labelledField('Budget (THB)', input('budget', { type: 'number', min: '0', step: '0.01', value: trip ? trip.expectedBudget : '', required: true })),
    errorFor('budget'),
    errorFor('form'),
    el('div', { className: 'actions' }, [
      el('button', { text: editing ? 'Save changes' : 'Create trip', attrs: { type: 'submit' } }),
      button('Cancel', 'trips:cancel'),
    ]),
  ]);
}

function renderTrips() {
  if (!isMember()) {
    return [panel('My Trips', [el('p', { text: 'Trips belong to a signed-in traveller.' }), button('Log in with demo account', 'auth:demologin', 'primary')])];
  }
  const memberTrips = tripsApi.getTripsForUser(state.trips, currentUserId());

  if (state.editingTripId === 'new' || state.editingTripId) {
    const editing = state.editingTripId !== 'new' ? tripsApi.getTripById(state.trips, state.editingTripId) : null;
    return [panel(editing ? `Edit trip: ${editing.name}` : 'New trip', [tripForm(editing)])];
  }

  const list = el('ul', { className: 'trip-list' });
  if (memberTrips.length === 0) {
    list.append(el('li', { className: 'notice', text: 'No trips yet. Create one to get started.' }));
  }
  for (const trip of memberTrips) {
    const status = expensesApi.budgetStatus(state.expenses, trip);
    list.append(
      el('li', { className: 'trip-card' }, [
        el('h3', { text: trip.name }),
        el('p', { text: `${trip.destinationLabel} · ${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}` }),
        el('p', { text: `${tripsApi.tripDayCount(trip)} day(s) · Budget ${formatMoney(trip.expectedBudget, trip.currencyCode)}` }),
        el('p', { className: `status status-${status.level}`, text: `${status.label} · ${status.percentSpent}% spent` }),
        el('div', { className: 'actions' }, [
          button('Open', 'trip:view', 'primary', { 'data-trip-id': trip.id }),
          button('Edit', 'trip:edit', '', { 'data-trip-id': trip.id }),
          button('Delete', 'trip:delete', '', { 'data-trip-id': trip.id }),
        ]),
      ]),
    );
  }
  return [
    el('section', { className: 'panel hero' }, [el('h2', { text: 'My Trips' }), el('p', { text: 'Each trip keeps its own itinerary, packing list, and expenses.' })]),
    panel('Your trips', [list, el('div', { className: 'actions' }, [button('New trip', 'trips:new', 'primary')])]),
  ];
}

const TRIP_TABS = ['overview', 'itinerary', 'packing', 'expenses', 'weather'];

function tripTabs(trip) {
  return el('div', { className: 'tabs', attrs: { role: 'group', 'aria-label': 'Trip sections' } }, [
    ...TRIP_TABS.map((tab) =>
      el('button', {
        text: tab === 'packing' ? 'Packing List' : tab.charAt(0).toUpperCase() + tab.slice(1),
        className: state.tripTab === tab ? 'tab tab-active' : 'tab',
        attrs: {
          type: 'button',
          'data-action': 'tab:set',
          'data-tab': tab,
          'aria-pressed': state.tripTab === tab ? 'true' : 'false',
        },
      }),
    ),
  ]);
}

function renderOverviewTab(trip) {
  const status = expensesApi.budgetStatus(state.expenses, trip);
  return [
    panel('Trip details', [
      el('ul', { className: 'info-list' }, [
        el('li', {}, [el('strong', { text: 'Destination' }), el('span', { text: trip.destinationLabel })]),
        el('li', {}, [el('strong', { text: 'Dates' }), el('span', { text: `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)} (${tripsApi.tripDayCount(trip)} days)` })]),
        el('li', {}, [el('strong', { text: 'Budget' }), el('span', { text: formatMoney(trip.expectedBudget, trip.currencyCode) })]),
        el('li', {}, [el('strong', { text: 'Itinerary items' }), el('span', { text: String(itineraryApi.countByTrip(state.itinerary, trip.id)) })]),
      ]),
      el('div', { className: 'actions' }, [button('Edit trip', 'trip:edit', '', { 'data-trip-id': trip.id })]),
    ]),
    panel('Budget status', [budgetLine(trip), el('p', { className: 'hint', text: 'Nearing-budget warnings start at 80% of the planned budget.' })]),
    panel('Plan status', [el('p', { text: 'Draft itinerary · No bookings or transport optimization.' })]),
    el('p', { className: `status status-${status.level}`, text: status.label }),
  ];
}

function renderItineraryTab(trip) {
  const groups = itineraryApi.groupByDay(state.itinerary, trip.id);
  const nodes = [];

  const addForm = el('form', { attrs: { id: 'activity-form', novalidate: 'novalidate' } }, [
    el('h2', { text: 'Add an activity' }),
    labelledField('Activity', input('title', { required: true, placeholder: 'Old City Gate' })),
    errorFor('title'),
    labelledField('Date', input('date', { type: 'date', min: trip.startDate, max: trip.endDate, value: trip.startDate, required: true }), `Must fall between ${trip.startDate} and ${trip.endDate}.`),
    errorFor('date'),
    labelledField('Estimated cost (THB)', input('estimatedCost', { type: 'number', min: '0', step: '0.01', value: '0' })),
    errorFor('estimatedCost'),
    labelledField('Notes (optional)', input('notes', {})),
    el('div', { className: 'actions' }, [el('button', { text: 'Add activity', attrs: { type: 'submit' } })]),
  ]);
  nodes.push(panel('', [addForm]));

  if (groups.length === 0) {
    nodes.push(panel('Itinerary', [el('p', { className: 'notice', text: 'No activities yet.' })]));
    return nodes;
  }

  for (const group of groups) {
    const list = el('ul', { className: 'day-list' });
    for (const item of group.items) {
      const place = item.placeId ? getPlaceById(state.places, item.placeId) : null;
      list.append(
        el('li', { className: 'day-item' }, [
          el('h3', { text: item.title }),
          el('p', { text: [item.notes, place ? `Linked place: ${place.name}` : null].filter(Boolean).join(' · ') || 'No notes' }),
          el('p', { className: 'hint', text: item.estimatedCost > 0 ? `Estimated cost ${formatMoney(item.estimatedCost)}` : 'Estimated cost not recorded' }),
          place ? el('p', { className: 'hint', text: describeProvenance(place).source }) : null,
          el('div', { className: 'actions' }, [
            button('Move up', 'activity:move', '', { 'data-item-id': item.id, 'data-direction': 'up' }),
            button('Move down', 'activity:move', '', { 'data-item-id': item.id, 'data-direction': 'down' }),
            button('Delete', 'activity:delete', '', { 'data-item-id': item.id }),
          ]),
        ]),
      );
    }
    nodes.push(panel(formatDate(group.date), [list]));
  }
  return nodes;
}

function renderPackingTab(trip) {
  const counts = packingApi.packingCounts(state.packing, trip.id);
  const items = packingApi.listByTrip(state.packing, trip.id);
  const status = state.weather.result;

  const addForm = el('form', { attrs: { id: 'packing-form', novalidate: 'novalidate' } }, [
    el('h2', { text: 'Add an item' }),
    labelledField('Item', input('name', { required: true, placeholder: 'Passport' })),
    errorFor('name'),
    el('div', { className: 'actions' }, [el('button', { text: 'Add item', attrs: { type: 'submit' } }), button('Add suggestions', 'packing:suggest')]),
  ]);

  const list = el('ul', { className: 'packing-list' });
  if (items.length === 0) {
    list.append(el('li', { className: 'notice', text: 'The checklist is empty.' }));
  }
  for (const item of items) {
    const checkbox = el('input', {
      attrs: {
        id: `packed-${item.id}`,
        type: 'checkbox',
        'data-action': 'packing:toggle',
        'data-item-id': item.id,
        checked: item.isPacked ? 'checked' : undefined,
      },
    });
    list.append(
      el('li', { className: 'packing-item' }, [
        checkbox,
        el('label', { text: item.name, attrs: { for: `packed-${item.id}` } }),
        el('span', { className: 'hint', text: item.isPacked ? 'Packed' : 'Not packed' }),
        button('Remove', 'packing:delete', '', { 'data-item-id': item.id }),
      ]),
    );
  }

  return [
    panel('Packing checklist', [
      el('p', {
        className: 'metric',
        attrs: { 'data-packed-count': `${counts.packed}/${counts.total}` },
        text: `${counts.packed} of ${counts.total} packed (${counts.remaining} remaining)`,
      }),
      el('p', { className: 'hint', text: packingApi.describeSuggestionSource(Boolean(status && status.status === 'ok')) }),
      list,
      addForm,
    ]),
  ];
}

function renderExpensesTab(trip) {
  const list = expensesApi.listByTrip(state.expenses, trip.id);
  const status = expensesApi.budgetStatus(state.expenses, trip);
  const categories = expensesApi.totalsByCategory(state.expenses, trip.id);

  const addForm = el('form', { attrs: { id: 'expense-form', novalidate: 'novalidate' } }, [
    el('h2', { text: 'Add an expense' }),
    labelledField('Description', input('description', { required: true, placeholder: 'Local transport' })),
    errorFor('description'),
    labelledField('Amount (THB)', input('amount', { type: 'number', min: '0.01', step: '0.01', required: true })),
    errorFor('amount'),
    labelledField('Category', select('category', EXPENSE_CATEGORIES, 'Food')),
    errorFor('category'),
    labelledField('Date', input('expenseDate', { type: 'date', value: trip.startDate, required: true })),
    errorFor('date'),
    labelledField('Notes (optional)', input('expenseNotes', {})),
    el('div', { className: 'actions' }, [el('button', { text: 'Add expense', attrs: { type: 'submit' } })]),
  ]);

  const table = el('table', { className: 'table' }, [
    el('caption', { text: 'Expenses for this trip' }),
    el('thead', {}, [
      el('tr', {}, [
        el('th', { text: 'Date', attrs: { scope: 'col' } }),
        el('th', { text: 'Description', attrs: { scope: 'col' } }),
        el('th', { text: 'Category', attrs: { scope: 'col' } }),
        el('th', { text: 'Amount', attrs: { scope: 'col' } }),
        el('th', { text: 'Actions', attrs: { scope: 'col' } }),
      ]),
    ]),
    el('tbody', {}, list.map((expense) =>
      el('tr', {}, [
        el('td', { text: formatDate(expense.date) }),
        el('td', { text: expense.description }),
        el('td', { text: expense.category }),
        el('td', { text: formatMoney(expense.amount, trip.currencyCode) }),
        el('td', {}, [button('Delete', 'expense:delete', '', { 'data-expense-id': expense.id })]),
      ]),
    )),
  ]);

  const summary = el('ul', { className: 'info-list' }, [
    el('li', {}, [el('strong', { text: 'Expected budget' }), el('span', { text: formatMoney(trip.expectedBudget, trip.currencyCode) })]),
    el('li', {}, [el('strong', { text: 'Total expenses' }), el('span', { text: `${formatMoney(status.spent, trip.currencyCode)} · ${status.percentSpent}% spent` })]),
    el('li', {}, [el('strong', { text: 'Remaining budget' }), el('span', { text: formatMoney(status.remaining, trip.currencyCode) })]),
  ]);

  const categoryList = el('ul', { className: 'info-list' }, categories.length === 0
    ? [el('li', { className: 'notice', text: 'No expenses recorded yet.' })]
    : categories.map((entry) => el('li', {}, [el('strong', { text: entry.category }), el('span', { text: formatMoney(entry.amount, trip.currencyCode) })])));

  return [
    panel('Expense summary', [
      summary,
      el('p', { className: `status status-${status.level}`, text: status.message ? `${status.label} — ${status.message}` : status.label }),
      el('h3', { text: 'By category' }),
      categoryList,
    ]),
    panel('Expenses', list.length === 0 ? [el('p', { className: 'notice', text: 'No expenses yet.' })] : [table]),
    panel('', [addForm]),
  ];
}

function weatherSummary(trip) {
  const place = trip.destinationId ? getPlaceById(state.places, trip.destinationId) : null;
  const result = state.weather.tripId === trip.id ? state.weather.result : null;

  if (state.weather.tripId === trip.id && state.weather.loading) {
    return el('p', { text: 'Loading weather…', attrs: { role: 'status' } });
  }
  if (!result) {
    return el('div', {}, [
      el('p', { text: 'Weather has not been requested for this trip yet.' }),
      button('Load weather', 'weather:load', '', { 'data-trip-id': trip.id }),
    ]);
  }
  if (result.status !== 'ok') {
    return el('div', {}, [
      el('p', { className: 'status status-unavailable', text: result.status === 'error' ? 'Weather request failed' : 'Forecast unavailable' }),
      el('p', { text: result.message }),
    ]);
  }
  return el('div', {}, [
    el('p', { text: `Provider: ${result.provider} · retrieved ${result.retrievedAt} · valid for ${result.validFor}` }),
    el('p', { text: hasTemperature(result.current.temperature) ? `Now: ${result.current.temperature}°C, ${result.current.condition}` : `Now: ${result.current.condition}` }),
    el('ul', { className: 'info-list' }, result.days.map((day) =>
      el('li', {}, [el('strong', { text: formatDate(day.date) }), el('span', { text: `${day.minTemperature}–${day.maxTemperature}°C · ${day.condition} · ${day.precipitation} mm` })]),
    )),
    result.note ? el('p', { className: 'notice', text: result.note }) : null,
  ]);
}

function renderWeatherTab(trip) {
  return [
    panel('Weather and packing context', [
      el('p', { text: `Weather for ${trip.destinationLabel}` }),
      weatherSummary(trip),
      el('p', { className: 'hint', text: 'Forecast data comes from an external provider and can be unavailable. Trip data is never affected.' }),
    ]),
    el('div', { className: 'actions' }, [button('Back to packing list', 'tab:set', '', { 'data-tab': 'packing' })]),
  ];
}

function renderTrip() {
  const trip = activeTrip();
  if (!trip) {
    return [panel('Trip not found', [el('p', { text: 'That trip no longer exists.' }), button('Back to My Trips', 'nav:trips')])];
  }
  const tabContent = {
    overview: renderOverviewTab(trip),
    itinerary: renderItineraryTab(trip),
    packing: renderPackingTab(trip),
    expenses: renderExpensesTab(trip),
    weather: renderWeatherTab(trip),
  }[state.tripTab] || [];

  return [
    el('section', { className: 'panel hero' }, [
      el('h2', { text: trip.name }),
      el('p', { text: `${trip.destinationLabel} · ${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}` }),
      el('div', { className: 'actions' }, [button('Back to My Trips', 'nav:trips')]),
    ]),
    tripTabs(trip),
    ...tabContent,
  ];
}

function render() {
  renderNav();
  renderSessionBar();

  let nodes;
  if (state.loginOpen) nodes = [renderLoginPanel()];
  else if (state.section === 'home') nodes = renderHome();
  else if (state.section === 'discover') nodes = renderDiscover();
  else if (state.section === 'place') nodes = renderPlaceDetails();
  else if (state.section === 'saved') nodes = renderSaved();
  else if (state.section === 'trips') nodes = renderTrips();
  else if (state.section === 'trip') nodes = renderTrip();
  else nodes = [panel('Not found', [el('p', { text: 'Unknown section.' })])];

  view.textContent = '';
  for (const node of nodes.filter(Boolean)) view.append(node);
}

/* ------------------------------------------------------------- actions ---- */

function go(section) {
  const changed = state.section !== section;
  state.section = section;
  state.loginOpen = false;
  state.formErrors = {};
  render();
  // Move focus only on navigation. Re-renders must not steal focus from inputs.
  if (changed) view.focus({ preventScroll: true });
}

function logOut() {
  storageApi.clearSession();
  state.session = null;
  state.section = 'home';
  state.activeTripId = null;
  state.editingTripId = null;
  state.formErrors = {};
  setStatus('Signed out. You are back in the guest view.');
  render();
}

/** Shared by typed sign-in, registration, and the demo button. */
function startSession(user, message) {
  state.session = user;
  storageApi.writeSession(authApi.createSession(user));
  state.loginOpen = false;
  state.section = 'home';
  state.editingTripId = null;
  state.formErrors = {};
  setStatus(message);
  render();
}

async function signIn(values) {
  const result = await authApi.authenticate(state.users, values);
  if (!result.ok) {
    state.formErrors = result.errors;
    render();
    return;
  }
  startSession(result.user, `Signed in as ${result.user.name}.`);
}

async function registerAccount(values) {
  const result = await authApi.registerUser(state.users, values);
  if (!result.ok) {
    state.formErrors = result.errors;
    render();
    return;
  }
  state.users = result.users;
  storageApi.writeList(storageApi.STORAGE_KEYS.users, state.users);
  startSession(result.user, `Account created for ${result.user.email}. New accounts start with no trips.`);
}

async function demoLogin() {
  const result = await authApi.authenticate(state.users, authApi.DEMO_CREDENTIALS);
  if (!result.ok) {
    setStatus('The demo account is unavailable. Create your own account instead.');
    render();
    return;
  }
  startSession(result.user, `Signed in as ${result.user.name}. The sample trip belongs to this account.`);
}

async function loadWeather(tripId) {
  const trip = tripsApi.getTripById(state.trips, tripId);
  if (!trip) return;
  state.weather = { tripId, loading: true, result: null };
  render();
  const place = trip.destinationId ? getPlaceById(state.places, trip.destinationId) : null;
  const result = await getWeatherForPlace(place, trip.startDate, trip.endDate);
  state.weather = { tripId, loading: false, result };
  render();
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  if (action === 'nav:home') go('home');
  else if (action === 'nav:discover') go('discover');
  else if (action === 'nav:trips') go('trips');
  else if (action === 'nav:saved') go('saved');
  else if (action === 'login:open') { state.loginOpen = true; state.authTab = 'signin'; state.formErrors = {}; render(); }
  else if (action === 'login:cancel') { state.loginOpen = false; state.formErrors = {}; render(); }
  else if (action === 'auth:tab') { state.authTab = target.dataset.tab; state.formErrors = {}; render(); }
  else if (action === 'auth:demologin') { demoLogin(); }
  else if (action === 'logout') logOut();
  else if (action === 'filter:clear') { state.filters = { query: '', category: 'All' }; render(); }
  else if (action === 'filter:category') { state.filters.category = target.dataset.category; state.section = 'discover'; render(); }
  else if (action === 'place:view') { state.activePlaceId = target.dataset.placeId; go('place'); }
  else if (action === 'place:save') {
    state.savedPlaces = savePlace(state.savedPlaces, currentUserId(), target.dataset.placeId);
    save(['savedPlaces']);
    setStatus('Place saved.');
    render();
  } else if (action === 'place:unsave') {
    state.savedPlaces = removeSavedPlace(state.savedPlaces, currentUserId(), target.dataset.placeId);
    save(['savedPlaces']);
    setStatus('Place removed from saved places.');
    render();
  } else if (action === 'trips:new') { state.editingTripId = 'new'; state.formErrors = {}; go('trips'); }
  else if (action === 'trips:cancel') { state.editingTripId = null; state.formErrors = {}; render(); }
  else if (action === 'trip:view') { state.activeTripId = target.dataset.tripId; state.tripTab = 'overview'; state.formErrors = {}; go('trip'); }
  else if (action === 'trip:edit') { state.editingTripId = target.dataset.tripId; state.activeTripId = target.dataset.tripId; state.formErrors = {}; go('trips'); }
  else if (action === 'trip:delete') {
    const trip = tripsApi.getTripById(state.trips, target.dataset.tripId);
    const owned = trip && trip.userId === currentUserId();
    if (owned && window.confirm(`Delete "${trip.name}" and all of its itinerary, packing, and expense records?`)) {
      const next = tripsApi.removeTripAndDependents(trip.id, {
        trips: state.trips,
        itinerary: state.itinerary,
        packing: state.packing,
        expenses: state.expenses,
      }, currentUserId());
      if (!next.ok) {
        setStatus(next.errors.form);
        render();
        return;
      }
      state.trips = next.trips;
      state.itinerary = next.itinerary;
      state.packing = next.packing;
      state.expenses = next.expenses;
      save(['trips', 'itinerary', 'packing', 'expenses']);
      setStatus(`Deleted "${trip.name}" and its dependent records.`);
      go('trips');
    }
  } else if (action === 'tab:set') { state.tripTab = target.dataset.tab; state.formErrors = {}; render(); }
  else if (action === 'activity:delete') {
    state.itinerary = itineraryApi.deleteActivity(state.itinerary, target.dataset.itemId);
    save(['itinerary']);
    setStatus('Activity removed. The linked place record is unchanged.');
    render();
  } else if (action === 'activity:move') {
    state.itinerary = itineraryApi.moveActivity(state.itinerary, state.activeTripId, target.dataset.itemId, target.dataset.direction);
    save(['itinerary']);
    render();
  } else if (action === 'packing:delete') {
    state.packing = packingApi.deletePackingItem(state.packing, target.dataset.itemId);
    save(['packing']);
    render();
  } else if (action === 'packing:suggest') {
    state.packing = packingApi.suggestPackingItems(state.packing, state.activeTripId);
    save(['packing']);
    setStatus('Suggested items added. Existing items were not changed.');
    render();
  } else if (action === 'packing:toggle') {
    state.packing = packingApi.togglePackingItem(state.packing, target.dataset.itemId);
    save(['packing']);
    render();
  } else if (action === 'expense:delete') {
    state.expenses = expensesApi.deleteExpense(state.expenses, target.dataset.expenseId);
    save(['expenses']);
    setStatus('Expense removed. Totals recalculated.');
    render();
  } else if (action === 'weather:load') {
    loadWeather(target.dataset.tripId);
  } else if (action === 'reset:data') {
    if (window.confirm('Reset all local data back to the sample data? This cannot be undone.')) {
      storageApi.resetAllData();
      loadData();
      state.section = 'home';
      setStatus('Sample data restored.');
      render();
    }
  }
}

function handleSubmit(event) {
  const form = event.target;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const userId = currentUserId();

  if (form.id === 'home-search') {
    state.filters = { query: data.homeQuery || '', category: 'All' };
    go('discover');
    return;
  }

  if (form.id === 'discover-search') {
    state.filters = { ...state.filters, query: data.query || '' };
    render();
    return;
  }

  if (form.id === 'signin-form') {
    signIn({ email: data.signinEmail, password: data.signinPassword });
    return;
  }

  if (form.id === 'register-form') {
    registerAccount({
      name: data.registerName,
      email: data.registerEmail,
      password: data.registerPassword,
      confirmPassword: data.registerConfirmPassword,
    });
    return;
  }

  if (form.id === 'trip-form') {
    const editing = state.editingTripId !== 'new'
      ? tripsApi.getTripById(state.trips, state.editingTripId)
      : null;
    if (editing && editing.userId === userId) {
      const result = tripsApi.updateTrip(state.trips, editing.id, data, userId);
      if (!result.ok) { state.formErrors = result.errors; render(); return; }
      state.trips = result.trips;
      save(['trips']);
      setStatus(`Updated "${editing.name}".`);
      state.editingTripId = null;
      state.activeTripId = editing.id;
      go('trip');
      return;
    }
    const result = tripsApi.createTrip(data, userId);
    if (!result.ok) { state.formErrors = result.errors; render(); return; }
    state.trips = [...state.trips, result.trip];
    save(['trips']);
    setStatus(`Created "${result.trip.name}".`);
    state.editingTripId = null;
    state.activeTripId = result.trip.id;
    state.tripTab = 'overview';
    go('trip');
    return;
  }

  const trip = activeTrip();

  if (form.id === 'activity-form' && trip) {
    const result = itineraryApi.addActivity(state.itinerary, trip, data);
    if (!result.ok) { state.formErrors = result.errors; render(); return; }
    state.itinerary = result.itinerary;
    save(['itinerary']);
    setStatus('Activity added.');
    state.formErrors = {};
    render();
    return;
  }

  if (form.id === 'packing-form' && trip) {
    const result = packingApi.addPackingItem(state.packing, trip.id, data.name);
    if (!result.ok) { state.formErrors = result.errors; render(); return; }
    state.packing = result.packing;
    save(['packing']);
    state.formErrors = {};
    render();
    return;
  }

  if (form.id === 'expense-form' && trip) {
    const result = expensesApi.addExpense(state.expenses, trip.id, {
      description: data.description,
      amount: data.amount,
      category: data.category,
      date: data.expenseDate,
      notes: data.expenseNotes,
    });
    if (!result.ok) { state.formErrors = result.errors; render(); return; }
    state.expenses = result.expenses;
    save(['expenses']);
    setStatus('Expense added. Totals recalculated.');
    state.formErrors = {};
    render();
    return;
  }

  if (form.id === 'add-to-trip' && data.tripId) {
    const candidate = tripsApi.getTripById(state.trips, data.tripId);
    const targetTrip = candidate && candidate.userId === userId ? candidate : null;
    const place = getPlaceById(state.places, state.activePlaceId);
    if (!targetTrip || !place) return;
    const result = itineraryApi.addActivity(state.itinerary, targetTrip, {
      title: place.name,
      date: targetTrip.startDate,
      notes: 'Added from Discover',
      estimatedCost: place.estimatedCost,
      placeId: place.id,
    });
    if (!result.ok) { state.formErrors = result.errors; render(); return; }
    state.itinerary = result.itinerary;
    save(['itinerary']);
    setStatus(`Added "${place.name}" to "${targetTrip.name}" on ${targetTrip.startDate}.`);
    state.activeTripId = targetTrip.id;
    state.tripTab = 'itinerary';
    go('trip');
  }
}

/* ---------------------------------------------------------------- init ---- */

function init() {
  storageApi.ensureSeedData();
  loadData();
  document.getElementById('app').addEventListener('click', handleClick);
  document.getElementById('app').addEventListener('submit', handleSubmit);
  // The demo account is created with a real salted+hashed password before first render.
  authApi.ensureDemoAccount(storageApi.readList(storageApi.STORAGE_KEYS.users)).then((users) => {
    storageApi.writeList(storageApi.STORAGE_KEYS.users, users);
    loadData();
    render();
  });
  render();
}

init();
