/** Only known filter values may enter the catalog from a shared link. */
export function filtersFromSearch(search) {
  const params = new URLSearchParams(search);
  const province = params.get('province');
  const category = params.get('category');
  return {
    query: (params.get('q') || '').trim().slice(0, 200),
    province: ['Chiang Mai Province', 'Chiang Rai Province'].includes(province) ? province : 'All',
    category: ['Culture', 'Nature', 'Food'].includes(category) ? category : 'All',
  };
}
