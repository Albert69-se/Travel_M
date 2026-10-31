import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWeatherPlace } from '../src/core/weather-place.js';
import { getWeatherForPlace } from '../src/core/weather.js';
import { selectMatchingArticle } from '../src/core/commons-photo.js';

test('province destinations resolve without loaded places and explicit places win', () => {
  const city = resolveWeatherPlace([], { destinationLabel: 'Chiang Rai Province' });
  assert.equal(city.name, 'Chiang Rai');
  const mountain = { id: 'mountain', name: 'Doi Suthep', locality: 'Chiang Mai', latitude: 18.8, longitude: 98.9 };
  assert.equal(resolveWeatherPlace([mountain], { destinationLabel: 'Chiang Mai' }).name, 'Chiang Mai');
  assert.equal(resolveWeatherPlace([mountain], { destinationId: 'mountain' }), mountain);
  assert.equal(resolveWeatherPlace([mountain], {}, [{ placeId: 'missing' }, { placeId: 'mountain' }]), mountain);
  assert.equal(resolveWeatherPlace([mountain], { destinationLabel: 'Unknown' }), null);
});

test('temple aliases match only the correct nearby article', () => {
  assert.equal(selectMatchingArticle('Wat Rong Khun - White Temple', [{ title: 'Wat Rong Khun', dist: 25 }])?.title, 'Wat Rong Khun');
  assert.equal(selectMatchingArticle('Wat Phrathat Doi Suthep Racha Worawihan', [{ title: 'Wat Phra That Doi Suthep', dist: 56 }])?.dist, 56);
  assert.equal(selectMatchingArticle('Wat Rong Khun - White Temple', [{ title: 'Wat Rong Khun', dist: 800 }]), null);
  assert.equal(selectMatchingArticle('Wat Rong Khun - White Temple', [{ title: 'Wat Rong Suea Ten', dist: 25 }]), null);
});

test('weather preserves current conditions beyond forecast range and reports failures', async t => {
  const place = { latitude: 19, longitude: 99 };
  const mock = t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => ({ current: { temperature_2m: 27, weather_code: 0 },
      daily: { time: ['2026-10-26'], temperature_2m_max: [30], temperature_2m_min: [22] } }) };
  });
  const result = await getWeatherForPlace(place, '2026-12-10', '2026-12-14');
  assert.equal(result.current.temperature, 27);
  assert.deepEqual(result.days, []);
  assert.match(result.note, /No forecast/);
  mock.mock.mockImplementation(async () => { throw new DOMException('timeout', 'TimeoutError'); });
  assert.match((await getWeatherForPlace(place)).message, /too long/);
  mock.mock.mockImplementation(async () => ({ ok: false, status: 429 }));
  assert.equal((await getWeatherForPlace(place)).status, 'error');
  assert.equal((await getWeatherForPlace({ latitude: 200, longitude: 99 })).status, 'unavailable');
});
