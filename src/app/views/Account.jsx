/**
 * Account. Signed in it shows who you are, which records belong to the account,
 * where those records physically live, and the two controls that clear or end
 * the session. A guest sees a sign-in prompt instead of empty profile fields.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Database,
  LogIn,
  LogOut,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UserPlus,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  FinePrint,
  KeyValue,
  Notice,
  Row,
} from '../components/ui.jsx';
import { useData } from '../lib/store.jsx';
import { DEMO_CREDENTIALS } from '../../core/auth.js';
import { STORAGE_KEYS } from '../../core/storage.js';

const LINK_PRIMARY =
  'tm-focus inline-flex h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-control bg-accent px-3 text-body font-medium text-white transition-colors hover:bg-accent-hover';
const LINK_SECONDARY =
  'tm-focus inline-flex h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-control border border-line bg-surface px-3 text-body font-medium text-ink transition-colors hover:border-line-strong';

/** What each storage key actually holds, so the list is not just bare strings. */
const KEY_NOTES = {
  places: '61 editorial Thai attraction picks plus demo places; Google Places photos load on demand when enabled',
  trips: 'Trips, each stamped with the id of its owner',
  itinerary: 'Itinerary activities, one date each, per trip',
  packing: 'Packing items and their packed flag, per trip',
  expenses: 'Recorded expenses, per trip',
  savedPlaces: 'Saved-place links, per account',
  users: 'Account records: name, email, salt and password hash',
  session: 'The signed-in session remembered for this browser',
  seeded: 'Flag recording that the sample data was seeded once',
};

function initialsOf(name) {
  if (typeof name !== 'string' || name.trim() === '') return 'TM';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function CredentialPanel() {
  return (
    <div className="rounded-control border border-line bg-sunken px-3 py-2">
      <p className="text-micro font-semibold uppercase text-ink-tertiary">Published demo account</p>
      <div className="mt-1 divide-y divide-line">
        <KeyValue label="Email">{DEMO_CREDENTIALS.email}</KeyValue>
        <KeyValue label="Password">{DEMO_CREDENTIALS.password}</KeyValue>
      </div>
    </div>
  );
}

function GuestAccount() {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-ink">Account</h1>
          <p className="mt-1 text-body text-ink-secondary">
            You are browsing as a guest, so there is no profile to show yet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/signin" className={LINK_PRIMARY}>
            <LogIn size={15} strokeWidth={1.75} aria-hidden="true" />
            Sign in
          </Link>
          <Link to="/register" className={LINK_SECONDARY}>
            <UserPlus size={15} strokeWidth={1.75} aria-hidden="true" />
            Create account
          </Link>
        </div>
      </header>

      <Card>
        <EmptyState
          icon={LogIn}
          title="Sign in to see your account"
          description="A profile, its record counts and the data-layer settings are only shown for an account that exists. Guests can still browse and search places."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/signin" className={LINK_PRIMARY}>
                Sign in
              </Link>
              <Link to="/discover" className={LINK_SECONDARY}>
                Browse places instead
              </Link>
            </div>
          }
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardHeader title="Demo account" meta="Sign in to explore planning data" />
          <CredentialPanel />
          <p className="text-label text-ink-secondary">
            The demo account owns the sample trip, so its itinerary, packing list and expenses are visible straight
            away.
          </p>
        </Card>

        <Card className="flex flex-col gap-3">
          <CardHeader title="Where records are kept" meta="This browser only" />
          <div className="border-t border-line">
            {Object.entries(STORAGE_KEYS).map(([name, key]) => (
              <Row key={name}>
                <span className="w-24 shrink-0 text-micro uppercase text-ink-tertiary">{name}</span>
                <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{key}</span>
              </Row>
            ))}
          </div>
          <FinePrint>No server · no shared data · nothing is uploaded</FinePrint>
        </Card>
      </div>
    </div>
  );
}

