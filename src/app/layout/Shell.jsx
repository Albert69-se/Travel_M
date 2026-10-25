/**
 * Application shell: navigation rail on wide screens, an icon rail on tablets,
 * and a bottom tab bar on phones — the three layouts named by the design system.
 */
import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Backpack,
  CalendarDays,
  CloudSun,
  Compass,
  Home,
  LogIn,
  LogOut,
  MapPin,
  Receipt,
  Route,
  Sparkles,
  User,
} from 'lucide-react';

import { useData } from '../lib/store.jsx';
import { useFocusTrip } from '../lib/hooks.js';
import { Button } from '../components/ui.jsx';

const PRIMARY = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/saved', label: 'Saved places', icon: MapPin },
  { to: '/trips', label: 'My trips', icon: CalendarDays },
];

function tripLinks(tripId) {
  if (!tripId) return [];
  return [
    { to: `/trips/${tripId}`, label: 'Overview', icon: Sparkles, end: true },
    { to: `/trips/${tripId}/itinerary`, label: 'Itinerary', icon: Route },
    { to: `/trips/${tripId}/packing`, label: 'Packing', icon: Backpack },
    { to: `/trips/${tripId}/expenses`, label: 'Expenses', icon: Receipt },
    { to: `/trips/${tripId}/weather`, label: 'Weather', icon: CloudSun },
  ];
}

