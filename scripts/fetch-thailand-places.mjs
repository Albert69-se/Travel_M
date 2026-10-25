#!/usr/bin/env node
/**
 * Thailand-wide places — import script (OpenStreetMap via the Overpass API).
 *
 *   node scripts/fetch-thailand-places.mjs --count    # size the dataset (no download)
 *   node scripts/fetch-thailand-places.mjs --fetch    # download raw elements to scripts/cache/
 *   node scripts/fetch-thailand-places.mjs --build    # normalise cache -> public/data/thailand-places.json
 *   node scripts/fetch-thailand-places.mjs --all      # fetch + build
 *
 * When the Overpass instances are down (they saturate often), the same dataset
 * can be built from the Geofabrik country extract instead — a one-time download:
 *
 *   curl -L -o scripts/cache/thailand-latest.osm.pbf \
 *     https://download.geofabrik.de/asia/thailand-latest.osm.pbf
 *   node scripts/fetch-thailand-places.mjs --pbf      # needs `osmium` (brew install osmium-tool)
 *   node scripts/fetch-thailand-places.mjs --import   # re-normalise an existing osmium export
 *
 * The public Overpass instances share one queue and are often saturated; the
 * script tries several mirrors with exponential backoff rather than trusting
 * any single server. Raw responses are cached under scripts/cache/, so --build
 * can be re-run without touching the network.
 *
 * Output records match the Place schema in src/app/CONTRACT.md exactly and
 * carry their provenance: sourceReference identifies the OSM element, and the
 * extract date lands in lastCheckedAt. `contentStatus` is 'imported' — these
 * records have never been verified on the ground and must not read as if they
 * have.
 *
 * Dependencies: none (Node 20+, global fetch).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const CACHE_DIR = join(HERE, 'cache');
const OUT_FILE = join(ROOT, 'public', 'data', 'thailand-places.json');

const MIRRORS = [
  // The main instances share one queue and saturate often; the VK/Mail.ru
  // mirror has proven the most available of the public instances, so it is
  // tried first and the rest act as fallbacks in rotation.
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.osm.jp/api/interpreter',
];

const USER_AGENT = 'travel-m-course-project/1.0 (dataset build script; contact: project authors)';

/** Thailand as an Overpass area (the country boundary relation). */
const AREA = 'area["ISO3166-1"="TH"][admin_level=2]->.th;';

/**
 * Query groups. An element may appear in more than one group; the normaliser
 * de-duplicates by element id, so listing a group twice is harmless.
 */
const GROUPS = [
  { key: 'tourism', selectors: ['nwr["tourism"~"^(attraction|museum|viewpoint|zoo|theme_park|gallery)$"]["name"]'] },
  { key: 'historic', selectors: ['nwr["historic"~"^(monument|ruins|archaeological_site|fort|castle|city_gate)$"]["name"]'] },
  { key: 'natural', selectors: ['nwr["natural"~"^(waterfall|beach|cave_entrance|peak|spring)$"]["name"]'] },
  { key: 'protected', selectors: ['nwr["boundary"="protected_area"]["name"]'] },
  { key: 'parks', selectors: ['nwr["leisure"="park"]["name"]'] },
  { key: 'markets', selectors: ['nwr["amenity"="marketplace"]["name"]'] },
  { key: 'temples', selectors: ['nwr["amenity"="place_of_worship"]["name"]["wikidata"]', 'nwr["amenity"="place_of_worship"]["name"]["heritage"]'] },
];

const GEOBOUNDARIES_API = 'https://www.geoboundaries.org/api/current/gbOpen/THA/ADM1/';
const PROVINCE_CACHE = join(CACHE_DIR, 'tha-adm1.geojson');

/**
 * The Geofabrik path. The country extract is filtered with osmium — a
 * build-time tool (brew install osmium-tool), not a runtime dependency — and
 * exported to GeoJSON; --import normalises that file with exactly the same
 * rules as the Overpass cache.
 */
