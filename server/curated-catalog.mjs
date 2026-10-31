/**
 * TravelM catalog curator.
 *
 * Deterministic, reviewed-name-first selection of OpenStreetMap import records.
 * This is a source-backed shortlist, NOT a field-verified catalog.
 * Run from the deployment folder:
 *   node --input-type=module -e "import {readFileSync} from 'node:fs'; import {buildCatalog} from './server/curated-catalog.mjs'; console.log(JSON.stringify(buildCatalog(JSON.parse(readFileSync('./dist/data/thailand-places.json','utf8')))))"
 *
 * OSM extract 2026-10-16, © OpenStreetMap contributors, ODbL.
 */

export const TARGET_PER_PROVINCE = 100;

// Editorial name priorities (exact OSM record names, not invented records).
// Listing a name means worth shortlisting, not that it is field-verified or open today.
const FEATURED = {
  'Chiang Mai Province': `
Wat Phrathat Doi Suthep Racha Worawihan
Wat Phra Singh
Wat Chedi Luang
Wat Chiang Man
Wat Phan Tao
Wat Umong (Suan Buddha Dhamma)
Wat Sri Suphan
Wat Suan Dok
Wat Pha Lat
Wat Jed Yod
Wat Lok Molee
Wat Pa Dara Phirom
Wat Phra That Si Chom Thong
Wat Phratat Doikham
Wat Inthakhin Sadue Muang
Wat Buppharam
Wat Chet Lin - Wat Jedlin
Wat Ket Karam
Wat Ton Kwen
Wat Chedi Liem
Wat Den Sa Li Sumueng Kaen
Wat Ku Tao
Wat Ram Poeng (Tapotaram)
Wat Saen Fang
Wat Phra That Doi Suthep
Doi Inthanon
Doi Angkhan
Doi Suthep
Doi Luang Chiang Dao
Doi Mon Chong
Doi Pui
Doi Mon Ngo
Doi Lang
Doi Pha Hom Pok
Doi Kiew Lom
Chiang Dao Cave
Chiang Dao Wildlife Sanctuary
Chiang Mai National Museum
Chiang Mai City Art & Cultural Center
Lanna Folklife Museum
Chiang Mai Historical Centre
Chiang Mai House of Photography
Chiang Mai Art Museum
Highland People Discovery Museum
Hill Tribes Village Museum
Lanna Traditional House Museum CMU.
Museum of World Insects and Natural Wonders
Maiiam
Ganesha Himal Museum
Dara Phirom Palace Museum
First Royal Factory
Baan Jang Nak
Baan Kang Wat Artist Village
Baan Tawai Wood Carving Village
Sa Paper & Umbrella Handicraft Centre
Queen Sirikit Botanic Garden
Royal Flora Ratchaphruek Park
Her Majesty The Queen's 60th Birthday Botanical Garden
Huay Tueng Tao Lake
Mae Ngat Sombun Chon Dam
Mae Sa Waterfall
Buatong Waterfall
Mae Ya Waterfall
Wachirathan Waterfall
Sirithan Waterfall
Siriphum Waterfall
Mae Klang Waterfall
Mok Fa Waterfall
Mae Kampong Waterfall
Mae Pan Waterfall
Ob Khan Gorge
Ob Luang
Obluang National Park
Op Khan National Park
Si Lanna National Park
Doi Inthanon National Park
Pa Bong Piang Rice Terraces
Mae kham pong
Mon Cham
Mon Jam
Pha Chor
Grand Canyon Water Park
Fang hot springs
Sankampaeng Hot Springs
Pong Duead Geyser
Mae Sap Cave
Muang On Cave
Thapae Gate
Chang Phueak Gate
Chiang Mai Gate
Suan Dok Gate
Warorot Market
Anusarn Market
Chiang Mai Night Bazaar
Sunday Market (Walking Street)
Wua Lai Saturday Night Walking Street Market
Jing Jai Market
Kham Thiang Flower Market
San Kamphaeng Saturday Walking Street
Elephant Nature Park
Elephant Poopoopaper Park
Chiang Mai Night Safari
Chiang Mai Zoo
Elephant Jungle Sanctuary
Bhubing Palace
Royal Pagodas - Twin Pagoda
Royal Pavilion
Dantewada land of angels waterfall park
Nong Buak Haad Park
TweeChol Botanical Garden
`,
  'Chiang Rai Province': `
Wat Rong Khun - White Temple
Wat Rong Suea Ten
Wat Huai Pla Kang
Wat Phra Kaew
Wat Phra Sing
Wat Phra That Doi Chom Thong
Wat Phra That Pha Ngao
Wat Phra That Doi Wao
Wat Chedi Luang
Wat Pa Sak
Wat Saeng Kaeo Phothiyan
Wat Ngam Muang
Wat Phra That Chom Kitti
Wat Phra That Doi Khao Khwai Kaeo
Wat Chet Yot
Wat Tham Phra
Wat Phra Chao Lan Thong
Wat Phra Chao Thong Noi
Wat Si Chum
Wat Luang
Wat Ming Muang
Wat Doi Phrabat
Wat Sangkha Kaeo Don Than
Wat Mongkol
Wat Phra Yuen
Wat Tham Phra
Baan Dam Museum
Chiang Saen National Museum
Chiang Rai Culture Exhibition Center
Mae Fah Luang Art and Culture Park
Oub Kham Museum
Hilltribe Museum
House of Opium
The Hall of Opium
Akha Museum
Chinese Martyrs' Memorial Museum
Mekong Basin Civilization Museum
Lue Lai Kham Museum
Chalermprakiat Karnchanapisek Cultural Hall
Art Bridge
Sridonmoon Art Space
Tai Yuan Art Gallery
Doi Tung Royal Villa
Mae Fah Luang Garden and Royal Villa
Mae Fah Laung Garden
Mae Fah Luang Arboretum
Hall of Inspiration
Doi Tung
Doi Pha Tang
Phu Chi Dao
Phu Chi Fa Forest Park
Phu Chi Duen
Doi Chang Chiang Rai
Doi Chang Coffee Farm
Doi Chang Viewpoint/Camping
Doi Mae Salong Morning Market
Doi Nang Non
Doi Pha Chang Amazing karst formation
Doi Sa Ngo village
Doi Chang Mub Mae Fa Luang Arboretum
Doi Wiang Pha National Park
Doi Phrabat Forest Park
Doi Hua Mae Kham Forest Park
Doi Pha Tang
Doi Lang
Pha Hi village
Golden Triangle
Mekong Skywalk
Tham Luang Cave
Tham Luang-Khun Nam Nang Non Forest Park
Tham Sao Hin Payanak Cave
Tham Pha Chom Temple
Khun Korn Waterfall
Huay Mae Sai waterfall
Huai Chomphu Waterfall
Hot Springs Mae Khachan
Hot Springs Pongprabaht
Huai Mak Liam Hot Spring
Mae Chan Hot Springs
Pha Soet Hot Spring
Singha Park
Choui Fong
101 Tea Plantation
Tea 101 Plant Station Viewpoint
Choui Fong Tea Plantation
Chuifong tea plantation view point
Tea Oil and Plant Oils Development Center
Doi Chang Coffee Farm
Chiang Saen Gate
Clock Tower
Old clock tower
Sunday Walking Street
Night Bazaar
Walking Saturday Night Market
Northernmost point in Thailand sign
Chiang Rai River Beach
Kok Riverside Park
Ko Loi Park
Suan Tung
Nong Bong Khai Non-Hunting Area
Nong Bueng Park
Princess Mother 90th Anniversary Park
Chiang Saen Lake
Golden Triangle Viewpoint
Doi Bo Viewpoint
Amazing Mekong Viewpoint
Mae Suai Reservoir Viewpoint
Viewpoint Tea Terraces & Mae Salong
Doi Chang Mub Mae Fa Luang Arboretum
Choui Fong
Ban Lor Cha Community Tourism
Jinnaluck Mulberry Paper Workshop
Kuhn Sa Memorial
Kok River Viewpoint
Phu Chi Fa Viewpoint
`
};
const normalize = name => String(name || '')
  .normalize('NFKC').toLowerCase().replace(/&/g, 'and')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');

