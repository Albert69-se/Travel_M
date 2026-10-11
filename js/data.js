/**
 * Sample data and controlled vocabularies.
 *
 * Places are deliberately marked as unverified sample records. The project rule
 * (FR-3.5/3.6, NFR-9) is that a fact without an identifiable source must never be
 * presented as verified, so provenance fields travel with every record.
 */

export const CURRENCY_CODE = 'THB';

export const PLACE_CATEGORIES = ['All', 'Nature', 'Culture', 'Food'];

/** Expense categories, per the project's business rules. */
export const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Accommodation', 'Tickets', 'Shopping', 'Other'];

export const CONTENT_STATUSES = ['draft', 'reviewed', 'approved', 'needs_update'];

/** The demo account. Prototype credentials, printed in the interface on purpose. */
export const DEMO_USER = {
  id: 'user-demo',
  name: 'Demo traveler',
  email: 'demo@travelm.local',
};

export const DEMO_ACCOUNT_PASSWORD = 'demo-pass-1234';

/**
 * Sample attractions. `sourceReference` and `lastCheckedAt` describe where the
 * facts came from; `contentStatus` records review state. Missing information is
 * left explicit rather than filled in.
 */
export const DEFAULT_PLACES = [
  {
    id: 'place-doi-suthep',
    name: 'Doi Suthep',
    locality: 'Chiang Mai',
    administrativeArea: 'Chiang Mai',
    countryCode: 'TH',
    category: 'Culture',
    description: 'Mountain temple above the city, reached by a long staircase. Sample record for the prototype.',
    estimatedCost: 30,
    estimatedCostNote: 'Estimate only — confirm before visiting',
    latitude: 18.8049,
    longitude: 98.9216,
    sourceReference: 'Not supplied',
    lastCheckedAt: null,
    contentStatus: 'needs_update',
  },
  {
    id: 'place-old-city-gate',
    name: 'Old City Gate',
    locality: 'Chiang Mai',
    administrativeArea: 'Chiang Mai',
    countryCode: 'TH',
    category: 'Culture',
    description: 'Historic gate on the east side of the old city wall. Sample record for the prototype.',
    estimatedCost: 0,
    estimatedCostNote: 'Free to view — confirm before visiting',
    latitude: 18.7883,
    longitude: 98.9936,
    sourceReference: 'Not supplied',
    lastCheckedAt: null,
    contentStatus: 'needs_update',
  },
  {
    id: 'place-wat-chedi-luang',
    name: 'Wat Chedi Luang',
    locality: 'Chiang Mai',
    administrativeArea: 'Chiang Mai',
    countryCode: 'TH',
    category: 'Culture',
    description: 'Temple with a large ruined chedi in the old city. Sample record for the prototype.',
    estimatedCost: 40,
    estimatedCostNote: 'Estimate only — confirm before visiting',
    latitude: 18.7869,
    longitude: 98.9868,
    sourceReference: 'Not supplied',
    lastCheckedAt: null,
    contentStatus: 'draft',
  },
  {
    id: 'place-city-museum',
    name: 'City Museum',
    locality: 'Chiang Mai',
    administrativeArea: 'Chiang Mai',
    countryCode: 'TH',
    category: 'Culture',
    description: 'Local history museum covering the city and province. Sample record for the prototype.',
    estimatedCost: 90,
    estimatedCostNote: 'Estimate only — confirm before visiting',
    latitude: 18.7894,
    longitude: 98.9853,
    sourceReference: 'Not supplied',
    lastCheckedAt: null,
    contentStatus: 'draft',
  },
  {
    id: 'place-mae-sa-waterfall',
    name: 'Mae Sa Waterfall',
    locality: 'Mae Rim',
    administrativeArea: 'Chiang Mai',
    countryCode: 'TH',
    category: 'Nature',
    description: 'Tiered waterfall north of the city with walking paths. Sample record for the prototype.',
    estimatedCost: 100,
    estimatedCostNote: 'Estimate only — confirm before visiting',
    latitude: 18.9258,
    longitude: 98.9292,
    sourceReference: 'Sample park listing — not verified',
    lastCheckedAt: '2026-09-01',
    contentStatus: 'reviewed',
  },
  {
    id: 'place-huay-tueng-thao',
    name: 'Huay Tueng Thao Lake',
    locality: 'Chiang Mai',
    administrativeArea: 'Chiang Mai',
    countryCode: 'TH',
    category: 'Nature',
    description: 'Reservoir with walking paths and food stalls. Sample record for the prototype.',
    estimatedCost: 50,
    estimatedCostNote: 'Estimate only — confirm before visiting',
    latitude: 18.8674,
    longitude: 98.9369,
    sourceReference: 'Not supplied',
    lastCheckedAt: null,
    contentStatus: 'draft',
  },
  {
    id: 'place-sunday-market',
    name: 'Sunday Walking Street Market',
    locality: 'Chiang Mai',
    administrativeArea: 'Chiang Mai',
    countryCode: 'TH',
    category: 'Food',
    description: 'Evening street-food and craft market in the old city. Sample record for the prototype.',
    estimatedCost: 150,
    estimatedCostNote: 'Estimate only — depends on spending',
    latitude: 18.7881,
    longitude: 98.9889,
    sourceReference: 'Not supplied',
    lastCheckedAt: null,
    contentStatus: 'draft',
  },
  {
    id: 'place-nimman-food-street',
    name: 'Nimman Food Street',
    locality: 'Chiang Mai',
    administrativeArea: 'Chiang Mai',
    countryCode: 'TH',
    category: 'Food',
    description: 'Cluster of cafes and restaurants near the university area. Sample record for the prototype.',
    estimatedCost: 200,
    estimatedCostNote: 'Estimate only — depends on spending',
    latitude: 18.7967,
    longitude: 98.9673,
    sourceReference: 'Not supplied',
    lastCheckedAt: null,
    contentStatus: 'draft',
  },
];

