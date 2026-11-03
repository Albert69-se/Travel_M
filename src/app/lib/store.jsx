/**
 * Application data layer for the React build.
 *
 * The rules live in `src/core/*` — the same DOM-free modules the HTML prototype
 * uses — and this provider is the only thing that reads from or writes to
 * localStorage. Every mutation calls the core function, stores the returned
 * collection, and then re-reads the snapshot, so the stored records remain the
 * single source of truth and React state can never drift from them.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as auth from '../../core/auth.js';
import * as expensesApi from '../../core/expenses.js';
import * as itineraryApi from '../../core/itinerary.js';
import * as packingApi from '../../core/packing.js';
import * as placesApi from '../../core/places.js';
import * as tripsApi from '../../core/trips.js';
import * as storage from '../../core/storage.js';
import { POPULAR_THAILAND_PLACES } from '../../core/featured.js';
import { subscribeGoogleCatalog, loadGoogleCatalog, resolveGooglePlace } from './google-places.js';

const { STORAGE_KEYS: KEYS } = storage;

const DataContext = createContext(null);

function readSnapshot() {
  return {
    places: storage.readList(KEYS.places),
    trips: storage.readList(KEYS.trips),
    itinerary: storage.readList(KEYS.itinerary),
    packing: storage.readList(KEYS.packing),
    expenses: storage.readList(KEYS.expenses),
    savedPlaces: storage.readList(KEYS.savedPlaces),
    users: storage.readList(KEYS.users),
    session: storage.readSession(),
  };
}

export function DataProvider({ children }) {
  const [data, setData] = useState(() => readSnapshot());
  const [ready, setReady] = useState(false);
  const [status, setStatusState] = useState(null);
  /**
   * Live Google Places content stays in memory; bookmarks keep only stable IDs.
   */
  const [placeImport, setPlaceImport] = useState({ status: 'loading', places: [], meta: null, message: '' });
  const [googleReferences, setGoogleReferences] = useState([]);

  const refresh = useCallback(() => setData(readSnapshot()), []);

  // The Discover catalog shares this origin in its own browsing context.
  // Keep shell, saved places and trip state current after its storage writes.
  useEffect(() => {
    const handleStorage = event => {
      if (event.storageArea === localStorage && event.key?.startsWith('travelm.')) refresh();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refresh]);

  const setStatus = useCallback((message, tone = 'info') => {
    setStatusState(message ? { message, tone } : null);
  }, []);

  // Seed the sample data and make sure the published demo account exists, then
  // resolve any remembered session against the stored user list.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      storage.ensureSeedData();
      const existing = storage.readList(KEYS.users);
      const users = await auth.ensureDemoAccount(existing);
      if (users !== existing) storage.writeList(KEYS.users, users);
      if (!cancelled) {
        refresh();
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => subscribeGoogleCatalog(setPlaceImport), []);

  const ensureGooglePlace = useCallback(async id => {
    const place = await resolveGooglePlace(id);
    if (place) setGoogleReferences(current => current.some(entry => entry.id === id) ? current : [...current, place]);
    return place;
  }, []);
  const retryPlaceImport = useCallback(() => loadGoogleCatalog(true), []);
  const referencedIds = useMemo(() => [...new Set([
    ...data.savedPlaces.map(entry => entry.placeId),
    ...data.itinerary.map(entry => entry.placeId),
    ...data.trips.map(entry => entry.destinationId),
  ].filter(id => typeof id === 'string' && id.startsWith('google-')))].sort().join('|'), [data.savedPlaces, data.itinerary, data.trips]);
  useEffect(() => {
    if (!referencedIds || placeImport.status === 'loading') return;
    let cancelled = false;
    // Sequential detail recovery keeps reloads of large saved lists bounded.
    (async () => {
      for (const id of referencedIds.split('|')) {
        if (cancelled) return;
        await ensureGooglePlace(id);
      }
    })();
    return () => { cancelled = true; };
  }, [referencedIds, placeImport.status, ensureGooglePlace]);

  const user = useMemo(
    () => auth.resolveSession(data.session, data.users),
    [data.session, data.users],
  );

  /* ---------------------------------------------------------------- accounts */

  const signIn = useCallback(
    async ({ email, password }) => {
      const result = await auth.authenticate(storage.readList(KEYS.users), { email, password });
      if (!result.ok) return result;
      storage.writeSession(auth.createSession(result.user));
      refresh();
      setStatus(`Signed in as ${result.user.name}.`, 'success');
      return result;
    },
    [refresh, setStatus],
  );

  const signInAsDemo = useCallback(
    () => signIn({ email: auth.DEMO_CREDENTIALS.email, password: auth.DEMO_CREDENTIALS.password }),
    [signIn],
  );

  const register = useCallback(
    async (input) => {
      const users = storage.readList(KEYS.users);
      const result = await auth.registerUser(users, input);
      if (!result.ok) return result;
      storage.writeList(KEYS.users, result.users);
      storage.writeSession(auth.createSession(result.user));
      refresh();
      setStatus(`Account created for ${result.user.email}.`, 'success');
      return result;
    },
    [refresh, setStatus],
  );

  const signOut = useCallback(() => {
    storage.clearSession();
    refresh();
    setStatus('Signed out. Planning data belongs to the account that owns it.', 'info');
  }, [refresh, setStatus]);

  /* ------------------------------------------------------------------ places */

  const isPlaceSaved = useCallback(
    (placeId) => (user ? placesApi.isPlaceSaved(data.savedPlaces, user.id, placeId) : false),
    [data.savedPlaces, user],
  );

  const toggleSavedPlace = useCallback(
    (placeId) => {
      if (!user) return { ok: false, errors: { form: 'Sign in to save places.' } };
      const currently = placesApi.isPlaceSaved(data.savedPlaces, user.id, placeId);
      const next = currently
        ? placesApi.removeSavedPlace(data.savedPlaces, user.id, placeId)
        : placesApi.savePlace(data.savedPlaces, user.id, placeId);
      storage.writeList(KEYS.savedPlaces, next);
      refresh();
      setStatus(currently ? 'Removed from saved places.' : 'Saved to your places.', 'success');
      return { ok: true };
    },
    [data.savedPlaces, refresh, setStatus, user],
  );

  /* ------------------------------------------------------------------- trips */

  const createTrip = useCallback(
    (input) => {
      const result = tripsApi.createTrip(input, user ? user.id : null);
      if (!result.ok) return result;
      const trips = [...storage.readList(KEYS.trips), result.trip];
      storage.writeList(KEYS.trips, trips);
      refresh();
      setStatus(`Trip “${result.trip.name}” created.`, 'success');
      return { ok: true, trip: result.trip };
    },
    [refresh, setStatus, user],
  );

  const updateTrip = useCallback(
    (tripId, input) => {
      const result = tripsApi.updateTrip(storage.readList(KEYS.trips), tripId, input, user ? user.id : null);
      if (!result.ok) return result;
      const dateError = tripsApi.validateTripDatesAgainstActivities(tripId, input, storage.readList(KEYS.itinerary));
      if (dateError) return { ok: false, errors: { form: dateError } };
      storage.writeList(KEYS.trips, result.trips);
      refresh();
      setStatus('Trip updated.', 'success');
      return { ok: true };
    },
    [refresh, setStatus, user],
  );

  const deleteTrip = useCallback(
    (tripId) => {
      const remaining = tripsApi.removeTripAndDependents(tripId, {
        trips: storage.readList(KEYS.trips),
        itinerary: storage.readList(KEYS.itinerary),
        packing: storage.readList(KEYS.packing),
        expenses: storage.readList(KEYS.expenses),
      }, user ? user.id : null);
      if (!remaining.ok) return remaining;
      storage.writeList(KEYS.trips, remaining.trips);
      storage.writeList(KEYS.itinerary, remaining.itinerary);
      storage.writeList(KEYS.packing, remaining.packing);
      storage.writeList(KEYS.expenses, remaining.expenses);
      refresh();
      setStatus('Trip deleted, along with its itinerary, packing list and expenses.', 'info');
      return { ok: true };
    },
    [refresh, setStatus, user],
  );

  /* --------------------------------------------------------------- itinerary */

  const addActivity = useCallback(
    (trip, input) => {
      const result = itineraryApi.addActivity(storage.readList(KEYS.itinerary), trip, input);
      if (!result.ok) return result;
      storage.writeList(KEYS.itinerary, result.itinerary);
      refresh();
      setStatus('Activity added to the itinerary.', 'success');
      return { ok: true };
    },
    [refresh, setStatus],
  );

  const updateActivity = useCallback(
    (trip, activityId, input) => {
      const result = itineraryApi.updateActivity(storage.readList(KEYS.itinerary), trip, activityId, input);
      if (!result.ok) return result;
      storage.writeList(KEYS.itinerary, result.itinerary);
      refresh();
      setStatus('Activity updated.', 'success');
      return { ok: true };
    },
    [refresh, setStatus],
  );

  const deleteActivity = useCallback(
    (activityId) => {
      storage.writeList(KEYS.itinerary, itineraryApi.deleteActivity(storage.readList(KEYS.itinerary), activityId));
      refresh();
      setStatus('Activity removed.', 'info');
      return { ok: true };
    },
    [refresh, setStatus],
  );

  const moveActivity = useCallback(
    (tripId, activityId, direction) => {
      storage.writeList(
        KEYS.itinerary,
        itineraryApi.moveActivity(storage.readList(KEYS.itinerary), tripId, activityId, direction),
      );
      refresh();
      return { ok: true };
    },
    [refresh],
  );

  /* ----------------------------------------------------------------- packing */

  const addPackingItem = useCallback(
    (tripId, name) => {
      const result = packingApi.addPackingItem(storage.readList(KEYS.packing), tripId, name);
      if (!result.ok) return result;
      storage.writeList(KEYS.packing, result.packing);
      refresh();
      return { ok: true };
    },
    [refresh],
  );

  const togglePackingItem = useCallback(
    (itemId) => {
      storage.writeList(KEYS.packing, packingApi.togglePackingItem(storage.readList(KEYS.packing), itemId));
      refresh();
      return { ok: true };
    },
    [refresh],
  );

  const renamePackingItem = useCallback(
    (itemId, name) => {
      storage.writeList(KEYS.packing, packingApi.renamePackingItem(storage.readList(KEYS.packing), itemId, name));
      refresh();
      return { ok: true };
    },
    [refresh],
  );

  const deletePackingItem = useCallback(
    (itemId) => {
      storage.writeList(KEYS.packing, packingApi.deletePackingItem(storage.readList(KEYS.packing), itemId));
      refresh();
      return { ok: true };
    },
    [refresh],
  );

  const movePackingItem = useCallback((tripId, itemId, direction) => {
    const trip = tripsApi.getTripById(storage.readList(KEYS.trips), tripId);
    if (!user || !trip || trip.userId !== user.id) return { ok: false };
    storage.writeList(KEYS.packing, packingApi.movePackingItem(storage.readList(KEYS.packing), tripId, itemId, direction));
    refresh();
    return { ok: true };
  }, [refresh, user]);

  const suggestPackingItems = useCallback(
    (tripId) => {
      storage.writeList(KEYS.packing, packingApi.suggestPackingItems(storage.readList(KEYS.packing), tripId));
      refresh();
      return { ok: true };
    },
    [refresh],
  );

  /* ---------------------------------------------------------------- expenses */

  const addExpense = useCallback(
    (tripId, input) => {
      const result = expensesApi.addExpense(storage.readList(KEYS.expenses), tripId, input);
      if (!result.ok) return result;
      storage.writeList(KEYS.expenses, result.expenses);
      refresh();
      setStatus('Expense recorded.', 'success');
      return { ok: true };
    },
    [refresh, setStatus],
  );

  const updateExpense = useCallback(
    (expenseId, input) => {
      const result = expensesApi.updateExpense(storage.readList(KEYS.expenses), expenseId, input);
      if (!result.ok) return result;
      storage.writeList(KEYS.expenses, result.expenses);
      refresh();
      return { ok: true };
    },
    [refresh],
  );

  const deleteExpense = useCallback(
    (expenseId) => {
      storage.writeList(KEYS.expenses, expensesApi.deleteExpense(storage.readList(KEYS.expenses), expenseId));
      refresh();
      setStatus('Expense deleted.', 'info');
      return { ok: true };
    },
    [refresh, setStatus],
  );

  /* -------------------------------------------------------------------- data */

  const resetData = useCallback(() => {
    storage.resetAllData();
    storage.ensureSeedData();
    refresh();
    setStatus('Sample data restored. Accounts and their records were cleared.', 'info');
  }, [refresh, setStatus]);

  /**
   * Old sample/editorial IDs remain available for existing trips.
   * Discover shows only live Google Places records.
   */
  const places = useMemo(
    () => [...new Map([
      ...[...data.places, ...POPULAR_THAILAND_PLACES].map(place => [place.id, { ...place, archived: true }]),
      ...googleReferences.map(place => [place.id, { ...place, archived: true }]),
      ...placeImport.places.map(place => [place.id, place]),
    ]).values()],
    [data.places, placeImport.places, googleReferences],
  );

  const value = useMemo(
    () => ({
      ready,
      status,
      setStatus,
      user,
      users: data.users,
      places,
      placeImport,
      retryPlaceImport,
      ensureGooglePlace,
      savedPlaces: data.savedPlaces,
      trips: data.trips,
      itinerary: data.itinerary,
      packing: data.packing,
      expenses: data.expenses,
      signIn,
      signInAsDemo,
      register,
      signOut,
      isPlaceSaved,
      toggleSavedPlace,
      createTrip,
      updateTrip,
      deleteTrip,
      addActivity,
      updateActivity,
      deleteActivity,
      moveActivity,
      addPackingItem,
      togglePackingItem,
      renamePackingItem,
      deletePackingItem,
      movePackingItem,
      suggestPackingItems,
      addExpense,
      updateExpense,
      deleteExpense,
      resetData,
    }),
    [
      ready, status, setStatus, user, data, places, placeImport, ensureGooglePlace, retryPlaceImport, signIn, signInAsDemo, register, signOut, isPlaceSaved,
      toggleSavedPlace, createTrip, updateTrip, deleteTrip, addActivity, updateActivity,
      deleteActivity, moveActivity, addPackingItem, togglePackingItem, renamePackingItem,
      deletePackingItem, movePackingItem, suggestPackingItems, addExpense, updateExpense, deleteExpense, resetData,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used inside <DataProvider>.');
  return context;
}

/**
 * The signed-in traveller's records, narrowed to the selected trip.
 * `tripId` of null means "no trip selected".
 */
export function useTripData(tripId) {
  const data = useData();
  return useMemo(() => {
    const trip = data.trips.find((entry) => entry.id === tripId) || null;
    if (!trip) {
      return { trip: null, activities: [], activityGroups: [], packing: [], packingCounts: { packed: 0, total: 0, remaining: 0 }, expenses: [], spent: 0, remaining: 0, budget: { level: 'unknown', label: 'No trip', percentSpent: 0 }, categoryTotals: [], days: [] };
    }
    return {
      trip,
      activities: itineraryApi.listByTrip(data.itinerary, trip.id),
      activityGroups: itineraryApi.groupByDay(data.itinerary, trip.id),
      packing: packingApi.listByTrip(data.packing, trip.id),
      packingCounts: packingApi.packingCounts(data.packing, trip.id),
      expenses: expensesApi.listByTrip(data.expenses, trip.id),
      spent: expensesApi.totalSpent(data.expenses, trip.id),
      remaining: expensesApi.remainingBudget(data.expenses, trip),
      budget: expensesApi.budgetStatus(data.expenses, trip),
      categoryTotals: expensesApi.totalsByCategory(data.expenses, trip.id),
      days: tripsApi.listTripDates(trip),
    };
  }, [data, tripId]);
}
