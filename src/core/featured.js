/**
 * Small editorial discovery list — recognizable visitor landmarks across
 * Thailand, not a ranking by verified tourist counts. Coordinates are
 * APPROXIMATE map hints pending a Google Places match; fees/hours are unknown.
 *
 * Stable IDs keep bookmarks and itinerary references intact across releases.
 * Google Places images are requested at display time, never stored here.
 */
const SEEDS = [
  // Bangkok
  ['grand-palace','The Grand Palace','Bangkok','Bangkok','Culture',13.7503,100.4913,'Historic royal palace complex and major cultural landmark.'],
  ['wat-pho','Wat Pho (Reclining Buddha)','Bangkok','Bangkok','Culture',13.7466,100.4930,'Temple known for its monumental reclining Buddha.'],
  ['wat-arun','Wat Arun','Bangkok','Bangkok','Culture',13.7437,100.4887,'Riverside temple with a distinctive central prang.'],
  ['chatuchak','Chatuchak Weekend Market','Bangkok','Bangkok','Food',13.7999,100.5490,'Large weekend market with local food and shopping.'],
  ['yaowarat','Yaowarat Road (Chinatown)','Bangkok','Bangkok','Food',13.7398,100.5106,'Bangkok Chinatown food and night-market district.'],
  ['jim-thompson','Jim Thompson House Museum','Bangkok','Bangkok','Culture',13.7494,100.5285,'Traditional Thai houses and art collection.'],
  ['lumphini','Lumphini Park','Bangkok','Bangkok','Nature',13.7314,100.5414,'Green park and lake in central Bangkok.'],
  // Central Thailand
  ['ayutthaya-wat-mahathat','Wat Mahathat Ayutthaya','Phra Nakhon Si Ayutthaya','Phra Nakhon Si Ayutthaya','Culture',14.3564,100.5684,'Ancient temple ruins within the historic city.'],
  ['wat-chaiwatthanaram','Wat Chaiwatthanaram','Phra Nakhon Si Ayutthaya','Phra Nakhon Si Ayutthaya','Culture',14.3441,100.5411,'Riverside temple complex in Ayutthaya.'],
  ['bang-pa-in','Bang Pa-In Royal Palace','Bang Pa-In','Phra Nakhon Si Ayutthaya','Culture',14.2350,100.5789,'Historic summer royal palace complex.'],
  ['sukhothai-historical','Sukhothai Historical Park','Sukhothai','Sukhothai','Culture',17.0179,99.7037,'UNESCO-listed historic temple and monument area.'],
  ['river-kwai-bridge','Bridge over the River Kwai','Kanchanaburi','Kanchanaburi','Culture',14.0401,99.5039,'Historic railway bridge on the Khwae Yai River.'],
  ['erawan-falls','Erawan Waterfall','Si Sawat','Kanchanaburi','Nature',14.3684,99.1425,'Multi-level waterfall in Erawan National Park.'],
  // Northern Thailand
  ['doi-inthanon','Doi Inthanon National Park','Chom Thong','Chiang Mai','Nature',18.5883,98.4869,'Thailand’s highest mountain and surrounding national park.'],
  ['chiang-mai-night-bazaar','Chiang Mai Night Bazaar','Chiang Mai','Chiang Mai','Food',18.7856,99.0002,'Popular evening market and shopping streets.'],
  ['wat-phra-singh','Wat Phra Singh','Chiang Mai','Chiang Mai','Culture',18.7893,98.9817,'Historic Buddhist temple in the old city.'],
  ['bua-tong','Bua Tong Sticky Waterfall','Mae Taeng','Chiang Mai','Nature',19.0744,99.0750,'Limestone waterfall with distinctive climbing paths.'],
  ['chiang-dao-cave','Chiang Dao Cave','Chiang Dao','Chiang Mai','Nature',19.3965,98.9277,'Cave system below the Chiang Dao mountains.'],
  ['white-temple','Wat Rong Khun (White Temple)','Chiang Rai','Chiang Rai','Culture',19.8243,99.7631,'Contemporary white temple and art landmark.'],
  ['blue-temple','Wat Rong Suea Ten (Blue Temple)','Chiang Rai','Chiang Rai','Culture',19.9271,99.8390,'Vivid blue contemporary Buddhist temple.'],
  ['black-house','Baan Dam Museum (Black House)','Chiang Rai','Chiang Rai','Culture',20.0177,99.8540,'Collection of dark wooden structures and art.'],
  ['singha-park','Singha Park Chiang Rai','Chiang Rai','Chiang Rai','Nature',19.8504,99.7457,'Scenic agricultural park and leisure destination.'],
  ['doi-tung','Doi Tung Royal Villa','Mae Fa Luang','Chiang Rai','Culture',20.2859,99.8088,'Royal villa and mountain gardens.'],
  ['golden-triangle','Golden Triangle Viewpoint','Chiang Saen','Chiang Rai','Nature',20.3531,100.0811,'Viewpoint near the Thailand–Laos–Myanmar border.'],
  ['phu-chi-fa','Phu Chi Fa Viewpoint','Thoeng','Chiang Rai','Nature',19.8468,100.4466,'High mountain ridge known for sunrise viewpoints.'],
  ['pai-canyon','Pai Canyon','Pai','Mae Hong Son','Nature',19.3450,98.4564,'Narrow scenic ridges overlooking Pai valley.'],
  ['pang-ung','Pang Ung Reservoir','Mueang Mae Hong Son','Mae Hong Son','Nature',19.4807,97.9185,'Mountain reservoir surrounded by pine forest.'],
  ['wat-phumin','Wat Phumin','Nan','Nan','Culture',18.7750,100.7720,'Historic Nan temple known for mural paintings.'],
  // Northeast
  ['khao-yai','Khao Yai National Park Visitor Center','Pak Chong','Nakhon Ratchasima','Nature',14.4412,101.3730,'Forested national park with wildlife and hiking.'],
  ['phu-kradueng','Phu Kradueng National Park','Phu Kradueng','Loei','Nature',16.8849,101.8068,'Plateau mountain national park with hiking routes.'],
  ['red-lotus-sea','Red Lotus Sea (Talay Bua Daeng)','Kumphawapi','Udon Thani','Nature',17.2583,103.1045,'Seasonal pink-water-lily lake and boat sightseeing.'],
  ['sam-phan-bok','Sam Phan Bok','Pho Sai','Ubon Ratchathani','Nature',15.7922,105.3921,'Rock formations exposed along the Mekong River.'],
  // East coast
  ['sanctuary-truth','Sanctuary of Truth','Pattaya','Chonburi','Culture',12.9720,100.8887,'Intricately carved wooden seaside sanctuary.'],
  ['nong-nooch','Nong Nooch Tropical Garden','Sattahip','Chonburi','Nature',12.7661,100.9323,'Large tropical botanical and landscaped gardens.'],
  ['tawaen-beach','Tawaen Beach (Koh Larn)','Koh Larn','Chonburi','Nature',12.9234,100.7773,'Popular swimming beach on Koh Larn.'],
  ['sai-kaew-samet','Sai Kaew Beach (Koh Samet)','Koh Samet','Rayong','Nature',12.5714,101.4668,'White-sand swimming beach on Koh Samet.'],
  ['white-sand-chang','White Sand Beach (Koh Chang)','Koh Chang','Trat','Nature',12.0998,102.2801,'Popular west-coast beach on Koh Chang.'],
  ['klong-chao-kood','Klong Chao Beach (Koh Kood)','Koh Kood','Trat','Nature',11.6344,102.5645,'Quiet island beach with soft sand.'],
  // West & Gulf
  ['hua-hin-beach','Hua Hin Beach','Hua Hin','Prachuap Khiri Khan','Nature',12.5678,99.9593,'Long beach in the historic resort town.'],
  ['phraya-nakhon','Phraya Nakhon Cave','Sam Roi Yot','Prachuap Khiri Khan','Nature',12.2002,100.0114,'Cave containing a celebrated royal pavilion.'],
  ['ao-manao','Ao Manao Beach','Mueang Prachuap Khiri Khan','Prachuap Khiri Khan','Nature',11.7817,99.8153,'Curving beach by the limestone headlands.'],
  // Southern Thailand
  ['khao-sok','Khao Sok National Park','Phanom','Surat Thani','Nature',8.9140,98.5300,'Rainforest national park and limestone scenery.'],
  ['cheow-lan','Cheow Lan Lake','Ban Ta Khun','Surat Thani','Nature',8.9914,98.8138,'Reservoir with dramatic limestone cliffs.'],
  ['big-buddha-samui','Big Buddha Temple (Wat Phra Yai)','Koh Samui','Surat Thani','Culture',9.5711,100.0609,'Golden seated Buddha on Koh Samui.'],
  ['ang-thong','Mu Ko Ang Thong National Marine Park','Koh Samui','Surat Thani','Nature',9.6304,99.6871,'Protected island archipelago and viewpoints.'],
  ['haad-rin','Haad Rin Beach (Koh Phangan)','Koh Phangan','Surat Thani','Nature',9.6756,100.0670,'Beach at the southern tip of Koh Phangan.'],
  ['sairee-tao','Sairee Beach (Koh Tao)','Koh Tao','Surat Thani','Nature',10.0966,99.8271,'Long west-coast beach on Koh Tao.'],
  ['phuket-big-buddha','Big Buddha Phuket','Chalong','Phuket','Culture',7.8277,98.3127,'Large Buddha statue on the Nakkerd Hills.'],
  ['patong','Patong Beach','Patong','Phuket','Nature',7.8966,98.2963,'Busy beachfront and resort district.'],
  ['promthep','Promthep Cape','Rawai','Phuket','Nature',7.7588,98.3031,'Southern Phuket coastal viewpoint.'],
  ['phuket-old-town','Phuket Old Town','Mueang Phuket','Phuket','Culture',7.8865,98.3865,'Historic Sino-Portuguese town streets.'],
  ['railay','Railay Beach','Ao Nang','Krabi','Nature',8.0105,98.8373,'Limestone cliffs and beach accessible by boat.'],
  ['ao-nang','Ao Nang Beach','Ao Nang','Krabi','Nature',8.0321,98.8238,'Tourist beach and gateway to island trips.'],
  ['maya-bay','Maya Bay (Phi Phi Leh)','Phi Phi Islands','Krabi','Nature',7.6790,98.7668,'Sheltered turquoise bay framed by high cliffs.'],
  ['emerald-pool','Emerald Pool (Sa Morakot)','Khlong Thom','Krabi','Nature',7.9240,99.2691,'Natural green-hued swimming pool in a forest.'],
  ['james-bond','James Bond Island (Khao Phing Kan)','Ko Panyi','Phang Nga','Nature',8.2759,98.5011,'Rock pinnacle and island landscape in Phang Nga Bay.'],
  ['similan','Similan Islands National Park','Khura Buri','Phang Nga','Nature',8.6520,97.6471,'Island group known for snorkeling and marine wildlife.'],
  ['emerald-cave','Emerald Cave (Morakot Cave)','Koh Mook','Trang','Nature',7.3679,99.2900,'Sea cave leading to a hidden lagoon.'],
  ['koh-lipe','Pattaya Beach (Koh Lipe)','Koh Lipe','Satun','Nature',6.4874,99.3007,'White-sand beach on Koh Lipe.'],
  ['wat-mahathat-nakhon','Wat Phra Mahathat Woramahawihan','Mueang Nakhon Si Thammarat','Nakhon Si Thammarat','Culture',8.4116,99.9655,'Major historic temple of southern Thailand.'],
  ['samila','Samila Beach','Songkhla','Songkhla','Nature',7.2143,100.6055,'Seafront beach and Songkhla mermaid statue.'],
];

export const POPULAR_THAILAND_PLACES = SEEDS.map(([slug, name, locality, administrativeArea, category, latitude, longitude, description], index) => ({
  id: `featured-${slug}`,
  name,
  locality,
  administrativeArea,
  countryCode: 'TH',
  category,
  description,
  estimatedCost: null,
  estimatedCostNote: 'Entrance fee not verified; check directly before visiting.',
  latitude,
  longitude,
  googleSearchQuery: `${name}, ${administrativeArea}, Thailand`,
  sourceReference: 'TravelM editorial discovery selection; coordinates are approximate, not field-verified',
  lastCheckedAt: null,
  contentStatus: 'needs_update',
  popularityOrder: index,
}));