const PBF_FILE = join(CACHE_DIR, 'thailand-latest.osm.pbf');
const PBF_FILTERED = join(CACHE_DIR, 'filtered.osm.pbf');
const PBF_GEOJSON = join(CACHE_DIR, 'filtered.geojson');
const PBF_EXTRACT_URL = 'https://download.geofabrik.de/asia/thailand-latest.osm.pbf';
const PBF_FILTERS = [
  'nwr/tourism=attraction,museum,viewpoint,zoo,theme_park,gallery',
  'nwr/historic=monument,ruins,archaeological_site,fort,castle,city_gate',
  'nwr/natural=waterfall,beach,cave_entrance,peak,spring',
  'nwr/leisure=park',
  'nwr/boundary=protected_area',
  'nwr/amenity=marketplace,place_of_worship',
];

/** Generous Thailand bounding box; anything outside is dropped and counted. */
const TH_BBOX = { minLat: 5.0, maxLat: 21.0, minLng: 96.3, maxLng: 106.7 };

const NOUNS = [
  { tag: 'historic', value: 'monument', noun: 'Monument' },
  { tag: 'historic', value: 'ruins', noun: 'Ruins' },
  { tag: 'historic', value: 'archaeological_site', noun: 'Archaeological site' },
  { tag: 'historic', value: 'fort', noun: 'Fort' },
  { tag: 'historic', value: 'castle', noun: 'Castle' },
  { tag: 'historic', value: 'city_gate', noun: 'City gate' },
];

/**
 * The tag combinations this import is for — the same scope the Overpass
 * groups select. Re-checked while normalising because a filtered file also
 * carries objects that were only pulled in as relation members.
 */
const TARGET_TAGS = [
  ['tourism', ['attraction', 'museum', 'viewpoint', 'zoo', 'theme_park', 'gallery']],
  ['historic', ['monument', 'ruins', 'archaeological_site', 'fort', 'castle', 'city_gate']],
  ['natural', ['waterfall', 'beach', 'cave_entrance', 'peak', 'spring']],
  ['leisure', ['park']],
  ['boundary', ['protected_area']],
  ['amenity', ['marketplace', 'place_of_worship']],
];

function inImportScope(tags) {
  return TARGET_TAGS.some(([key, values]) => typeof tags[key] === 'string' && values.includes(tags[key]));
}

/* ------------------------------------------------------------------ utils -- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const flags = { mode: 'count', budgetMs: 600_000, timeoutS: 240 };
  for (const arg of argv) {
    if (arg === '--count') flags.mode = 'count';
    else if (arg === '--fetch') flags.mode = 'fetch';
    else if (arg === '--build') flags.mode = 'build';
    else if (arg === '--all') flags.mode = 'all';
    else if (arg === '--pbf') flags.mode = 'pbf';
    else if (arg === '--import') flags.mode = 'import';
    else if (arg.startsWith('--budget=')) flags.budgetMs = Number(arg.split('=')[1]) * 1000;
    else if (arg.startsWith('--timeout=')) flags.timeoutS = Number(arg.split('=')[1]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return flags;
}

function buildQuery(selectors, outClause, timeoutS) {
  const lines = selectors.map((selector) => `  ${selector}(area.th);`).join('\n');
  return `[out:json][timeout:${timeoutS}];\n${AREA}\n(\n${lines}\n);\n${outClause};`;
}

/** One Overpass call, retried across mirrors with exponential backoff. */
async function overpass(selectors, outClause, { label, budgetMs, timeoutS }) {
  const started = Date.now();
  let attempt = 0;
  let lastError = 'no attempt made';

  while (Date.now() - started < budgetMs) {
    const mirror = MIRRORS[attempt % MIRRORS.length];
    attempt += 1;
    const query = buildQuery(selectors, outClause, timeoutS);
    try {
      process.stdout.write(`    [${label}] attempt ${attempt} via ${mirror.split('/')[2]} … `);
      const response = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(timeoutS * 1000 + 30_000),
      });
      const text = await response.text();
      if (!response.ok || !text.trimStart().startsWith('{')) {
        const capacity = /capacity|rate limit/i.test(text) ? ' (at capacity)' : '';
        lastError = `HTTP ${response.status}${capacity}`;
        process.stdout.write(`failed: ${lastError}\n`);
      } else {
        const json = JSON.parse(text);
        if (Array.isArray(json.elements)) {
          process.stdout.write(`ok — ${json.elements.length} element(s)\n`);
          return { ok: true, json, attempts: attempt };
        }
        lastError = 'unexpected payload';
        process.stdout.write(`failed: ${lastError}\n`);
      }
    } catch (error) {
      lastError = `${error.name}: ${error.message}`;
      process.stdout.write(`failed: ${lastError}\n`);
    }
    const wait = Math.min(60_000, 5_000 * 2 ** Math.min(attempt - 1, 4));
    process.stdout.write(`    [${label}] retrying in ${wait / 1000}s\n`);
    await sleep(wait);
  }
  return { ok: false, error: `gave up after ${attempt} attempt(s) — last: ${lastError}` };
}

