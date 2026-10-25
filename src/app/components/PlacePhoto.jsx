import { useEffect, useRef, useState } from 'react';

import { PlaceThumb } from './PlaceThumb.jsx';
import { fetchGooglePlacePhoto, hasGooglePlacePhotos } from '../lib/google-photos.js';
import { fetchCommonsPhoto } from '../lib/commons-photo.js';

/**
 * Near-viewport photos come from licensed Google Places when available, or a
 * strictly matched Wikipedia/Commons article without requiring GCP billing.
 * Source and author attribution always travel with the chosen image.
 */
export function PlacePhoto({ place, size = 56, className = '', hero = false }) {
  const rootRef = useRef(null);
  const [imageResult, setImageResult] = useState(null);
  const [brokenSource, setBrokenSource] = useState('');
  const id = place?.id || '';
  const result = imageResult?.id === id ? imageResult.photo : null;

  useEffect(() => {
    if (!id || (!hasGooglePlacePhotos() && place?.image)) return undefined;
    let cancelled = false;
    const host = rootRef.current;
    if (!host) return undefined;

    const lookup = () => {
      (hasGooglePlacePhotos()
        ? fetchGooglePlacePhoto(place, hero ? 1280 : Math.max(180, size * 3)).catch(() => null)
        : Promise.resolve(null))
        .then((photo) => photo || (place.image ? null : fetchCommonsPhoto(place)))
        .then((photo) => {
          if (!cancelled) setImageResult({ id, photo });
        })
        .catch(() => {
          // No broken image icons and no false claim that a photo was found.
          if (!cancelled) setImageResult({ id, photo: null });
        });
    };

    if (typeof IntersectionObserver === 'undefined') {
      lookup();
      return () => { cancelled = true; };
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        lookup();
      }
    }, { rootMargin: '120px' });
    observer.observe(host);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // The original place object is immutable for a stable place ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hero, size]);

  const fallback = place?.image || null;
  const src = result?.src || (hero ? fallback?.large : fallback?.thumb);
  const commonsPhoto = result?.provider === 'Wikimedia Commons';
  const googlePhoto = Boolean(result?.src) && !commonsPhoto;
  const usable = src && brokenSource !== src;

  if (hero) {
    return (
      <div ref={rootRef} className={className}>
        {usable ? (
          <img
            src={src}
            alt={`${place.name}, ${place.locality}`}
            className="block aspect-[16/9] w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setBrokenSource(src)}
          />
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center bg-canvas px-4 text-center text-body text-ink-tertiary">
            Place photo unavailable — no confidently matched licensed image
          </div>
        )}
        {usable ? (
          <div className="border-t border-line px-4 py-2.5 text-label text-ink-secondary">
            {commonsPhoto ? (
              <>
                Photo: {result.credit} · {result.licence}
                {' · '}<a href={result.source} className="underline" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>
              </>
            ) : googlePhoto ? (
              <>
                Photo from Google Maps
                {result.authors.length ? ' · Photo by ' : ''}
                {result.authors.map((author, index) => (
                  <span key={index}>
                    {index ? ', ' : ''}
                    {author.uri?.startsWith('https://') ? (
                      <a href={author.uri} className="underline" target="_blank" rel="noopener noreferrer">{author.name}</a>
                    ) : author.name}
                  </span>
                ))}
                {result.mapsUri?.startsWith('https://') ? (
                  <> · <a href={result.mapsUri} className="underline" target="_blank" rel="noopener noreferrer">View on Google Maps</a></>
                ) : null}
              </>
            ) : (
              <>
                Photo: {fallback?.credit || 'Contributor'} · {fallback?.licence || 'Licence not listed'}
                {fallback?.source?.startsWith('https://') ? (
                  <> · <a href={fallback.source} className="underline" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <span
      ref={rootRef}
      className={`relative block shrink-0 overflow-hidden rounded-control bg-canvas ${className}`}
      style={{ width: size, height: size }}
    >
      {usable ? (
        <img
          src={src}
          alt={`${place?.name || 'Place'}, ${place?.locality || 'Thailand'}`}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setBrokenSource(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <PlaceThumb place={place} size={size} className="h-full w-full" />
      )}
      {commonsPhoto && usable ? (
        <a href={result.source} target="_blank" rel="noopener noreferrer"
          title={`Photo: ${result.credit} · ${result.licence}`}
          className="absolute inset-x-0 bottom-0 block truncate bg-black/65 px-0.5 text-center text-[10px] leading-tight text-white underline"
        >{result.credit} · {result.licence}</a>
      ) : googlePhoto && usable && result.authors.length ? (
        <span
          className="absolute inset-x-0 bottom-0 block truncate bg-black/65 px-0.5 py-0.5 text-center text-[10px] leading-tight text-white"
        >
          {result.authors[0].uri?.startsWith('https://') ? (
            <a
              href={result.authors[0].uri}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              title={`Photo: ${result.authors.map((author) => author.name).join(', ')}`}
            >
              {result.authors.map((author) => author.name).join(', ')}
            </a>
          ) : result.authors.map((author) => author.name).join(', ')}
        </span>
      ) : null}
    </span>
  );
}

export default PlacePhoto;
