/** Bookmarks use the same records and mutation as Discover. */
import { Link } from 'react-router-dom';
import { ArrowUpRight, Compass, MapPinOff, X } from 'lucide-react';
import { PlacePhoto } from '../components/PlacePhoto.jsx';
import { Badge, Card, EmptyState, IconButton } from '../components/ui.jsx';
import { getSavedPlaces } from '../../core/places.js';
import { useData } from '../lib/store.jsx';

export default function SavedPlacesView() {
  const { savedPlaces, places, user, toggleSavedPlace, setStatus } = useData();
  const saved = getSavedPlaces(savedPlaces, places, user ? user.id : null);
  const handleRemove = placeId => {
    const result = toggleSavedPlace(placeId);
    if (!result.ok) setStatus(result.errors?.form || 'Could not remove this place. Please try again.', 'danger');
  };
  const discoverLink = <Link to="/discover" className="tm-action tm-action-primary"><Compass size={17} aria-hidden="true" />Find more places</Link>;
  return <div className="flex flex-col gap-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="tm-eyebrow">Keep the possibilities close</p><h1 className="text-title font-semibold text-ink">Saved places</h1><p className="mt-2 text-body text-ink-secondary" aria-live="polite">{saved.length} {saved.length === 1 ? 'place' : 'places'} for your next adventure · details unverified</p></div>
      {discoverLink}
    </header>
    {saved.length === 0 ? <Card><EmptyState icon={MapPinOff} title="Your next trip starts with a favourite" description="Save a place in Discover and find it here when you’re ready to plan. Your favourites stay in this browser." action={discoverLink} /></Card> : <div className="tm-saved-grid">
      {saved.map(place => <article key={place.id} className="tm-saved-card">
        <PlacePhoto place={place} hero className="tm-feature-photo" />
        <div className="tm-feature-copy">
          <div className="flex items-center justify-between gap-3"><Badge tone="accent">{place.category}</Badge><IconButton icon={X} label={`Remove ${place.name} from saved places`} onClick={() => handleRemove(place.id)} /></div>
          <h2 className="mt-2 text-card-title font-semibold"><Link to={`/discover/${place.id}`} className="tm-focus">{place.name}</Link></h2>
          <p>{place.locality}</p>
          <Link to={`/discover/${place.id}`} className="tm-text-link tm-focus mt-3">View place & plan a visit<ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </article>)}
    </div>}
  </div>;
}