/* --------------------------------------------------------------- geometry -- */

function ringBbox(ring) {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLng, minLat, maxLng, maxLat };
}

function bboxContains(box, lng, lat) {
  return lng >= box.minLng && lng <= box.maxLng && lat >= box.minLat && lat <= box.maxLat;
}

/** Ray-casting for one closed ring; even-odd across a polygon's rings handles holes. */
function ringContains(ring, lng, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Pre-computes bounded ring lists so point lookups stay cheap. */
function prepareProvinces(geo) {
  return geo.features.map((feature) => {
    const rawPolys = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const polys = rawPolys.map((rings) => rings.map((ring) => ({ ring, bbox: ringBbox(ring) })));
    const boxes = polys.flat().map((entry) => entry.bbox);
    const bbox = {
      minLng: Math.min(...boxes.map((b) => b.minLng)),
      minLat: Math.min(...boxes.map((b) => b.minLat)),
      maxLng: Math.max(...boxes.map((b) => b.maxLng)),
      maxLat: Math.max(...boxes.map((b) => b.maxLat)),
    };
    const name = (feature.properties && (feature.properties.shapeName || feature.properties.name)) || '';
    return { name, bbox, polys };
  });
}

function provinceAt(prepared, lng, lat) {
  for (const province of prepared) {
    if (!bboxContains(province.bbox, lng, lat)) continue;
    for (const rings of province.polys) {
      let inside = false;
      for (const { ring, bbox } of rings) {
        if (!bboxContains(bbox, lng, lat)) continue;
        if (ringContains(ring, lng, lat)) inside = !inside;
      }
      if (inside) return province.name;
    }
  }
  return '';
}

async function loadProvinces() {
  if (existsSync(PROVINCE_CACHE)) {
    const geo = JSON.parse(readFileSync(PROVINCE_CACHE, 'utf8'));
    console.log(`  province boundaries: cached (${geo.features.length} features)`);
    return geo;
  }
  console.log('  province boundaries: downloading geoBoundaries gbOpen THA ADM1 …');
  const metaResponse = await fetch(GEOBOUNDARIES_API, { headers: { 'User-Agent': USER_AGENT } });
  if (!metaResponse.ok) throw new Error(`geoBoundaries metadata HTTP ${metaResponse.status}`);
  const meta = await metaResponse.json();
  const url = meta.simplifiedGeometryGeoJSON || meta.gjDownloadURL;
  if (!url) throw new Error('geoBoundaries metadata carried no geometry URL');
  const geoResponse = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!geoResponse.ok) throw new Error(`geoBoundaries geometry HTTP ${geoResponse.status}`);
  const geo = await geoResponse.json();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(PROVINCE_CACHE, JSON.stringify(geo));
  console.log(`  province boundaries: downloaded (${geo.features.length} features)`);
  return geo;
}

/* ------------------------------------------------------------- normaliser -- */