function initialsOf(name) {
  if (typeof name !== 'string' || name.trim() === '') return 'TM';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function NavRow({ to, label, icon: Icon, end = false, compact = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `tm-focus group relative flex items-center rounded-control transition-colors ${
          compact ? 'justify-center px-0' : 'gap-2.5 px-2.5'
        } h-[44px] text-body font-medium ${
          isActive ? 'bg-tint text-accent' : 'text-ink-secondary hover:bg-canvas hover:text-ink'
        }`
      }
      title={label}
    >
      {({ isActive }) => (
        <>
          {isActive && !compact ? (
            <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-accent" aria-hidden="true" />
          ) : null}
          <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
          {compact ? null : <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

function Brand({ compact = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${compact ? 'justify-center' : 'px-2.5'}`}>
      <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-accent text-white">
        <Compass size={15} strokeWidth={2} aria-hidden="true" />
      </span>
      {compact ? null : (
        <span className="min-w-0">
          <span className="block truncate text-card-title font-semibold text-ink">Travel M</span>
          <span className="block truncate text-micro uppercase text-ink-tertiary">Trip planner</span>
        </span>
      )}
    </div>
  );
}

function UserCard({ user, onSignOut }) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-chip bg-tint text-micro font-semibold text-accent">
          {initialsOf(user.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-label font-medium text-ink">{user.name}</span>
          <span className="block truncate text-micro text-ink-tertiary">{user.email}</span>
        </span>
      </div>
      <Button variant="ghost" size="sm" icon={LogOut} className="justify-start" onClick={onSignOut}>
        Sign out
      </Button>
    </div>
  );
}

const STATUS_STYLES = {
  info: 'border-line bg-surface text-ink-secondary',
  success: 'border-success/25 bg-surface text-success',
  danger: 'border-danger/25 bg-surface text-danger',
};

function StatusToast() {
  const { status, setStatus } = useData();

  useEffect(() => {
    if (!status) return undefined;
    const timer = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(timer);
  }, [status, setStatus]);

  if (!status) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-[64px] left-4 right-4 z-40 rounded-card border px-3 py-2 text-label shadow-popover md:bottom-4 md:left-auto md:right-6 md:max-w-sm ${
        STATUS_STYLES[status.tone] || STATUS_STYLES.info
      }`}
    >
      {status.message}
    </div>
  );
}

export default function Shell() {
  const { user, signOut, ready } = useData();
  const focusTrip = useFocusTrip();
  const navigate = useNavigate();
  const links = tripLinks(focusTrip ? focusTrip.id : null);

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#view"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-body focus:shadow-popover"
      >
        Skip to main content
      </a>

      {/* Rail — full on wide screens, icons only on tablets. */}
      <aside className="tm-shell-rail fixed inset-y-0 left-0 z-30 hidden w-[64px] flex-col border-r border-line bg-surface px-2 py-3 md:flex lg:w-[228px] lg:px-2.5">
        <div className="lg:hidden">
          <Brand compact />
        </div>
        <div className="hidden lg:block">
          <Brand />
        </div>

        <nav aria-label="Main" className="mt-5 flex flex-col gap-1">
          {PRIMARY.map((item) => (
            <span key={item.to} className="lg:contents">
              <span className="block lg:hidden">
                <NavRow {...item} compact />
              </span>
              <span className="hidden lg:block">
                <NavRow {...item} />
              </span>
            </span>
          ))}
        </nav>

        {links.length > 0 ? (
          <>
            <p className="mt-5 mb-1.5 hidden px-2.5 text-micro font-medium uppercase text-ink-tertiary lg:block">
              Trip
            </p>
            <p className="mt-4 mb-1.5 hidden text-center text-micro uppercase text-ink-tertiary lg:hidden" aria-hidden="true">
              ·
            </p>
            <nav aria-label="Trip" className="flex flex-col gap-1">
              {links.map((item) => (
                <span key={item.to} className="lg:contents">
                  <span className="block lg:hidden">
                    <NavRow {...item} compact />
                  </span>
                  <span className="hidden lg:block">
                    <NavRow {...item} />
                  </span>
                </span>
              ))}
            </nav>
          </>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <div className="lg:hidden">
            {user ? (
              <NavRow to="/account" label="Account" icon={User} compact />
            ) : (
              <NavRow to="/signin" label="Sign in" icon={LogIn} compact />
            )}
          </div>
          <div className="hidden lg:block">
            {user ? (
              <UserCard user={user} onSignOut={handleSignOut} />
            ) : (
              <div className="rounded-card border border-line bg-canvas p-2.5">
                <p className="text-label text-ink-secondary">Browsing as a guest.</p>
                <Button variant="primary" size="sm" icon={LogIn} className="mt-2 w-full" onClick={() => navigate('/signin')}>
                  Sign in
                </Button>
              </div>
            )}
          </div>
          <p className="hidden text-center text-micro uppercase text-ink-tertiary lg:block">Prototype · local data</p>
        </div>
      </aside>

      {/* Compact top bar for phones. */}
      <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between gap-3 border-b border-line bg-surface px-4 md:hidden">
        <Brand />
        {user ? (
          <span className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-chip bg-tint text-micro font-semibold text-accent">
              {initialsOf(user.name)}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="tm-focus rounded-control px-2 py-1 text-label font-medium text-ink-secondary"
            >
              Sign out
            </button>
          </span>
        ) : (
          <Button variant="primary" size="sm" icon={LogIn} onClick={() => navigate('/signin')}>
            Sign in
          </Button>
        )}
      </header>

      <div className="md:pl-[64px] lg:pl-[228px]">
        <div className="tm-shell-top"><span>Your next chapter starts here.</span><span>Thailand travel companion · Prototype</span></div>
        <main id="view" tabIndex={-1} className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-5 md:px-6 md:pb-10 md:pt-6">
          {ready ? (
            <Outlet />
          ) : (
            <p className="text-body text-ink-secondary" role="status">
              Preparing sample data…
            </p>
          )}
        </main>

        <footer className="mx-auto w-full max-w-[1440px] px-4 pb-20 md:px-6 md:pb-8">
          <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-4 text-label text-ink-secondary">
            <p>Made for a little more exploring.</p>
            <p>Prototype · saved in this browser · destination details unverified</p>
          </div>
        </footer>
      </div>

      {/* Bottom tab bar for phones. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[52px] items-stretch border-t border-line bg-surface md:hidden"
      >
        {[
          { to: '/', label: 'Home', icon: Home, end: true },
          { to: '/discover', label: 'Discover', icon: Compass },
          { to: '/saved', label: 'Saved', icon: MapPin },
          { to: '/trips', label: 'Trips', icon: CalendarDays },
          { to: user ? '/account' : '/signin', label: user ? 'Account' : 'Sign in', icon: user ? User : LogIn },
        ].map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `tm-focus flex flex-1 flex-col items-center justify-center gap-0.5 text-micro font-medium ${
                isActive ? 'text-accent' : 'text-ink-tertiary'
              }`
            }
          >
            <item.icon size={17} strokeWidth={1.75} aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <StatusToast />
    </div>
  );
}
