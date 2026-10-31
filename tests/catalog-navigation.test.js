import test from 'node:test';
import assert from 'node:assert/strict';
import { filtersFromSearch } from '../public/catalog/catalog-navigation.mjs';
import { searchCatalog } from '../public/catalog/catalog-core.mjs';

test('home search and regional links produce matching catalog filters', () => {
  const filters = filtersFromSearch('?q=White%20Temple&province=Chiang%20Rai%20Province&category=Culture&embedded=1');
  assert.deepEqual(filters, { query: 'White Temple', province: 'Chiang Rai Province', category: 'Culture' });
  const places = [
    { id: '1', name: 'White Temple', administrativeArea: 'Chiang Rai Province', category: 'Culture' },
    { id: '2', name: 'White Temple', administrativeArea: 'Chiang Mai Province', category: 'Culture' },
  ];
  assert.deepEqual(searchCatalog(places, filters).map(place => place.id), ['1']);
});
test('invalid shared filters do not leave the catalog in an impossible state', () => {
  assert.deepEqual(filtersFromSearch('?province=Bangkok&category=Unknown&q=%20%20'), { query: '', province: 'All', category: 'All' });
  assert.equal(filtersFromSearch('?q=' + 'a'.repeat(500)).query.length, 200);
  assert.deepEqual(filtersFromSearch(''), { query: '', province: 'All', category: 'All' });
});
