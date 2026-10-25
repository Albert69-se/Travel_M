import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, Navigation } from 'lucide-react';
import { requestLocation } from '../../core/location.js';
import { describeProvider, mountMap } from '../../core/map.js';
import { googleMapsDemoEnabled, mountGoogleDemoMap } from '../lib/google-map.js';

/** Owns exactly one map instance; late async providers cannot reuse a retired host. */
export function MapPanel({ places, subject = 'place', onOpenPlace, selectedPlace, className = '', heightClass = 'h-[560px]' }) {
  const containerRef = useRef(null);
  const controller = useRef(null);
  const position = useRef(null);
  const [locationState, setLocationState] = useState({ busy: false, message: '' });
  const locationRequest = useRef(0);
  useEffect(() => () => { locationRequest.current += 1; }, []);
  const locate = () => {
    const request = ++locationRequest.current;
    setLocationState({ busy: true, message: 'Allow location access in your browser to see where you are.' });
    requestLocation(navigator.geolocation, window.isSecureContext).then(point => {
      if (request !== locationRequest.current) return;
      position.current = point;
      controller.current?.showLocation?.(point, true);
      setLocationState({ busy: false, message: `Your location · accurate to about ${Math.round(point.accuracy)} m. Not saved.` });
    }, error => {
      if (request !== locationRequest.current) return;
      setLocationState({ busy: false, message: error.message });
    });
  };
  const callbacks = useRef({ onOpenPlace, selectedPlace });
  const [state, setState] = useState({ loading: true, reason: '', provider: '' });
  const [markerInfo, setMarkerInfo] = useState({ count: 0, total: 0 });
  const key = JSON.stringify((places || []).map(p => [p.id, p.latitude, p.longitude, p.name, p.category, p.locality]));

  useEffect(() => {
    callbacks.current = { onOpenPlace, selectedPlace };
  }, [onOpenPlace, selectedPlace]);
  useEffect(() => {
    if (selectedPlace) controller.current?.focusPlace?.(selectedPlace);
  }, [selectedPlace]);

  useEffect(() => {
    const node = containerRef.current;
    // A unique child also protects against React StrictMode effect replays.
    const host = document.createElement('div');
    host.className = 'h-full w-full';
    node.replaceChildren(host);
    let cancelled = false;
    let fellBack = false;
    let cleanup;
    const show = (result, provider) => {
      if (cancelled) { result.cleanup?.(); return; }
      controller.current = result.ok ? result : null;
      if (!result.ok) setMarkerInfo({count: 0, total: 0});
      cleanup = result.cleanup;
      if (result.ok && position.current) result.showLocation?.(position.current, false);
      setState({ loading: false, reason: result.ok ? '' : result.reason, provider });
      if (result.ok && callbacks.current.selectedPlace) result.focusPlace?.(callbacks.current.selectedPlace);
    };
    const onMarkerChange = info => { if (!cancelled) setMarkerInfo(info); };
    const fallback = () => {
      if (cancelled || fellBack) return;
      fellBack = true;
      cleanup?.();
      host.replaceChildren();
      show(mountMap(host, places || [], { subject, context: subject, onMarkerChange }), describeProvider().provider);
    };
    if (googleMapsDemoEnabled()) {
      window.addEventListener('travelm:google-auth-failure', fallback);
      mountGoogleDemoMap(host, places || [], id => callbacks.current.onOpenPlace?.(id), onMarkerChange, () => cancelled || fellBack)
        .then(result => {
          if (cancelled || fellBack) { result.cleanup?.(); return; }
          if (result.ok) show(result, 'Google Maps'); else fallback();
        }).catch(fallback);
    } else fallback();
    const click = event => {
      const trigger = event.target.closest('[data-action="place:view"]');
      if (trigger) callbacks.current.onOpenPlace?.(trigger.dataset.placeId);
    };
    node.addEventListener('click', click);
    return () => {
      cancelled = true;
      window.removeEventListener('travelm:google-auth-failure', fallback);
      node.removeEventListener('click', click);
      cleanup?.();
      controller.current = null;
      host.remove();
    };
    // Coordinate/content signature prevents remounting on unrelated store updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, subject]);

  return (
    <section className={`tm-map-panel ${className}`} aria-label="Destination map">
      <div className="tm-map-heading">
        <span><MapPin size={16} aria-hidden="true" /> Explore the area</span>
        <button type="button" className="tm-focus tm-map-reset" onClick={() => controller.current?.fitResults?.()} aria-label="Fit all results on map">
          <LocateFixed size={16} aria-hidden="true" /> All results
        </button>
      </div>
      <div className="tm-location-toolbar">
        <button type="button" className="tm-focus tm-locate-button" onClick={locate} disabled={locationState.busy}><Navigation size={14} aria-hidden="true" />{locationState.busy ? 'Locating…' : 'Use my location'}</button>
        <span role="status">{locationState.message || 'With your permission, show your position on the map.'}</span>
      </div>
      <div className={`relative overflow-hidden ${heightClass}`}>
        <div ref={containerRef} role="region" aria-label={places?.length === 1 ? 'Map of this place' : 'Map of these places'} className="h-full w-full" />
        {state.reason || state.loading ? <div className="tm-map-message" role="status"><MapPin size={24} /><p>{state.reason || 'Finding your next destination…'}</p></div> : null}
      </div>
      <div className="tm-map-caption" aria-live="polite">
        <span className="tm-map-dot" />
        <span>{markerInfo.grouped ? `${markerInfo.total} places · select a group to explore` : `${markerInfo.count} of ${markerInfo.total} places in view`}</span>
        <span className="ml-auto">{state.provider}</span>
      </div>
    </section>
  );
}
