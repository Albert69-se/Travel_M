#!/usr/bin/env node
/**
 * Build reproducible, province-split catalog assets without paid APIs.
 *
 * Usage:
 *   node server/build-catalog.mjs --check   # read-only validation (CI)
 *   node server/build-catalog.mjs           # regenerate deployable assets
 *
 * Editing curated-catalog.mjs shortlist or replacing the upstream OSM extract
 * requires checking attractions and citations before publishing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { buildCatalog } from './curated-catalog.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'dist/data/thailand-places.json');
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const curated = buildCatalog(source);
const checked = process.argv.includes('--check');
const outputFields = p => ({
  id: p.id, name: p.name, locality: p.locality, administrativeArea: p.administrativeArea,
  category: p.category, description: p.description, latitude: p.latitude,
  longitude: p.longitude, sourceReference: p.sourceReference,
  lastCheckedAt: p.lastCheckedAt, contentStatus: p.contentStatus,
  verificationStatus: p.verificationStatus, estimatedCost: null, openingHours: null,
  catalogPriority: p.catalogPriority
});

for (const province of ['Chiang Mai', 'Chiang Rai']) {
  const doc = {
    meta: {
      province, count: 100, sourceExtractDate: curated.meta.sourceExtractDate,
      license: curated.meta.license, notice: curated.meta.statusNotice
    },
    places: curated.places
      .filter(p => p.administrativeArea === `${province} Province`)
      .map(outputFields)
  };
  if (doc.places.length !== 100) throw new Error(`Bad ${province} count`);
  const target = resolve(root, `dist/data/${province.toLowerCase().replace(' ', '-')}-curated.json`);
  const serialized = JSON.stringify(doc) + '\n';
  if (checked) {
    const actual = readFileSync(target, 'utf8');
    if (actual !== serialized) throw new Error(`Stale or modified catalog file: ${target}`);
  } else {
    writeFileSync(target, serialized);
  }
  console.log(`${province}: 100 attractions, ${Buffer.byteLength(serialized)} bytes ${checked ? 'verified' : 'generated'}`);
}
if (!checked) {
  writeFileSync(resolve(root, 'dist/data/curated-catalog-manifest.json'),
    JSON.stringify({ ...curated.meta,
      files: {
        'Chiang Mai Province': '/data/chiang-mai-curated.json',
        'Chiang Rai Province': '/data/chiang-rai-curated.json'
      }
    }) + '\n');
}
