import { Landmark, Leaf, MapPin, UtensilsCrossed } from 'lucide-react';

/**
 * The generated category tile, kept as the fallback for records with no
 * photograph and for hotlinked images that fail to load (see `PlacePhoto`, the
 * primary). Drawn from the category rather than faked with a photograph, so a
 * place without an image still keeps a stable visual identity and the same tile
 * appears in the list, the map popup and its details page.
 */
const CATEGORY_ICON = {
  Culture: Landmark,
  Nature: Leaf,
  Food: UtensilsCrossed,
};

const CATEGORY_TONE = {
  Culture: 'bg-tint text-accent',
  Nature: 'bg-success-bg text-success',
  Food: 'bg-warning-bg text-warning',
};

export function PlaceThumb({ place, size = 56, className = '' }) {
  const Icon = CATEGORY_ICON[place.category] || MapPin;
  const tone = CATEGORY_TONE[place.category] || 'bg-canvas text-ink-tertiary';

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-control ${tone} ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.42)} strokeWidth={1.6} />
    </span>
  );
}

export default PlaceThumb;
