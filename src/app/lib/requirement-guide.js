// M2 SRS v2.0 IDs. These notes describe what to inspect, not a pass verdict.
const fr = {
  1: ['Discover places', 'Explore attractions in a list and on a map. Select a place to inspect it.', 'Live results and maps depend on the provider and connection.'],
  2: ['Search and filter places', 'Search by keyword and narrow results by location or category. Try a search with no matches.', 'Available categories and place data depend on the catalog.'],
  3: ['View sourced place information', 'Open a place to see its available details, location and source information.', 'Hours, fees, history and other details may be missing or unverified; do not describe missing information as verified.'],
  4: ['View destination and trip weather', 'Check current conditions on a place and the forecast on a trip’s Weather screen.', 'Forecasts have a limited date range and depend on the weather provider. Storm incident coverage is not established.'],
  5: ['Create and maintain a trip', 'Create a trip with a name, destination, dates and budget; open it to edit or delete it.', 'Activities are added separately in the itinerary. Deleting a trip also deletes its associated planning records.'],
  6: ['Set a trip budget', 'Enter a non-negative expected budget when creating or editing a trip.', 'Expense changes update the remaining amount without changing the expected budget.'],
  7: ['Organize an itinerary by day', 'Add, edit, move or remove activities on valid trip dates. Saved places can be added to a day.', 'Removing an activity does not delete its place.'],
  8: ['Maintain a packing checklist', 'Add, rename, reorder, check or delete items; changes remain in this browser.', 'Suggestions are a standard list, not tailored to the destination or forecast.'],
  9: ['Record and manage expenses', 'Add, edit, categorize or delete trip expenses. Try an invalid amount to see validation.', 'Expenses belong to the selected trip; amounts must be positive.'],
  10: ['Review spending and warnings', 'See spending, category totals and remaining budget. The warning changes at 80% and when over budget.', 'A scheduled reminder is not provided.'],
};

export function requirementsForPath(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  let ids = [];
  if (path === '/') ids = [1, 2, 4, 5, 6, 7, 8, 9, 10];
  else if (path === '/discover') ids = [1, 2];
  else if (/^\/discover\/[^/]+$/.test(path)) ids = [3, 4];
  else if (path === '/saved') ids = [7];
  else if (path === '/trips') ids = [5, 6];
  else if (/^\/trips\/[^/]+\/itinerary$/.test(path)) ids = [5, 6, 7];
  else if (/^\/trips\/[^/]+\/packing$/.test(path)) ids = [5, 6, 8];
  else if (/^\/trips\/[^/]+\/expenses$/.test(path)) ids = [5, 6, 9, 10];
  else if (/^\/trips\/[^/]+\/weather$/.test(path)) ids = [4, 5, 6];
  else if (/^\/trips\/[^/]+$/.test(path)) ids = [5, 6, 7, 8, 9, 10];
  return ids.map(id => ({ id, title: fr[id][0], explanation: fr[id][1], limitation: fr[id][2] }));
}
