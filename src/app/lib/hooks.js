/** Small shared hooks. */
import { useMatch } from 'react-router-dom';

import { useData } from './store.jsx';

/**
 * The trip the interface is focused on: the one in the URL when a trip route is
 * open, otherwise the traveller's most recently starting trip.
 */
export function useFocusTrip() {
  // Both matchers are called unconditionally. `useMatch(a) || useMatch(b)` would
  // skip the second call whenever the first matched, so the hook count would
  // change between renders and React would tear down the tree on client-side
  // navigation (it worked only on full page loads, where every render agreed).
  const nested = useMatch('/trips/:tripId/*');
  const exact = useMatch('/trips/:tripId');
  const match = nested || exact;
  const { trips, user } = useData();

  const routeTripId = match ? match.params.tripId : null;
  const mine = user ? trips.filter((trip) => trip.userId === user.id) : [];
  const byStart = [...mine].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));

  const trip = routeTripId
    ? mine.find((entry) => entry.id === routeTripId) || null
    : byStart[0] || null;

  return trip;
}
