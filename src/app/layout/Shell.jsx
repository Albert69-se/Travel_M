/** Shared navigation and route focus for the TravelM workspace. */
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Compass, Home, LogIn, LogOut, MapPin, Plus, User } from 'lucide-react';
import { useData } from '../lib/store.jsx';
import { useFocusTrip } from '../lib/hooks.js';
import RequirementGuide from '../components/RequirementGuide.jsx';

const PRIMARY = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/saved', label: 'Saved places', icon: MapPin },
  { to: '/trips', label: 'My trips', icon: CalendarDays },
];
function initialsOf(name) {
  return (name || 'Travel M').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}
function Brand() {
  return <Link to="/" className="tm-brand tm-focus" aria-label="TravelM home"><Compass size={28} strokeWidth={1.5} /><span className="tm-wordmark">Travel<span>M</span></span></Link>;
}
function NavRow({ to, label, icon: Icon, end }) {
  return <NavLink to={to} end={end} title={label} aria-label={label} className={({ isActive }) => `tm-rail-link tm-focus${isActive ? ' is-active' : ''}`}>
    <Icon size={20} strokeWidth={1.65} aria-hidden="true" /><span>{label}</span>
  </NavLink>;
}
function StatusToast() {
  const { status, setStatus } = useData();
  useEffect(() => {
    if (!status) return undefined;
    const timer = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(timer);
  }, [status, setStatus]);
  return status ? <div role="status" aria-live="polite" className={`tm-toast tm-toast-${status.tone || 'info'}`}>{status.message}</div> : null;
}
export default function Shell() {
  const [showRequirements, setShowRequirements] = useState(false);
  const { user, signOut, ready } = useData();
  const focusTrip = useFocusTrip();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const section = pathname.startsWith('/discover') ? 'Discover' : pathname.startsWith('/trips') ? 'My trips' : pathname.startsWith('/saved') ? 'Saved places' : pathname.startsWith('/account') ? 'Your account' : pathname.startsWith('/signin') ? 'Sign in' : pathname.startsWith('/register') ? 'Create account' : 'Home';
  useEffect(() => {
    document.title = `${section} · TravelM`;
    if (navigationType === 'POP') return;
    document.getElementById('view')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname, navigationType, section]);
  const handleSignOut = () => { signOut(); navigate('/'); };
  return <div className="tm-app">
    <a href="#view" className="tm-skip">Skip to main content</a>
    <aside className="tm-shell-rail">
      <Brand />
      <p className="tm-rail-caption">A little further from ordinary.</p>
      <p className="tm-nav-label">Your workspace</p>
      <nav aria-label="Main" className="tm-primary-nav">{PRIMARY.map(item => <NavRow key={item.to} {...item} />)}</nav>
      {focusTrip ? <Link to={`/trips/${focusTrip.id}`} className="tm-trip-shortcut tm-focus">
        <span className="tm-eyebrow">Continue planning <ArrowUpRight size={15} /></span>
        <strong>{focusTrip.name}</strong><span>{focusTrip.destinationLabel}</span>
      </Link> : <div className="tm-rail-note"><Compass size={28} strokeWidth={1} /><p>Find a place.<br />Make it a plan.</p><Link to="/discover" className="tm-focus">Start exploring <ArrowUpRight size={14} /></Link></div>}
      <div className="tm-rail-account">
        <NavRow to={user ? '/account' : '/signin'} label={user ? 'Account' : 'Sign in'} icon={user ? User : LogIn} />
        {user && <div className="tm-user-line"><span className="tm-avatar">{initialsOf(user.name)}</span><span>{user.name}</span><button type="button" className="tm-focus" aria-label="Sign out" title="Sign out" onClick={handleSignOut}><LogOut size={17} /></button></div>}
        <p className="tm-local-note">Local prototype · saved in this browser</p>
      </div>
    </aside>
    <header className="tm-mobile-header"><Brand /><Link className="tm-focus tm-mobile-account" to={user ? '/account' : '/signin'}>{user ? <><span className="tm-avatar">{initialsOf(user.name)}</span><span className="sr-only">Account</span></> : 'Sign in'}</Link></header>
    <div className="tm-shell-content">
      <header className="tm-shell-top"><div><span>YOUR TRAVEL NOTEBOOK</span><strong>{section}</strong></div><Link to="/trips?new=1" className="tm-action tm-action-primary"><Plus size={16} aria-hidden="true" /> Plan a trip</Link></header>
      <main id="view" tabIndex={-1} className={`tm-main${showRequirements ? ' tm-fr-debug' : ''}`}>{showRequirements && <RequirementGuide pathname={pathname} onClose={() => setShowRequirements(false)} />}{ready ? <Outlet context={{ showRequirements }} /> : <p role="status" className="text-ink-secondary">Preparing your workspace…</p>}</main>
      <footer className="tm-footer"><span>Leave room for a little discovery.</span><span>Local prototype · destination details unverified</span><button type="button" className="tm-fr-toggle tm-focus" aria-pressed={showRequirements} onClick={() => setShowRequirements(value => !value)}>{showRequirements ? 'Debug mode on' : 'Show FR debug mode'}</button></footer>
    </div>
    <nav aria-label="Main" className="tm-bottom-nav">{[...PRIMARY.map(item => ({ ...item, label: item.to === '/saved' ? 'Saved' : item.to === '/trips' ? 'Trips' : item.label })), { to: user ? '/account' : '/signin', label: user ? 'Account' : 'Sign in', icon: User }].map(({ icon: Icon, ...item }) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `tm-focus${isActive ? ' is-active' : ''}`}><Icon size={20} strokeWidth={1.7} aria-hidden="true" /><span>{item.label}</span></NavLink>)}</nav>
    <StatusToast />
  </div>;
}
