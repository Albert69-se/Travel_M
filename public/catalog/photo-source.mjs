/**
 * Optional open-licence photo fallback: coordinates -> matching Wikipedia
 * article -> its Commons file -> file's artist/licence metadata.
 *
 * Only exact/strongly matching nearby articles qualify. No guessed image for
 * arbitrary Google Places businesses. Requests are lazy, capped and in-memory.
 */
import { selectMatchingArticle, plainCredit, normalizePhotoName } from './photo-matching.mjs';

const promises = new Map();
const pending = [];
let running = 0;
const CONCURRENCY = 3;

function queue(task) {
  return new Promise((resolve) => {
    pending.push({ task, resolve });
    function pump() {
      while (running < CONCURRENCY && pending.length) {
        const next = pending.shift();
        running += 1;
        Promise.resolve().then(next.task).then(next.resolve, () => next.resolve(null))
          .finally(() => { running -= 1; pump(); });
      }
    }
    pump();
  });
}

async function getJson(host, params) {
  const url = new URL(`https://${host}/w/api.php`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Photo source unavailable');
  return response.json();
}

async function commonsSearch(place) {
  const name = String(place.name || '').replace(/\([^)]*\)/g, '').split(' - ')[0].trim();
  const normalized = normalizePhotoName(name);
  const province = String(place.administrativeArea || '').replace(/ Province$/, '');
  if (normalized.length < 8 || normalized.split(' ').length < 2 || !province) return null;
  const results = await getJson('commons.wikimedia.org', {
    action: 'query', generator: 'search', gsrsearch: `"${name}" "${province}"`,
    gsrnamespace: 6, gsrlimit: 8, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: 960,
  });
  for (const entry of Object.values(results.query?.pages || {})) {
    const info = entry.imageinfo?.[0], metadata = info?.extmetadata || {};
    const title = normalizePhotoName(entry.title);
    const context = normalizePhotoName(`${entry.title} ${plainCredit(metadata.ImageDescription?.value)}`);
    const licence = plainCredit(metadata.LicenseShortName?.value);
    const credit = plainCredit(metadata.Artist?.value || metadata.Credit?.value);
    if (!/\.(jpe?g|png|webp)$/i.test(entry.title) || !title.includes(normalized) ||
        !context.includes(normalizePhotoName(province)) || !/^(CC[ -]|Public domain|PD)/i.test(licence) ||
        !credit || !info?.thumburl?.startsWith('https://') || !info.descriptionurl?.startsWith('https://commons.wikimedia.org/')) continue;
    return { src: info.thumburl, provider: 'Wikimedia Commons', credit, licence, source: info.descriptionurl };
  }
  return null;
}

async function wikipediaLookup(place) {
  if (!Number.isFinite(place?.latitude) || !Number.isFinite(place?.longitude)) return null;
  const nearby = await getJson('en.wikipedia.org', {
    action: 'query', list: 'geosearch',
    gscoord: `${place.latitude}|${place.longitude}`,
    gsradius: 650, gslimit: 20,
  });
  const match = selectMatchingArticle(place.name, nearby.query?.geosearch);
  if (!match) return null;

  const page = await getJson('en.wikipedia.org', {
    action: 'query', prop: 'pageimages', piprop: 'name', pageids: match.pageid,
  });
  const filename = Object.values(page.query?.pages || {})[0]?.pageimage;
  if (!filename || !/\.(jpe?g|png|webp)$/i.test(filename)) return null;

  const file = await getJson('commons.wikimedia.org', {
    action: 'query', prop: 'imageinfo', titles: `File:${filename}`,
    iiprop: 'url|extmetadata', iiurlwidth: 960,
  });
  const entry = Object.values(file.query?.pages || {})[0];
  const info = entry?.imageinfo?.[0];
  if (!info?.thumburl || !info.thumburl.startsWith('https://')) return null;
  const metadata = info.extmetadata || {};
  const licence = plainCredit(metadata.LicenseShortName?.value);
  const credit = plainCredit(metadata.Artist?.value || metadata.Credit?.value);
  // Images without usable licence/credit data are not safe to republish.
  if (!licence || !credit || !entry.title) return null;
  return {
    src: info.thumburl,
    provider: 'Wikimedia Commons',
    credit,
    licence,
    source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(entry.title.replace(/ /g, '_'))}`,
    article: `https://en.wikipedia.org/wiki/${encodeURIComponent(match.title.replace(/ /g, '_'))}`,
  };
}

let curatedPhotos;
async function lookup(place) {
  curatedPhotos ||= fetch('/data/catalog-photos.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));
  const curated = (await curatedPhotos)[place.id];
  if (curated) return curated;
  try { const photo = await wikipediaLookup(place); if (photo) return photo; } catch { /* Try Commons directly. */ }
  try { return await commonsSearch(place); } catch { return null; }
}

export function fetchCommonsPhoto(place) {
  if (!place?.id) return Promise.resolve(null);
  if (!promises.has(place.id)) promises.set(place.id, queue(() => lookup(place)));
  return promises.get(place.id);
}
