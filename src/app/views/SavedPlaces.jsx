/**
 * Saved places — the records this account bookmarked.
 *
 * The route is already guarded, so the view only has to turn saved links back
 * into place records (`getSavedPlaces`) and offer a way out of each one. The
 * removal control calls the same store function as the bookmark on Discover, so
 * both screens always agree on what is saved.
 */
import { Link, useNavigate } from 'react-router-dom';
import { Compass, MapPinOff, X } from 'lucide-react';

import { PlacePhoto } from '../components/PlacePhoto.jsx';
import { Badge, Button, Card, EmptyState, FinePrint, IconButton, Row } from '../components/ui.jsx';
import { getSavedPlaces } from '../../core/places.js';
import { useData } from '../lib/store.jsx';

function DiscoverLink() {
  return (
    <Link
      to="/discover"
      className="tm-focus inline-flex h-[34px] items-center justify-center gap-1.5 rounded-control bg-accent px-3 text-body font-medium whitespace-nowrap text-white transition-colors hover:bg-accent-hover active:bg-accent-active"
    >
      <Compass size={15} strokeWidth={1.75} aria-hidden="true" />
      Discover places
    </Link>
  );
}

export default function SavedPlacesView() {
  const navigate = useNavigate();
  const { savedPlaces, places, user, toggleSavedPlace, setStatus } = useData();

  const saved = getSavedPlaces(savedPlaces, places, user ? user.id : null);
  const count = saved.length;

  const handleRemove = (placeId) => {
    const result = toggleSavedPlace(placeId);
    if (result.ok) return;
    const message = result.errors && result.errors.form ? result.errors.form : 'That change could not be saved.';
    setStatus(message, 'danger');
  };

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-ink">Saved places</h1>
          <p className="mt-1 text-body text-ink-secondary">
            <span className="tm-numeric">{count}</span> saved {count === 1 ? 'place' : 'places'}
          </p>
          <FinePrint className="mt-1">Sample data — not verified</FinePrint>
        </div>

        <Button variant="secondary" icon={Compass} onClick={() => navigate('/discover')}>
          Find more places
        </Button>
      </header>

      <Card padded={false} className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <p className="text-label font-medium text-ink">Records saved by this account</p>
          <p className="text-label text-ink-tertiary tm-numeric" aria-live="polite">
            {count} in total
          </p>
        </div>

        {count === 0 ? (
          <EmptyState
            icon={MapPinOff}
            title="No saved places yet"
            description="A saved place is stored against your account, so it stays here after you sign out and back in. Bookmark one on Discover to start the list."
            action={<DiscoverLink />}
          />
        ) : (
          <div className="max-h-[560px] overflow-y-auto tm-scroll">
            {saved.map((place) => (
              <Row key={place.id} className="py-2.5">
                <PlacePhoto place={place} size={32} />

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link
                      to={`/discover/${place.id}`}
                      className="tm-focus min-w-0 truncate rounded-[4px] text-card-title font-semibold text-ink hover:text-accent"
                    >
                      {place.name}
                    </Link>
                    <Badge tone="accent">{place.category}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-label text-ink-tertiary">{place.locality}</p>
                </div>

                <Link
                  to={`/discover/${place.id}`}
                  className="tm-focus shrink-0 rounded-control px-1.5 py-1 text-label font-medium text-accent hover:underline"
                >
                  View
                </Link>

                <IconButton
                  icon={X}
                  label={`Remove ${place.name} from saved places`}
                  size={34}
                  onClick={() => handleRemove(place.id)}
                />
              </Row>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
