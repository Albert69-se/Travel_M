/** Compact source attribution for Places content, including map-hidden mobile lists. */
export function GoogleAttribution({ place }) {
  if (!place?.googlePlaceId) return null;
  return <p className="mt-1 text-micro text-ink-secondary">
    <span className="font-medium">Google Maps</span>
    {(place.attributions || []).map((item, index) => <span key={index}> · {/^https?:\/\//.test(item.providerURI || '')
      ? <a href={item.providerURI} target="_blank" rel="noreferrer" className="tm-focus underline">{item.provider}</a>
      : item.provider}</span>)}
  </p>;
}