/** Packing items suggested for a new trip. Every suggestion stays editable. */
export const DEFAULT_PACKING_NAMES = [
  'ID / travel documents',
  'Comfortable walking shoes',
  'Reusable water bottle',
  'Sun protection',
  'Rain layer (check forecast)',
];

/** Sample trip matching the low-fidelity design (12-15 Nov, THB 5,000). */
export const SAMPLE_TRIP = {
  id: 'trip-weekend-chiang-mai',
  userId: DEMO_USER.id,
  name: 'Weekend in Chiang Mai',
  destinationId: 'place-doi-suthep',
  destinationLabel: 'Chiang Mai',
  startDate: '2026-11-12',
  endDate: '2026-11-15',
  expectedBudget: 5000,
  currencyCode: CURRENCY_CODE,
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
};

export const SAMPLE_ITINERARY = [
  {
    id: 'item-day1-old-city-gate',
    tripId: SAMPLE_TRIP.id,
    placeId: 'place-old-city-gate',
    title: 'Old City Gate',
    date: '2026-11-12',
    notes: 'Morning',
    estimatedCost: 0,
    orderIndex: 0,
  },
  {
    id: 'item-day1-city-museum',
    tripId: SAMPLE_TRIP.id,
    placeId: 'place-city-museum',
    title: 'City Museum',
    date: '2026-11-12',
    notes: 'Afternoon',
    estimatedCost: 90,
    orderIndex: 1,
  },
  {
    id: 'item-day2-doi-suthep',
    tripId: SAMPLE_TRIP.id,
    placeId: 'place-doi-suthep',
    title: 'Doi Suthep',
    date: '2026-11-13',
    notes: 'Morning. Allow time for travel.',
    estimatedCost: 30,
    orderIndex: 0,
  },
];

export const SAMPLE_EXPENSES = [
  {
    id: 'expense-transport',
    tripId: SAMPLE_TRIP.id,
    description: 'Local transport',
    amount: 900,
    category: 'Transport',
    date: '2026-11-12',
    notes: '',
  },
  {
    id: 'expense-museum',
    tripId: SAMPLE_TRIP.id,
    description: 'Museum entry',
    amount: 450,
    category: 'Tickets',
    date: '2026-11-12',
    notes: '',
  },
  {
    id: 'expense-meals',
    tripId: SAMPLE_TRIP.id,
    description: 'Meals',
    amount: 600,
    category: 'Food',
    date: '2026-11-13',
    notes: '',
  },
];
