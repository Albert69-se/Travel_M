/**
 * Routes. Planning data belongs to a signed-in traveller, so the trip, saved
 * place and account routes are behind `RequireSignIn`; browsing and search stay
 * open to guests.
 */
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Shell from './app/layout/Shell.jsx';
import { useData } from './app/lib/store.jsx';

import HomeView from './app/views/Home.jsx';
import DiscoverView from './app/views/Discover.jsx';
import PlaceDetailView from './app/views/PlaceDetail.jsx';
import SavedPlacesView from './app/views/SavedPlaces.jsx';
import TripsView from './app/views/Trips.jsx';
import TripLayout from './app/views/TripLayout.jsx';
import TripOverviewView from './app/views/TripOverview.jsx';
import ItineraryView from './app/views/Itinerary.jsx';
import PackingView from './app/views/Packing.jsx';
import ExpensesView from './app/views/Expenses.jsx';
import WeatherView from './app/views/Weather.jsx';
import AccountView from './app/views/Account.jsx';
import SignInView from './app/views/SignIn.jsx';
import RegisterView from './app/views/Register.jsx';
import NotFoundView from './app/views/NotFound.jsx';

function RequireSignIn({ children }) {
  const { user, ready } = useData();
  const location = useLocation();

  if (!ready) return null;
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomeView />} />
        <Route path="discover" element={<DiscoverView />} />
        <Route path="discover/:placeId" element={<PlaceDetailView />} />
        <Route
          path="saved"
          element={
            <RequireSignIn>
              <SavedPlacesView />
            </RequireSignIn>
          }
        />
        <Route
          path="trips"
          element={
            <RequireSignIn>
              <TripsView />
            </RequireSignIn>
          }
        />
        <Route
          path="trips/:tripId"
          element={
            <RequireSignIn>
              <TripLayout />
            </RequireSignIn>
          }
        >
          <Route index element={<TripOverviewView />} />
          <Route path="itinerary" element={<ItineraryView />} />
          <Route path="packing" element={<PackingView />} />
          <Route path="expenses" element={<ExpensesView />} />
          <Route path="weather" element={<WeatherView />} />
        </Route>
        <Route path="account" element={<AccountView />} />
        <Route path="signin" element={<SignInView />} />
        <Route path="register" element={<RegisterView />} />
        <Route path="*" element={<NotFoundView />} />
      </Route>
    </Routes>
  );
}