export default function AccountView() {
  const { user, trips, savedPlaces, itinerary, packing, expenses, signOut, resetData } = useData();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const userId = user ? user.id : null;

  const owned = useMemo(() => {
    const mine = userId ? trips.filter((trip) => trip.userId === userId) : [];
    const tripIds = new Set(mine.map((trip) => trip.id));
    return {
      trips: mine.length,
      savedPlaces: userId ? savedPlaces.filter((link) => link.userId === userId).length : 0,
      activities: itinerary.filter((item) => tripIds.has(item.tripId)).length,
      packing: packing.filter((item) => tripIds.has(item.tripId)).length,
      expenses: expenses.filter((item) => tripIds.has(item.tripId)).length,
    };
  }, [userId, trips, savedPlaces, itinerary, packing, expenses]);

  if (!user) return <GuestAccount />;

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  const handleReset = () => {
    resetData();
    setConfirming(false);
    navigate('/');
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-chip bg-tint text-label font-semibold text-accent">
            {initialsOf(user.name)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-title font-semibold text-ink">{user.name}</h1>
            <p className="mt-0.5 truncate text-body text-ink-secondary">{user.email}</p>
          </div>
        </div>
        <Button variant="secondary" icon={LogOut} onClick={handleSignOut}>
          Sign out
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardHeader
            title="Profile"
            meta="Your local profile"
            action={<Badge tone="accent">Signed in</Badge>}
          />
          <div className="divide-y divide-line border-t border-line pt-1">
            <KeyValue label="Name">{user.name}</KeyValue>
            <KeyValue label="Email">{user.email}</KeyValue>
          </div>
          <FinePrint>Your profile and plans are saved on this device.</FinePrint>
        </Card>

        <Card className="flex flex-col gap-3">
          <CardHeader title="Your travel notebook" meta="Everything you have planned so far" />
          <div className="divide-y divide-line border-t border-line pt-1">
            <KeyValue label="Trips">{String(owned.trips)}</KeyValue>
            <KeyValue label="Saved places">{String(owned.savedPlaces)}</KeyValue>
            <KeyValue label="Itinerary activities">{String(owned.activities)}</KeyValue>
            <KeyValue label="Packing items">{String(owned.packing)}</KeyValue>
            <KeyValue label="Expenses">{String(owned.expenses)}</KeyValue>
          </div>
          <p className="text-label text-ink-secondary">
            Your trips, favourites and lists are kept together in this account.
          </p>
        </Card>
      </div>

      <details className="tm-card p-5">
        <summary className="tm-focus cursor-pointer text-body font-medium">About storage on this device</summary>
        <div className="mt-4 flex flex-col gap-3">
        <CardHeader
          title="Local storage details"
          meta="localStorage keys written by the data layer"
          action={
            <span className="inline-flex items-center gap-1.5 text-label text-ink-tertiary">
              <Database size={15} strokeWidth={1.75} aria-hidden="true" />
              {Object.keys(STORAGE_KEYS).length} keys
            </span>
          }
        />
        <div className="border-t border-line">
          {Object.entries(STORAGE_KEYS).map(([name, key]) => (
            <Row key={name} className="items-start">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-micro uppercase text-ink-tertiary">{name}</span>
                  <span className="text-body font-medium text-ink">{key}</span>
                </p>
                <p className="mt-0.5 text-label text-ink-secondary">{KEY_NOTES[name] || ''}</p>
              </div>
            </Row>
          ))}
        </div>

        <Notice tone="warning" icon={ShieldAlert}>
          Accounts and per-user isolation are enforced by the data layer, and passwords are stored as PBKDF2-HMAC-SHA256
          hashes rather than text — but localStorage is readable by anyone with access to this browser profile. This
          prototype has no server and no shared storage, so it is not a substitute for server-side authentication.
        </Notice>
        </div>
      </details>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardHeader title="Demo account" meta="Published credentials" />
          <CredentialPanel />
          <p className="text-label text-ink-secondary">
            Use this account to explore a ready-made trip before creating your own.
          </p>
        </Card>

        <Card className="flex flex-col gap-3">
          <CardHeader
            title="Reset sample data"
            meta="Start over with the original sample trip"
            action={<Badge tone="danger">Destructive</Badge>}
          />
          <p className="text-label text-ink-secondary">
            This permanently removes all TravelM accounts and plans saved in this browser, then restores the demo.
            You will be signed out. This cannot be undone.
          </p>

          {confirming ? (
            <div className="flex flex-col gap-2.5 rounded-card border border-danger/25 bg-danger-bg px-3 py-2.5">
              <p className="flex items-start gap-2.5 text-label text-danger" role="alert">
                <AlertTriangle size={15} strokeWidth={1.75} aria-hidden="true" className="mt-px shrink-0" />
                <span>Confirm: reset all stored records and restore the sample data? This cannot be undone.</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" icon={Trash2} onClick={handleReset}>
                  Yes, reset everything
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button variant="dangerOutline" icon={RotateCcw} onClick={() => setConfirming(true)}>
                Reset sample data
              </Button>
            </div>
          )}

          <FinePrint>Sample data — not verified. Resetting does not touch anything outside this browser.</FinePrint>
        </Card>
      </div>
    </div>
  );
}