/** Category assignment precedence — first match wins. Documented in the README. */
function classify(tags) {
  const has = (key, values) => typeof tags[key] === 'string' && values.includes(tags[key]);
  if (typeof tags.historic === 'string') return { category: 'Culture', noun: historicNoun(tags.historic) };
  if (tags.amenity === 'place_of_worship') return { category: 'Culture', noun: 'Place of worship' };
  if (has('tourism', ['museum', 'gallery'])) return { category: 'Culture', noun: tags.tourism === 'museum' ? 'Museum' : 'Gallery' };
  if (tags.amenity === 'marketplace') return { category: 'Food', noun: 'Market' };
  if (tags.tourism === 'theme_park') return { category: 'Culture', noun: 'Theme park' };
  if (tags.tourism === 'attraction') return { category: 'Culture', noun: 'Visitor attraction' };
  if (typeof tags.natural === 'string') return { category: 'Nature', noun: naturalNoun(tags.natural) };
  if (tags.tourism === 'viewpoint') return { category: 'Nature', noun: 'Viewpoint' };
  if (tags.tourism === 'zoo') return { category: 'Nature', noun: 'Zoo' };
  if (tags.boundary === 'protected_area') return { category: 'Nature', noun: 'Protected area' };
  if (tags.leisure === 'park') return { category: 'Nature', noun: 'Park' };
  return { category: 'Culture', noun: 'Place of interest' };
}

function historicNoun(value) {
  const match = NOUNS.find((entry) => entry.tag === 'historic' && entry.value === value);
  return match ? match.noun : 'Historic site';
}

function naturalNoun(value) {
  const nouns = {
    waterfall: 'Waterfall', beach: 'Beach', cave_entrance: 'Cave', peak: 'Mountain summit', spring: 'Spring',
  };
  return nouns[value] || 'Natural feature';
}

function typeInitial(type) {
  return type === 'node' ? 'n' : type === 'way' ? 'w' : 'r';
}

function elementCoordinates(element) {
  if (Number.isFinite(element.lat) && Number.isFinite(element.lon)) return { lat: element.lat, lng: element.lon };
  const center = element.center || {};
  if (Number.isFinite(center.lat) && Number.isFinite(center.lon)) return { lat: center.lat, lng: center.lon };
  return null;
}

function normalizeElement(element, { prepared, extractDate }) {
  const tags = element.tags || {};
  const name = (typeof tags['name:en'] === 'string' && tags['name:en'].trim()) || (typeof tags.name === 'string' && tags.name.trim()) || '';
  if (!name) return { drop: 'no name' };

  // Only the tags this import is for; anything else (objects that were only
  // pulled in as relation members, for instance) is not a place record.
  if (!inImportScope(tags)) return { drop: 'outside the import tag scope' };

  const coords = elementCoordinates(element);
  if (!coords) return { drop: 'no coordinates' };
  const { lat, lng } = coords;
  if (lat < TH_BBOX.minLat || lat > TH_BBOX.maxLat || lng < TH_BBOX.minLng || lng > TH_BBOX.maxLng) {
    return { drop: 'outside Thailand bounding box' };
  }

  // Temples count only when they carry a notability tag — the country holds
  // tens of thousands of ordinary wats, and the dataset is for popular places.
  if (tags.amenity === 'place_of_worship' && !tags.wikidata && !tags.heritage) {
    return { drop: 'place of worship without wikidata/heritage' };
  }

  const province = provinceAt(prepared, lng, lat);
  const locality = [tags['addr:city'], tags['addr:suburb'], province].find((value) => typeof value === 'string' && value.trim()) || '';
  const { category, noun } = classify(tags);
  const where = province ? `${province}, Thailand` : 'Thailand';

  const type = element.type;
  const record = {
    id: `osm-${typeInitial(type)}${element.id}`,
    name,
    locality,
    administrativeArea: province,
    countryCode: 'TH',
    category,
    description: `${noun} in ${where} — imported from OpenStreetMap, not verified on the ground.`,
    estimatedCost: null,
    estimatedCostNote: 'Not recorded in the import',
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    sourceReference: `OpenStreetMap ${type} ${element.id} (ODbL)`,
    lastCheckedAt: extractDate,
    contentStatus: 'imported',
  };
  return { record };
}

