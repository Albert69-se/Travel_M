import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, Navigation } from 'lucide-react';
import { watchLocation } from '../../core/location.js';
import { mountGoogleDemoMap } from '../lib/google-map.js';

/** Owns exactly one map instance; late async providers cannot reuse a retired host. */
export function MapPanel({ places, subject = 'place', onOpenPlace, selectedPlace, className = '', heightClass = 'h-[560px]' }) {
  const containerRef = useRef(null);
  const controller = useRef(null);
  const position = useRef(null);
  const [locationState, setLocationState] = useState({ busy: false, active: false, message: '' });
  const stopWatch = useRef(null);
  const centerLocation = useRef(false);
  useEffect(() => () => { stopWatch.current?.(); }, []);
  const stopLocation = () => {
    stopWatch.current?.();
    stopWatch.current = null;
    position.current = null;
    centerLocation.current = false;
    controller.current?.clearLocation?.();
    setLocationState({ busy: false, active: false, message: 'Location stopped. Your position was not saved.' });
  };
  const locate = () => {
    if (position.current && locationState.active) {
      centerLocation.current = true;
      if (controller.current) {
        controller.current.showLocation(position.current, true);
        centerLocation.current = false;
      }
      return;
    }
    stopWatch.current?.();
    centerLocation.current = true;
    setLocationState({ busy: true, active: true, message: 'Allow location access in your browser to see where you are.' });
    stopWatch.current = watchLocation(navigator.geolocation, window.isSecureContext, point => {
      position.current = point;
      if (controller.current) {
        controller.current.showLocation(point, centerLocation.current);
        centerLocation.current = false;
      }
      setLocationState({ busy: false, active: true, message: `Live location · accurate to about ${Math.round(point.accuracy)} m. Not saved.` });
    }, (error, recovering = false) => {
      position.current = null;
      centerLocation.current = recovering;
      controller.current?.clearLocation?.();
      setLocationState({ busy: false, active: recovering, message: recovering ? `${error.message} Waiting for a new fix.` : error.message });
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
    let authFailed = false;
    let cleanup;
    const show = (result, provider) => {
      if (cancelled) { result.cleanup?.(); return; }
      controller.current = result.ok ? result : null;
      if (!result.ok) setMarkerInfo({count: 0, total: 0});
      cleanup = result.cleanup;
      const locating = centerLocation.current;
      if (result.ok && position.current) {
        result.showLocation?.(position.current, centerLocation.current || !callbacks.current.selectedPlace);
        centerLocation.current = false;
      }
      setState({ loading: false, reason: result.ok ? '' : result.reason, provider });
      if (result.ok && !locating && callbacks.current.selectedPlace) result.focusPlace?.(callbacks.current.selectedPlace);
    };
    const onMarkerChange = info => { if (!cancelled) setMarkerInfo(info); };
    const unavailable = () => {
      if (cancelled) return;
      authFailed = true;
      cleanup?.();
      show({ ok: false, reason: 'Google Maps is unavailable. Check your connection and Google API access, then reload.' }, 'Google Maps');
    };
    window.addEventListener('travelm:google-auth-failure', unavailable);
    mountGoogleDemoMap(host, places || [], id => callbacks.current.onOpenPlace?.(id), onMarkerChange, () => cancelled || authFailed)
      .then(result => { if (authFailed) { result.cleanup?.(); return; } show(result, 'Google Maps'); }).catch(unavailable);
    const click = event => {
      const trigger = event.target.closest('[data-action="place:view"]');
      if (trigger) callbacks.current.onOpenPlace?.(trigger.dataset.placeId);
    };
    node.addEventListener('click', click);
    return () => {
      cancelled = true;
      window.removeEventListener('travelm:google-auth-failure', unavailable);
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
        <button type="button" className="tm-focus tm-locate-button" onClick={locate} disabled={locationState.busy}><Navigation size={14} aria-hidden="true" />{locationState.busy ? 'Locating…' : locationState.active ? (position.current ? 'Recenter on me' : 'Retry location') : 'Use my location'}</button>
        {locationState.active ? <button type="button" className="tm-focus tm-locate-button" onClick={stopLocation}>Stop location</button> : null}
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
