/** The maintained catalog shares the app shell and its existing account storage. */
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function DiscoverView() {
  const frame = useRef(null);
  const panelPosition = useRef(null);
  const { search } = useLocation();
  const [height, setHeight] = useState(900);
  const [panelOpen, setPanelOpen] = useState(false);
  useEffect(() => {
    const resize = event => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'travelm:catalog-height' && Number.isFinite(event.data.height)) {
        setHeight(Math.max(400, Math.min(50000, event.data.height)));
      }
      if (event.data?.type === 'travelm:catalog-panel') {
        const open = Boolean(event.data.open);
        if (open && panelPosition.current === null) panelPosition.current = window.scrollY;
        if (!open && panelPosition.current !== null) {
          const position = panelPosition.current;
          panelPosition.current = null;
          requestAnimationFrame(() => window.scrollTo(0, position));
        }
        setPanelOpen(open);
      }
    };
    window.addEventListener('message', resize);
    return () => window.removeEventListener('message', resize);
  }, []);
  const params = new URLSearchParams(search);
  params.set('embedded', '1');
  const sendMapKey = () => frame.current?.contentWindow?.postMessage({
    type: 'travelm:map-config', key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_DEMO_KEY || '',
  }, location.origin);
  return <div style={{ height }}><iframe ref={frame} title="Discover places" className={`tm-discover-frame${panelOpen ? ' tm-discover-frame-panel' : ''}`}
    src={`/catalog/index.html?${params}`} style={{ height: panelOpen ? undefined : height }} onLoad={sendMapKey} /></div>;
}