/* ------------------------------------------------- geojson (Geofabrik) -- */

/**
 * Decodes an `osmium export -u type_id` feature id (`n123`, `w45`, `a678`)
 * back to the OSM object it came from. Per the osmium manual, areas encode
 * closed ways as twice the way id and relations as twice the relation id
 * plus one, so the numeric part is unambiguous.
 */
function decodeFeatureId(raw) {
  if (typeof raw !== 'string' || raw.length < 2) return null;
  const kind = raw[0];
  const value = Number(raw.slice(1));
  if (!Number.isFinite(value) || value < 0) return null;
  if (kind === 'n') return { type: 'node', id: value };
  if (kind === 'w') return { type: 'way', id: value };
  if (kind === 'a') {
    return value % 2 === 0
      ? { type: 'way', id: value / 2 }
      : { type: 'relation', id: (value - 1) / 2 };
  }
  return null;
}

function meanPosition(ring) {
  if (!Array.isArray(ring) || ring.length === 0) return null;
  let lng = 0;
  let lat = 0;
  for (const [x, y] of ring) {
    lng += x;
    lat += y;
  }
  return { lng: lng / ring.length, lat: lat / ring.length };
}

function ringArea(ring) {
  const box = ringBbox(ring);
  return (box.maxLng - box.minLng) * (box.maxLat - box.minLat);
}

/**
 * A representative point for an exported feature: exact for points, the mean
 * of the outline for lines, and the mean of the largest polygon's outer ring
 * for areas. Areas are an approximation — the record's provenance says the
 * import is not verified on the ground.
 */
function geometryPoint(geometry) {
  if (!geometry) return null;
  const { type, coordinates } = geometry;
  if (type === 'Point') return { lng: coordinates[0], lat: coordinates[1] };
  if (type === 'LineString') return meanPosition(coordinates);
  if (type === 'MultiLineString') return Array.isArray(coordinates) && coordinates.length > 0 ? meanPosition(coordinates[0]) : null;
  if (type === 'Polygon') return Array.isArray(coordinates) && coordinates.length > 0 ? meanPosition(coordinates[0]) : null;
  if (type === 'MultiPolygon') {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return null;
    let best = coordinates[0];
    for (const polygon of coordinates) {
      if (polygon.length > 0 && ringArea(polygon[0]) > ringArea(best[0] || [])) best = polygon;
    }
    return best.length > 0 ? meanPosition(best[0]) : null;
  }
  if (type === 'GeometryCollection') {
    for (const part of geometry.geometries || []) {
      const point = geometryPoint(part);
      if (point) return point;
    }
  }
  return null;
}

/** Filters the Geofabrik extract with osmium, exports GeoJSON, then imports it. */
async function pbfMode() {
  if (!existsSync(PBF_FILE)) {
    console.log(`  the country extract is missing: ${PBF_FILE}`);
    console.log(`  download it first: curl -L -o ${PBF_FILE} ${PBF_EXTRACT_URL}`);
    return false;
  }
  try {
    execFileSync('osmium', ['--version'], { stdio: 'ignore' });
  } catch {
    console.log('  osmium is not installed — run: brew install osmium-tool');
    return false;
  }
  console.log('  filtering the extract with osmium …');
  execFileSync('osmium', ['tags-filter', PBF_FILE, ...PBF_FILTERS, '-o', PBF_FILTERED, '-O'], { stdio: 'inherit' });
  console.log('  exporting GeoJSON …');
  execFileSync('osmium', ['export', PBF_FILTERED, '-f', 'geojson', '-u', 'type_id', '-o', PBF_GEOJSON, '-O'], { stdio: 'inherit' });
  return importMode();
}

