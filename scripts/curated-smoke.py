#!/usr/bin/env python3
"""Browser smoke for TravelM curated catalog, zoomed-out pins, and photo source."""
import sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://travel-m.xcalibur.space"
BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=BRAVE, headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        errs = []
        console_errors = []
        rejected_calls = []
        page.on("pageerror", lambda err: errs.append(str(err).split("key=")[0]))
        page.on("console", lambda msg: console_errors.append(msg.text.split("key=")[0][:180]) if msg.type == "error" else None)
        page.on("response", lambda response: rejected_calls.append((response.status, urlparse(response.url).netloc, urlparse(response.url).path[:100])) if response.status >= 400 and ('googleapis' in response.url or 'google' in response.url) else None)
        page.goto(BASE + "/discover", wait_until="domcontentloaded")
        page.get_by_role("heading", name="Discover places").wait_for(timeout=15000)
        page.get_by_text("editorial picks", exact=False).wait_for(timeout=12000)
        text = page.locator("main").inner_text()
        assert "61 editorial picks" in text.lower(), text[:300]
        assert "69" in text, text[:300]
        page.wait_for_selector(".gm-style, .leaflet-container", timeout=22000)
        page.wait_for_timeout(2500)
        text = page.locator("main").inner_text()
        assert "select a group to explore" in text, text[-1000:]
        print("Discover: 61 editorial picks + 8 demos; regional groups shown", flush=True)
        # Check an editorial place details page, not an old OSM record.
        page.goto(BASE + "/discover/featured-white-temple", wait_until="domcontentloaded")
        page.get_by_role("heading", name="Wat Rong Khun (White Temple)").wait_for(timeout=14000)
        page.wait_for_selector(".gm-style, .leaflet-container", timeout=22000)
        page.wait_for_timeout(4500)
        photo_hosts = page.locator('main img').evaluate_all("els => els.filter(el => !el.closest('.gm-style, .leaflet-container')).map(el => { try { return new URL(el.src).host; } catch { return ''; } })")
        photo_host_count = len([s for s in photo_hosts if "google" in s or "gstatic" in s])
        no_photo_msg = page.get_by_text("Google Maps photo unavailable for this place").count()
        print("Place detail: attraction images={}, google-place-image-hosts={}, unavailable-text={}".format(len(photo_hosts), photo_host_count, no_photo_msg))
        if photo_host_count:
            assert "Photo from Google Maps" in page.locator("main").inner_text()
        if console_errors:
            print("Browser console errors (sanitized): {}".format(console_errors[:4]))
        if rejected_calls:
            print("Rejected Google requests (status, host, path): {}".format(rejected_calls[:4]))
        if no_photo_msg:
            print("NOTICE: Google Places image not delivered; diagnosing Places library lookup")
            diagnosis = page.evaluate("""async () => {
              try {
                const {Place} = await google.maps.importLibrary('places');
                const result = await Place.searchByText({textQuery:'Wat Rong Khun, Chiang Rai, Thailand',fields:['id','location','displayName'],maxResultCount:4,region:'th'});
                const first = result.places?.[0];
                if (!first) return {state:'ok',results:[]};
                const {Place: PlaceClass} = await google.maps.importLibrary('places');
                const detail = new PlaceClass({id:first.id});
                try {
                  await detail.fetchFields({fields:['photos']});
                  const uri = detail.photos?.[0]?.getURI({maxWidth:420});
                  return {state:'ok',resultName:first.displayName,photoCount:detail.photos?.length||0,photoHost:uri?new URL(uri).hostname:'none',attributions:detail.photos?.[0]?.authorAttributions?.length||0};
                } catch (error) {
                  return {state:'detail-error',resultName:first.displayName,message:String(error.message||error).replace(/AIza[\\w-]{20,}/g,'[redacted]').slice(0,250)};
                }
              } catch (e) {
                return {state:'error',message:String(e.message||e).replace(/AIza[\\w-]{20,}/g,'[redacted]').slice(0,250)};
              }
            }""")
            print('Google Places direct search:', diagnosis)
        assert not errs, errs[:2]
        print("PASS: curated catalog/map/detail browser smoke", flush=True)
        browser.close()

if __name__ == "__main__":
    main()
