#!/usr/bin/env python3
"""Local browser regression: real Google catalog + simulated device GPS.

Uses configured Google APIs (billable). Run explicitly:
  bash scripts/with-playwright.sh google-catalog-smoke.py http://127.0.0.1:5173
Photo absence is reported, never counted as a successful live image delivery.
"""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5173'
BRAVE = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=BRAVE, headless=True)
    context = browser.new_context(viewport={'width': 1400, 'height': 900}, permissions=['geolocation'], geolocation={'latitude': 13.7563, 'longitude': 100.5018, 'accuracy': 15})
    context.add_init_script('''
      window.__activeLocationWatches = new Set();
      const geo = navigator.geolocation;
      const watch = geo.watchPosition.bind(geo), clear = geo.clearWatch.bind(geo);
      geo.watchPosition = (...args) => { const id = watch(...args); window.__activeLocationWatches.add(id); return id; };
      geo.clearWatch = id => { window.__activeLocationWatches.delete(id); clear(id); };
    ''')
    page = context.new_page()
    errors, osm_requests = [], []
    page.on('pageerror', lambda error: errors.append(str(error).split('key=')[0][:120]))
    page.on('request', lambda request: osm_requests.append(True) if 'openstreetmap' in request.url or 'thailand-places.json' in request.url else None)
    page.goto(BASE + '/discover')
    page.get_by_text('200 attractions from Google Maps', exact=False).wait_for(timeout=60000)
    assert '200 places across Thailand' in page.locator('main').inner_text()
    page.wait_for_selector('.gm-style', timeout=20000)
    page.get_by_role('button', name='Use my location', exact=True).click()
    page.get_by_role('button', name='Recenter on me').wait_for(timeout=20000)
    page.wait_for_selector('.tm-location-pin', timeout=15000)
    assert page.evaluate('window.__activeLocationWatches.size') == 1
    context.set_geolocation({'latitude': 18.7883, 'longitude': 98.9853, 'accuracy': 20})
    page.get_by_text('Live location · accurate to about 20 m. Not saved.', exact=True).wait_for(timeout=15000)
    page.get_by_role('button', name='Recenter on me').click()
    page.get_by_role('button', name='Stop location').click()
    assert page.locator('.tm-location-pin').count() == 0
    assert page.evaluate('window.__activeLocationWatches.size') == 0
    page.get_by_role('searchbox', name='Search places').fill('no-matching-place-xyz')
    page.get_by_text('No places match these filters', exact=True).wait_for()
    page.wait_for_selector('.gm-style', timeout=15000)
    page.get_by_role('button', name='Use my location', exact=True).click()
    page.wait_for_selector('.tm-location-pin', timeout=15000)
    page.get_by_role('searchbox', name='Search places').fill('')
    page.wait_for_selector('.tm-place-row', timeout=10000)
    page.wait_for_selector('.tm-location-pin', timeout=15000)
    print('PASS 200 Google attractions; GPS movement, recovery, recenter, stop, empty results and remount', flush=True)

    page.set_viewport_size({'width': 390, 'height': 844})
    # Switching to list unmounts the map and releases the GPS watcher.
    assert page.evaluate('window.__activeLocationWatches.size') == 0
    page.get_by_role('button', name='Map', exact=True).click()
    page.wait_for_selector('.gm-style', timeout=15000)
    page.get_by_role('button', name='Use my location', exact=True).click()
    page.wait_for_selector('.tm-location-pin', timeout=15000)
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    page.screenshot(path='/tmp/travelm-google-gps-mobile.png')
    page.get_by_role('button', name='Stop location').click()
    page.evaluate('''() => Object.defineProperty(navigator, 'geolocation', {configurable: true, value: {
      watchPosition(_ok, fail) { queueMicrotask(() => fail({code: 1})); return 99; }, clearWatch() {}
    }})''')
    page.get_by_role('button', name='Use my location', exact=True).click()
    page.get_by_text('Location permission denied.', exact=False).wait_for()
    assert page.get_by_role('button', name='Use my location', exact=True).is_enabled()
    assert page.locator('.tm-location-pin').count() == 0
    print('PASS mobile layout, watcher cleanup and permission denial', flush=True)

    page.get_by_role('button', name='List', exact=True).click()
    href = page.locator('.tm-place-row a').first.get_attribute('href')
    page.locator('.tm-place-row a').first.click()
    page.wait_for_selector('.gm-style', timeout=15000)
    # Fetch actual photo metadata through the application's adapter, independently
    # of tile images, which must not be mistaken for attraction photographs.
    photo = page.evaluate('''async id => {
      const {resolveGooglePlace} = await import('/src/app/lib/google-places.js');
      const {fetchGooglePlacePhoto} = await import('/src/app/lib/google-photos.js');
      const place = await resolveGooglePlace(id);
      const photo = await fetchGooglePlacePhoto(place, 420);
      return {available: Boolean(photo), hasAuthors: Boolean(photo?.authors?.length)};
    }''', href.split('/')[-1])
    if photo['available']:
      page.get_by_text('Photo from Google Maps', exact=False).wait_for(timeout=20000)
      print('PASS live place photo metadata and attribution', flush=True)
    else:
      page.get_by_text('Place photo unavailable', exact=False).or_(
          page.get_by_text('Wikimedia Commons', exact=False)
      ).first.wait_for(timeout=20000)
      print('PASS Google photo absence handled with Commons or honest placeholder', flush=True)
    assert not errors, errors
    assert not osm_requests, 'Unexpected OpenStreetMap/archive request'
    print('PASS no page errors or OpenStreetMap requests', flush=True)
    browser.close()
