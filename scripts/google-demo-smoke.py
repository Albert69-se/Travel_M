#!/usr/bin/env python3
"""Browser smoke test for the React Maps demo (no API key is printed)."""
import sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5180"
BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"

def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=BRAVE, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        errors = []
        not_found = []
        page.on("response", lambda response: not_found.append(
            f"{urlparse(response.url).netloc}{urlparse(response.url).path}"
        ) if response.status == 404 else None)
        page.on("pageerror", lambda err: errors.append(str(err).split("key=")[0]))
        page.goto(BASE + "/discover", wait_until="domcontentloaded")
        page.get_by_role("heading", name="Discover places").wait_for(timeout=15000)
        page.wait_for_function(
            "() => !!document.querySelector('.gm-style, .leaflet-container')",
            timeout=25000,
        )
        provider = page.evaluate(
            "() => document.querySelector('.gm-style') ? 'Google Maps' : "
            "document.querySelector('.leaflet-container') ? 'OpenStreetMap fallback' : 'none'"
        )
        page.wait_for_timeout(4500)
        text = page.locator("main").inner_text()
        assert "Discover places" in text
        print(f"Discover: {provider}, has regional group hint={('select a group to explore' in text)}", flush=True)
        assert "select a group to explore" in text, 'Nationwide view must show actionable regional groups'
        page.goto(BASE + "/discover/place-doi-suthep", wait_until="domcontentloaded")
        page.get_by_role("heading", name="Doi Suthep").wait_for(timeout=15000)
        map_link = page.get_by_role("link", name="View in Google Maps")
        directions = page.get_by_role("link", name="Get directions")
        assert "www.google.com/maps/search" in map_link.get_attribute("href")
        assert "www.google.com/maps/dir" in directions.get_attribute("href")
        page.wait_for_function(
            "() => !!document.querySelector('.gm-style, .leaflet-container')",
            timeout=25000,
        )
        print("Place details: map + Google Maps viewing and directions links present")
        page.goto(BASE + "/discover/featured-white-temple", wait_until="domcontentloaded")
        page.get_by_role("heading", name="Wat Rong Khun (White Temple)").wait_for(timeout=15000)
        print(f"HTTP 404 resource paths: {not_found[:8]}")
        assert not errors, f"uncaught page errors: {errors[:3]}"
        print("PASS")
        browser.close()

if __name__ == "__main__":
    main()
