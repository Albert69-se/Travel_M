/** Google Places normalization/search rules. API content is never persisted. */
export const CATALOG_TARGET = 200;
export const GOOGLE_PLACE_FIELDS = ['id', 'displayName', 'location', 'addressComponents', 'formattedAddress', 'types', 'attributions', 'googleMapsURI', 'businessStatus'];
// Spread discovery across the country, with bounded additional queries if IDs overlap.
export const DISCOVERY_REGIONS = [
  'Bangkok', 'Chiang Mai', 'Phuket', 'Chiang Rai', 'Krabi', 'Ayutthaya',
  'Kanchanaburi', 'Chonburi', 'Surat Thani', 'Nakhon Ratchasima', 'Sukhothai',
  'Prachuap Khiri Khan', 'Nan', 'Loei', 'Ubon Ratchathani', 'Phang Nga',
  'Trat', 'Songkhla', 'Phetchaburi', 'Lampang', 'Udon Thani', 'Trang',
];

export function normalizeGooglePlace(place) {
  const components = place.addressComponents || [];
  const component = type => components.find(part => part.types?.includes(type));
  const country = component('country')?.shortText;
  const latitude = typeof place.location?.lat === 'function' ? place.location.lat() : place.location?.lat;
  const longitude = typeof place.location?.lng === 'function' ? place.location.lng() : place.location?.lng;
  if (!place.id || !place.displayName || country !== 'TH' ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < 5 || latitude > 21 || longitude < 97 || longitude > 107 ||
      place.businessStatus === 'CLOSED_PERMANENTLY') return null;
  const types = place.types || [];
  const category = types.some(type => ['national_park', 'park', 'beach', 'botanical_garden', 'garden', 'hiking_area', 'waterfall', 'natural_feature', 'zoo', 'aquarium'].includes(type))
    ? 'Nature' : types.some(type => ['market', 'food', 'restaurant'].includes(type)) ? 'Food' : 'Culture';
  const administrativeArea = (component('administrative_area_level_1')?.longText || '').replace(/ Province$/, '');
  return {
    id: `google-${place.id}`, googlePlaceId: place.id,
    name: place.displayName,
    locality: component('locality')?.longText || component('administrative_area_level_2')?.longText || administrativeArea,
    administrativeArea, countryCode: 'TH', category, latitude, longitude,
    description: place.formattedAddress || `${place.displayName}, Thailand`,
    estimatedCost: null, estimatedCostNote: 'Entrance fee not supplied; check before visiting.',
    sourceReference: 'Google Maps · Places API', lastCheckedAt: null, contentStatus: 'imported',
    googleMapsURI: place.googleMapsURI,
    attributions: (place.attributions || []).map(item => ({ provider: item.provider, providerURI: item.providerURI })),
  };
}

export async function discoverGooglePlaces(Place, onProgress = () => {}) {
  const records = new Map();
  let failed = false;
  for (const region of DISCOVERY_REGIONS) {
    try {
      const { places = [] } = await Place.searchByText({
        textQuery: `tourist attractions in ${region}, Thailand`,
        fields: GOOGLE_PLACE_FIELDS, includedType: 'tourist_attraction', useStrictTypeFiltering: true,
        language: 'en', region: 'th', maxResultCount: 20,
      });
      for (const place of places) {
        const record = normalizeGooglePlace(place);
        if (record) records.set(record.id, record);
        if (records.size >= CATALOG_TARGET) break;
      }
      onProgress([...records.values()]);
      if (records.size >= CATALOG_TARGET) break;
    } catch {
      // Avoid repeated billed requests after an authorization/quota/network failure.
      failed = true;
      break;
    }
  }
  const places = [...records.values()];
  const complete = places.length >= CATALOG_TARGET;
  return {
    status: complete ? 'ok' : places.length ? 'partial' : 'error', places,
    meta: { title: 'Thailand attractions from Google Maps', target: CATALOG_TARGET },
    message: complete ? '' : failed
      ? `Google Places could not finish loading (${places.length}/${CATALOG_TARGET}). Check API access, billing, quota and connection, then retry.`
      : `Google Places returned ${places.length} distinct attractions; the prototype target is ${CATALOG_TARGET}. Try again later.`,
  };
}
