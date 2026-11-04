import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchCommonsPhoto } from '../public/catalog/photo-source.mjs';

test('Commons fallback accepts a named, province-matched credited photo and rejects a neighbouring temple', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url) === '/data/catalog-photos.json') return { ok: true, json: async () => ({}) };
    const query = new URL(url);
    if (query.hostname === 'en.wikipedia.org') return { ok: true, json: async () => ({ query: { geosearch: [] } }) };
    const name = query.searchParams.get('gsrsearch');
    const title = name.includes('Other') ? 'File:Wat Other Chiang Mai.jpg' : 'File:Wat Sample Chiang Mai.jpg';
    return { ok: true, json: async () => ({ query: { pages: { 1: { title, imageinfo: [{
      thumburl: 'https://upload.wikimedia.org/example.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:example.jpg',
      extmetadata: { Artist: { value: 'Photographer' }, LicenseShortName: { value: 'CC BY 4.0' } },
    }] } } } }) };
  });
  const place = { id: 'photo-test-one', name: 'Wat Sample', administrativeArea: 'Chiang Mai Province', latitude: 18.8, longitude: 98.9 };
  assert.equal((await fetchCommonsPhoto(place)).credit, 'Photographer');
  assert.equal(await fetchCommonsPhoto({ ...place, id: 'photo-test-two', name: 'Wat Other', administrativeArea: 'Chiang Rai Province' }), null);
});