/** Normalises an existing osmium GeoJSON export into the app dataset. */
async function importMode() {
  if (!existsSync(PBF_GEOJSON)) {
    console.log(`  no GeoJSON export at ${PBF_GEOJSON} — run --pbf first`);
    return false;
  }
  console.log('Normalising the osmium GeoJSON export into the app dataset.');
  const provinces = await loadProvinces();
  const prepared = prepareProvinces(provinces);
  const extractDate = new Date().toISOString().slice(0, 10);
  const raw = JSON.parse(readFileSync(PBF_GEOJSON, 'utf8'));
  const features = Array.isArray(raw.features) ? raw.features : [];

  const seen = new Set();
  const records = [];
  const dropReasons = {};
  const bumpDrop = (reason) => {
    dropReasons[reason] = (dropReasons[reason] || 0) + 1;
  };

  // A closed way matching both the area and linear tag sets is exported twice
  // — once as a (Multi)Polygon and once as a LineString (`osmium export`,
  // "AREA HANDLING") — so the same object can arrive under two ids that decode
  // to the same OSM element. First one wins; the pair describes one place.
  for (const feature of features) {
    const decoded = decodeFeatureId(feature.id);
    if (!decoded) {
      bumpDrop('no usable id');
      continue;
    }
    const key = `${decoded.type}/${decoded.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const point = geometryPoint(feature.geometry);
    if (!point) {
      bumpDrop('no coordinates');
      continue;
    }
    const { record, drop } = normalizeElement(
      { type: decoded.type, id: decoded.id, tags: feature.properties || {}, lat: point.lat, lon: point.lng },
      { prepared, extractDate },
    );
    if (drop) {
      bumpDrop(drop);
      continue;
    }
    records.push(record);
  }

  return finalizeDataset(records, {
    extractDate,
    considered: features.length,
    dropReasons,
    source: `OpenStreetMap — Geofabrik Thailand extract (${PBF_EXTRACT_URL.split('/').pop()}), filtered with osmium`,
    query: { extract: PBF_EXTRACT_URL, filters: PBF_FILTERS, requires: 'name tag; representative point; inside Thailand' },
    provinceSource: 'geoBoundaries gbOpen THA ADM1 simplified (boundary source: OSM via Wambacher; ODbL 1.0)',
  });
}

/* -------------------------------------------------------------------- run -- */

async function countMode(flags) {
  console.log('Counting Thailand-wide OSM features (no download).');
  const counts = {};
  let total = 0;
  for (const group of GROUPS) {
    const result = await overpass(group.selectors, 'out count;', {
      label: group.key, budgetMs: 150_000, timeoutS: flags.timeoutS,
    });
    if (!result.ok) {
      console.log(`  ${group.key}: FAILED — ${result.error}`);
      continue;
    }
    const tags = (result.json.elements[0] || {}).tags || {};
    const groupTotal = Number(tags.total || 0);
    counts[group.key] = groupTotal;
    total += groupTotal;
    console.log(`  ${group.key}: ${groupTotal}`);
  }
  console.log(`\n  union (upper bound, groups overlap): ${total}`);
  console.log(`  very rough raw JSON estimate: ~${Math.round((total * 280) / 1024 / 1024)} MB for ${total} records`);
  return Object.keys(counts).length > 0;
}

async function fetchMode(flags) {
  mkdirSync(CACHE_DIR, { recursive: true });
  console.log('Downloading raw OSM elements per group into scripts/cache/.');
  let failures = 0;
  for (const group of GROUPS) {
    const target = join(CACHE_DIR, `raw-${group.key}.json`);
    const result = await overpass(group.selectors, 'out center;', {
      label: group.key, budgetMs: flags.budgetMs, timeoutS: flags.timeoutS,
    });
    if (!result.ok) {
      console.log(`  ${group.key}: FAILED — ${result.error}`);
      failures += 1;
      continue;
    }
    writeFileSync(target, JSON.stringify(result.json));
    const bytes = readFileSync(target).length;
    console.log(`  ${group.key}: ${result.json.elements.length} element(s), ${(bytes / 1024 / 1024).toFixed(1)} MB -> ${target}`);
  }
  return failures === 0;
}

async function buildMode() {
  console.log('Normalising cached raw elements into the app dataset.');
  const provinces = await loadProvinces();
  const prepared = prepareProvinces(provinces);
  const extractDate = new Date().toISOString().slice(0, 10);

  const seen = new Set();
  const records = [];
  const dropReasons = {};
  const byGroup = {};
  let considered = 0;

  for (const group of GROUPS) {
    const source = join(CACHE_DIR, `raw-${group.key}.json`);
    if (!existsSync(source)) {
      console.log(`  ${group.key}: no cached file — skipped`);
      continue;
    }
    const raw = JSON.parse(readFileSync(source, 'utf8'));
    byGroup[group.key] = raw.elements.length;
    considered += raw.elements.length;

    for (const element of raw.elements) {
      const key = `${element.type}/${element.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const { record, drop } = normalizeElement(element, { prepared, extractDate });
      if (drop) {
        dropReasons[drop] = (dropReasons[drop] || 0) + 1;
        continue;
      }
      records.push(record);
    }
  }

  return finalizeDataset(records, {
    extractDate,
    considered,
    dropReasons,
    source: 'OpenStreetMap, queried via the Overpass API',
    query: { area: 'ISO3166-1 = TH', groups: byGroup, requires: 'name tag; coordinates; inside Thailand' },
    provinceSource: 'geoBoundaries gbOpen THA ADM1 simplified (boundary source: OSM via Wambacher; ODbL 1.0)',
  });
}

