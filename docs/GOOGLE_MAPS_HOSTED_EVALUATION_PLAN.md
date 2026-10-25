# Travel-M Google Maps hosted evaluation rollout — 25 October 2026

## Goal
Deploy the React application's Google Maps-backed map UI to the existing
Travel-M VPS host, without losing the static server hardening or user data.

## Constraints
- **Maps Demo Keys are not licensed for production use.** The live URL is used
  for educational evaluation only until a standard Maps Platform key with
  billing and HTTP referrer/API restrictions is available.
- Keep browser-only trip data untouched. Deploy static assets only.
- Preserve VPS security headers, real 404s and ETag/caching behavior.
- Never print or commit the API key. Vite browser keys are visible in browser
  requests; .env.local is only protection against accidental source disclosure.
- Back up current hosted assets and server file before replacing them.

## Deployment sequence
1. Bring server/static-server.js in sync with the already-hardened VPS version.
2. Add an explicit --evaluation-google opt-in to the otherwise-blocking public
   deploy script; keep production deploys blocked while using Demo Keys.
3. Build and run tests, lint, and real browser smoke on the local React app.
4. Snapshot the current VPS deployment, ship the new static assets, restart
   only Travel-M, then validate the public site in a browser.
5. If the map fails, restore the VPS snapshot and leave the site running.

## Completion
- [x] Test/build pass (54/54 Node tests, build, and 3 nonfatal lint warnings)
- [x] VPS backup created before deployment (first backup retains literal
  `dist.rollback-$stamp` name due to a quoting bug, corrected in deploy script
  for subsequent releases)
- [x] New build deployed with `--evaluation-google`
- [x] Public browser verified Google Maps on Discover and Place Details;
  sampled 200 / 12,397 map markers
- [x] Deep-link 200, unknown asset 404, ETag and headers confirmed
- [x] Full authenticated planner E2E regression (**60/60** on final run):
  login, trips, itinerary, packing, expenses, weather route, navigation,
  and mobile layout passed. The sole failed check was a missing favicon
  resource on the first run, fixed by adding `public/favicon.svg` and deploying
  it; final rerun had zero page errors and zero console errors.

## Result
Public evaluation host: https://travel-m.xcalibur.space
The live Google Maps implementation is for school testing/evaluation only.
The current Maps Demo Key is prohibited for actual production use under
Google Maps Demo Project Terms. Obtain a standard Maps Platform project/key
before converting this to a production service.
