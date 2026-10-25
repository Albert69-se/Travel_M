#!/usr/bin/env python3
"""
End-to-end verification of the built Travel M (React) app in a real browser.

Runs Brave headless against a throwaway profile (never the user's running Brave,
which holds a write lock on its own profile), walks the routes, signs in with the
demo account and asserts on rendered text rather than on HTTP status codes — a
build can serve 200 for every route and still render nothing.

    python3 scripts/e2e.py [baseUrl]      # default http://127.0.0.1:8899
"""
import re
import sys
import tempfile
import time

from playwright.sync_api import sync_playwright
from urllib.parse import urlparse

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8899"
BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"

PASS, FAIL = [], []


def check(label, condition, detail=""):
    if condition:
        PASS.append(label)
        print(f"  ok   {label}")
    else:
        FAIL.append(label)
        print(f"  FAIL {label} {detail}")


def text_of(page):
    return page.evaluate("document.body.innerText")


def path_of(page):
    """Path only — comparing rstrip('/') strings gets the root route wrong."""
    return urlparse(page.url).path or "/"


def main():
    console_errors, page_errors = [], []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=BRAVE, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.on("console", lambda m: console_errors.append(f"{m.type}: {m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda e: page_errors.append(str(e)))

        # ---------------------------------------------------------------- guest
        print("-- guest")
        page.goto(BASE + "/", wait_until="domcontentloaded")
        time.sleep(1.2)
        home = text_of(page)
        check("guest home renders the wordmark", "Travel M" in home)
        check("guest home states what needs an account", re.search(r"account", home, re.I) is not None)
        check("guest home publishes the demo credentials", "demo@travelm.local" in home)
        check("React actually mounted content", len(page.evaluate("document.getElementById('root').innerHTML")) > 2000)

        # -------------------------------------------------------------- discover
        print("-- discover")
        page.goto(BASE + "/discover", wait_until="domcontentloaded")
        time.sleep(2.0)
        disc = text_of(page)
        check("discover lists editorial places", "The Grand Palace" in disc)
        check("discover shows the data caveat", re.search(r"coordinates and fees are approximate", disc, re.I) is not None)
        check("discover labels the editorial catalog", re.search(r"editorial picks", disc, re.I) is not None)
        check("discover pages the result list", re.search(r"Showing \d+ of [\d,]+ results", disc) is not None)
        check("discover offers the province filter", page.evaluate("!!document.querySelector('select')"))
        chips = page.eval_on_selector_all("button", "els => els.map(e => e.innerText.trim())")
        for expected in ["All", "Nature", "Culture", "Food"]:
            check(f"filter chip '{expected}' present", expected in chips)
        check("map container mounted", page.evaluate("!!document.querySelector('.leaflet-container, .gm-style')"))
        check("regional groups are visible", page.locator('.tm-cluster').count() > 0)
        check("the map explains regional groups", "select a group to explore" in text_of(page))
        check("location permission control is available", page.get_by_role("button", name="Use my location", exact=True).count() == 1)
        page.get_by_label("Filter by province").select_option("Chiang Mai")
        time.sleep(1)

        # The list scrolls, so bring the last rows into view to load every photo.
        page.evaluate("const el = document.querySelector('.tm-scroll'); if (el) el.scrollTop = el.scrollHeight;")
        for _ in range(24):
            states = page.evaluate(
                "Array.from(document.querySelectorAll('main img')).filter(i => i.src.includes('thumb.wikimedia.org')).map(i => i.naturalWidth > 0)"
            )
            if len(states) >= 8 and all(states):
                break
            time.sleep(0.5)
        photo_count = page.evaluate("document.querySelectorAll('main img[src*=\"thumb.wikimedia.org\"]').length")
        check("a photograph is rendered for every sample place", photo_count >= 8, f"(count={photo_count})")
        decoded = page.evaluate(
            "Array.from(document.querySelectorAll('main img')).filter(i => i.src.includes('thumb.wikimedia.org') && i.naturalWidth > 0).length"
        )
        check("place photographs decoded from the Wikimedia CDN", decoded >= 8, f"({decoded}/{photo_count} decoded)")

        # ------------------------------------------------------ place photograph
        print("-- place detail photograph")
        page.goto(BASE + "/discover/place-doi-suthep", wait_until="domcontentloaded")
        time.sleep(2.2)
        detail_text = text_of(page)
        check("place detail credits the photograph author", "jj harrison" in detail_text.lower())
        check("place detail states the photograph licence", "cc by-sa 3.0" in detail_text.lower())
        check(
            "place detail links the Commons file page",
            page.evaluate("!!document.querySelector('main a[href*=\"commons.wikimedia.org/wiki/File:\"]')"),
        )
        hero_ok = page.evaluate(
            "Array.from(document.querySelectorAll('main img')).some(i => i.src.includes('thumb.wikimedia.org') && i.naturalWidth > 0)"
        )
        check("a place photograph decoded on the detail page", hero_ok)

        # ------------------------------------ imported place record (OSM)
        print("-- imported place detail (OpenStreetMap record)")
        page.goto(BASE + "/discover/osm-n4362844842", wait_until="domcontentloaded")
        time.sleep(2.4)
        imported = text_of(page)
        check("an imported record renders by direct link", "Buddha Statue" in imported)
        check("the imported record carries its OSM provenance", re.search(r"openstreetmap", imported, re.I) is not None)
        check("the imported record is not presented as verified", re.search(r"not verified", imported, re.I) is not None)

        # ---------------------------------------------------------------- sign in
        print("-- sign in (demo account, PBKDF2 in the browser)")
        page.goto(BASE + "/signin", wait_until="domcontentloaded")
        time.sleep(0.6)
        clicked = False
        for pattern in [re.compile("demo", re.I), re.compile("log in with demo", re.I)]:
            try:
                page.get_by_role("button", name=pattern).first.click(timeout=3000)
                clicked = True
                break
            except Exception:
                continue
        check("demo sign-in control clicked", clicked)
        time.sleep(3.0)
        signed = text_of(page)
        check("signed-in home shows the seeded trip", "Chiang Mai" in signed)
        check("budget is rendered from the records", "5,000" in signed or "5000" in signed)
        check("spent total is rendered", "1,950" in signed or "1950" in signed)

        # ----------------------------------------------------------- trip routes
        print("-- trip sub-routes")
        trip = "trip-weekend-chiang-mai"
        for route, needles, label in [
            (f"/trips/{trip}", ["Chiang Mai"], "overview"),
            (f"/trips/{trip}/itinerary", ["Day 1", "Old City Gate"], "itinerary"),
            (f"/trips/{trip}/packing", ["packed"], "packing"),
            (f"/trips/{trip}/expenses", ["Total spent", "1,950"], "expenses"),
            (f"/trips/{trip}/weather", [], "weather"),
        ]:
            page.goto(BASE + route, wait_until="domcontentloaded")
            time.sleep(2.5 if "weather" in route else 1.0)
            body = text_of(page)
            for needle in needles:
                check(f"{label}: contains '{needle}'", needle.lower() in body.lower())
            if label == "itinerary":
                check(
                    "itinerary renders no invented clock time",
                    re.search(r"\b\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}\b", body) is None,
                    "(a time range appeared)",
                )

        print("-- saved places")
        page.goto(BASE + "/saved", wait_until="domcontentloaded")
        time.sleep(1.0)
        check("saved places page renders", "saved" in text_of(page).lower())

        print("-- account")
        page.goto(BASE + "/account", wait_until="domcontentloaded")
        time.sleep(1.0)
        acct = text_of(page)
        check("account shows the signed-in user", "demo@travelm.local" in acct)
        check("account explains where records live", "localStorage" in acct or "browser" in acct.lower())

        print("-- in-app navigation (client-side clicks, not URL loads)")
        page.goto(BASE + "/trips", wait_until="domcontentloaded")
        time.sleep(1.2)
        errors_before = len(page_errors)
        trip_link = page.locator('main a[href^="/trips/"]').first
        if trip_link.count():
            trip_link.click()
            time.sleep(1.6)
            check("clicking a trip card opens the trip", "/trips/" in path_of(page))
            check("shell survives navigation into a trip", page.evaluate("!!document.querySelector('nav')"))
            for tab in ["itinerary", "packing", "expenses", "weather"]:
                link = page.locator(f'main a[href$="/{tab}"]').first
                if not link.count():
                    check(f"trip tab '{tab}' link present", False)
                    continue
                link.click()
                time.sleep(2.2 if tab == "weather" else 1.0)
                check(f"trip tab '{tab}' via click", path_of(page).endswith(f"/{tab}"))
            # leaving a trip route is the case that used to blank the app
            back = page.locator('main a[href="/trips"]').first
            if back.count():
                back.click()
                time.sleep(1.5)
                check("clicking back to My trips exits cleanly", path_of(page) == "/trips")
                check(
                    "trip content visible after leaving a trip route",
                    "My trips" in text_of(page) or "trip" in text_of(page).lower(),
                )
            else:
                check("breadcrumb link back to /trips present", False)
        else:
            check("trip card link found on /trips", False, "(no main a[href^=/trips/])")
        check(
            "no uncaught errors during in-app trip navigation",
            len(page_errors) == errors_before,
            f"({page_errors[errors_before:][:2]})",
        )

        print("-- client-side entry from the dashboard and discover")
        for start, selector, expect in [("/", 'main a[href^="/trips/"]', "/trips/"), ("/discover", 'main a[href^="/discover/"]', "/discover/")]:
            page.goto(BASE + start, wait_until="domcontentloaded")
            time.sleep(1.6)
            before = len(page_errors)
            link = page.locator(selector).first
            if link.count():
                link.click()
                time.sleep(1.6)
                check(f"click from {start} reaches {expect}", expect in path_of(page))
                page.go_back()
                time.sleep(1.2)
                check(f"back from {expect} returns to {start}", path_of(page) == start)
            else:
                check(f"link present on {start}", False, f"({selector})")
            check(f"no uncaught errors from {start}", len(page_errors) == before, f"({page_errors[before:][:2]})")

        # ---------------------------------------------------------------- mobile
        print("-- mobile 390x844")
        page.set_viewport_size({"width": 390, "height": 844})
        for route in ["/", "/discover", f"/trips/{trip}/itinerary"]:
            page.goto(BASE + route, wait_until="domcontentloaded")
            time.sleep(1.5)
            overflow = page.evaluate("document.documentElement.scrollWidth")
            check(f"no horizontal overflow at 390px on {route}", overflow <= 391, f"(scrollWidth={overflow})")
        check("bottom tab bar present on mobile", page.evaluate("!!document.querySelector('nav')"))

        browser.close()

    print("\n-- console errors")
    real_console = [e for e in console_errors if "favicon" not in e.lower()]
    if real_console:
        for e in real_console[:12]:
            print("   ", e[:220])
    check("no uncaught page errors", not page_errors, f"({page_errors[:3]})")
    check("no console errors", not real_console, f"({len(real_console)} seen)")

    print(f"\npassed {len(PASS)}, failed {len(FAIL)}")
    if FAIL:
        print("failed checks:", FAIL)
        sys.exit(1)


if __name__ == "__main__":
    main()