/** Sorts, describes and writes a record set; shared by the Overpass and Geofabrik paths. */
function finalizeDataset(records, { extractDate, considered, dropReasons, source, query, provinceSource }) {
  records.sort((a, b) => (a.administrativeArea || 'zz').localeCompare(b.administrativeArea || 'zz') || a.name.localeCompare(b.name));

  const byCategory = {};
  const byProvince = {};
  for (const record of records) {
    byCategory[record.category] = (byCategory[record.category] || 0) + 1;
    if (record.administrativeArea) byProvince[record.administrativeArea] = (byProvince[record.administrativeArea] || 0) + 1;
  }

  const meta = {
    title: 'Thailand-wide places — OpenStreetMap import',
    generatedAt: new Date().toISOString(),
    extractDate,
    source,
    licence: 'Open Database License (ODbL) — © OpenStreetMap contributors',
    provinceSource,
    query,
    counts: { total: records.length, considered, dropped: dropReasons, byCategory, byProvince },
  };

  const body = records.map((record) => `    ${JSON.stringify(record)}`).join(',\n');
  const metaText = JSON.stringify(meta, null, 2).replace(/\n/g, '\n  ');
  const text = `{\n  "meta": ${metaText},\n  "places": [\n${body}\n  ]\n}\n`;

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, text);

  console.log(`  records: ${records.length} (considered ${considered}, dropped ${JSON.stringify(dropReasons)})`);
  console.log(`  by category: ${JSON.stringify(byCategory)}`);
  console.log(`  provinces covered: ${Object.keys(byProvince).length}`);
  console.log(`  written: ${OUT_FILE} (${(Buffer.byteLength(text) / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  sample: ${JSON.stringify(records[0])}`);
  return records.length > 0;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  console.log(`travel-m place import — mode: ${flags.mode}`);
  let ok = true;
  if (flags.mode === 'count') ok = await countMode(flags);
  else if (flags.mode === 'fetch') ok = await fetchMode(flags);
  else if (flags.mode === 'build') ok = await buildMode();
  else if (flags.mode === 'all') ok = (await fetchMode(flags)) && (await buildMode());
  else if (flags.mode === 'pbf') ok = await pbfMode();
  else if (flags.mode === 'import') ok = await importMode();
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`import failed: ${error.message}`);
  process.exitCode = 1;
});