const PRIORITY = Object.fromEntries(Object.entries(FEATURED).map(([province, lines]) => [
  province, new Map(lines.split('\n').map(normalize).filter(Boolean).map((name, index) => [name, index]))
]));

const NON_ATTRACTION = /^(?:\d+(?:m| metres?|km)?|[a-z]{1,3}|[-\"\s]+|temple|pagoda|lake|waterfall|view ?point|viewpoint|nice view|park|market|night market|archaeological site|statue|buddha|golden buddha|white buddha|high point.*|sunset|sunrise|monument|exhibition|te[a-z]*|stupa|photo spot|great view|rest.*|the.*|farmers market|festival|food court|museum|restaurant|outdoor market|parking.*|water wheels|tea plantation|temple entrance|landmark|suspension bridge|covered market)$/i;
const BAD = /(?:abandon|closed 20|unfinish|cafe\s*&|shop|airstrip|car park|parking|parking lot|construction|toilets?|clubhouse|house \d|gate food stalls|food sector|vegetable sector|restaurant|cock.?fight|shooting range|weeds?|bus stop|trading|luggage|congee|cattle|petting zoo|snake show|skugga|museum of heroic deeds|garbage|garage|shelter|intersection|junction|hotel development|golf club|resort|bar\b|massage|tour agency|ticket|hair|lotus|motorcycle|rental|island ferry|railway park|bus station|memorial park playground|zebra|aquarium.*tank)/i;
const QUALIFIES = /(?:\bwat\b|\bdoi\b|waterfall|falls\b|botanic|gardens?|museum|memorial|cave|gorge|forest|national park|temple|historic|pagoda|palace|art (?:center|gallery|space)|culture|cultural|mountain|tea (?:farm|plantation|estate|garden)|lake|river|viewpoint|view point|market|walking street|night bazaar|clock tower|gate|hot spring|geyser|sanctuary|arboretum|orchid|village|water park|mon cham|mon jam|dam\b|rice terrace|ruins|park|zoo|elephant nature|golden triangle|hill tribe|skywalk|doi tung|pha hi|jungle|reservoir|festival|farm|handicraft|hall of opium|singha park|pu chi|phu chi)/i;
const nameScore = (record, province) => {
  const name = String(record.name || '').trim();
  const priority = PRIORITY[province].get(normalize(name));
  if (priority !== undefined) return 10000 - priority * 2;
  let score = 0;
  if (/^wat .{5,}/i.test(name)) score += 130;
  if (/museum|national park|botanical|royal|waterfall|art gallery|cultural center|culture centre|historical|garden|cave|viewpoint|skywalk|memorial/i.test(name)) score += 125;
  if (/^doi |^phu |^pha |^mae |^chiang |^ban |^b[a-z]+/i.test(name)) score += 40;
  if (/walking street|market|night bazaar|arboretum|hot springs?|dam|village/i.test(name)) score += 55;
  if (record.category === 'Nature') score += 30;
  if (record.category === 'Food') score -= 45;
  if (name.length >= 10 && name.length <= 60) score += 20;
  if (/viewpoint|waterfall|market/i.test(name)) score += 10;
  score += Math.min(20, name.length / 4);
  return score;
};
const distanceMeters = (a, b) => {
  const lat = (a.latitude + b.latitude) * Math.PI / 360;
  const x = (a.longitude - b.longitude) * Math.cos(lat) * 111320;
  const y = (a.latitude - b.latitude) * 110540;
  return Math.hypot(x, y);
};

export function buildCatalog(imported, { perProvince = TARGET_PER_PROVINCE } = {}) {
  if (!Array.isArray(imported?.places) || !imported.meta?.extractDate) {
    throw new Error('Unrecognized OpenStreetMap import schema.');
  }
  const places = [], counts = {}, excluded = {};
  for (const province of Object.keys(PRIORITY)) {
    const all = imported.places.filter(p => p.administrativeArea === province);
    excluded[province] = { candidates: all.length, genericOrNonTourist: 0, invalidCoordinates: 0, deduplicated: 0 };
    const scored = all.filter(p => {
      const n = String(p.name || '').trim();
      if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) ||
        p.latitude < 17 || p.latitude > 21 || p.longitude < 97 || p.longitude > 101.5) {
        excluded[province].invalidCoordinates++; return false;
      }
      if (!p.id || !p.sourceReference || !p.lastCheckedAt ||
        n.length < 5 || NON_ATTRACTION.test(n) || BAD.test(n) ||
        (!QUALIFIES.test(n) && !PRIORITY[province].has(normalize(n)))) {
        excluded[province].genericOrNonTourist++; return false;
      }
      return true;
    }).map(p => ({ ...p, __score: nameScore(p, province) }))
      .sort((a, b) => b.__score - a.__score || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

    const picked = [];
    const byName = new Map();
    for (const candidate of scored) {
      // Avoid nearby aliases referring to the same mapped attraction.
      const key = normalize(candidate.name).replace(/\b(the|chiang mai|chiang rai)\b/g, '').trim();
      if (picked.some(p =>
        (distanceMeters(p, candidate) < 180 &&
          (normalize(p.name) === normalize(candidate.name) ||
           normalize(p.name).includes(normalize(candidate.name)) ||
           normalize(candidate.name).includes(normalize(p.name)))) ||
        byName.has(key))) {
        excluded[province].deduplicated++; continue;
      }
      picked.push(candidate); byName.set(key, candidate);
      if (picked.length === perProvince) break;
    }
    if (picked.length !== perProvince) throw new Error(
      `Not enough eligible named attractions in ${province}: ${picked.length}/${perProvince}`
    );
    counts[province] = picked.length;
    for (const p of picked) {
      const { __score, ...sourceRecord } = p;
      places.push({
        ...sourceRecord,
        description: `OpenStreetMap lists ${p.name} in ${province.replace(' Province', '')}. Detailed visitor information has not been independently verified.`,
        estimatedCost: null,
        estimatedCostNote: 'Entrance fee unknown; verify with the attraction before visiting.',
        openingHours: null,
        contentStatus: 'imported',
        verificationStatus: 'unverified',
        catalogPriority: PRIORITY[province].has(normalize(p.name)) ? 'editorial-shortlist' : 'osm-attraction-candidate'
      });
    }
  }
  if (new Set(places.map(p => p.id)).size !== places.length) throw new Error('Duplicate IDs');
  return {
    meta: {
      title: 'TravelM — Chiang Mai & Chiang Rai attraction catalog',
      generatedAt: new Date().toISOString(),
      sourceExtractDate: imported.meta.extractDate,
      source: imported.meta.source,
      license: imported.meta.licence,
      editorialPrioritization: 'Tourism Authority of Thailand province guides, plus OSM attraction-name review',
      editorialGuides: {
        chiangMai: 'https://www.tourismthailand.org/Destinations/Provinces/Chiang-Mai/101',
        chiangRai: 'https://www.tourismthailand.org/Destinations/Provinces/Chiang-Rai/102'
      },
      statusNotice: 'OSM imported and editorially short-listed; individual opening hours, fees and current operations are NOT verified.',
      provinceCounts: counts,
      excluded,
      count: places.length
    },
    places
  };
}
