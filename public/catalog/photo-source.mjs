/**
 * Optional open-licence photo fallback: coordinates -> matching Wikipedia
 * article -> its Commons file -> file's artist/licence metadata.
 *
 * Only exact/strongly matching nearby articles qualify. No guessed image for
 * arbitrary Google Places businesses. Requests are lazy, capped and in-memory.
 */
import { selectMatchingArticle, plainCredit } from './photo-matching.mjs';

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

async function lookup(place) {
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

export function fetchCommonsPhoto(place) {
  if (!place?.id) return Promise.resolve(null);
  if (!promises.has(place.id)) promises.set(place.id, queue(() => lookup(place)));
  return promises.get(place.id);
}
