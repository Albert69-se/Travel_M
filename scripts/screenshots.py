#!/usr/bin/env python3
"""
Capture screenshots of the live Travel M build for review.

Signs in with the demo account so the signed-in surfaces are captured rather than
just the guest state, then writes PNGs to design/screenshots/.

    python3 scripts/screenshots.py [baseUrl]
"""
import os
import sys
import time

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://travel-m.xcalibur.space"
BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "design", "screenshots")
TRIP = "trip-weekend-chiang-mai"

DESKTOP = [
    ("home", "/"),
    ("discover", "/discover"),
    ("trip-overview", f"/trips/{TRIP}"),
    ("itinerary", f"/trips/{TRIP}/itinerary"),
    ("packing", f"/trips/{TRIP}/packing"),
    ("expenses", f"/trips/{TRIP}/expenses"),
    ("weather", f"/trips/{TRIP}/weather"),
    ("account", "/account"),
]
MOBILE = [("home-mobile", "/"), ("discover-mobile", "/discover"), ("itinerary-mobile", f"/trips/{TRIP}/itinerary")]


def main():
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=BRAVE, headless=True)
        page = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2).new_page()

        # sign in once; localStorage persists for the rest of the session
        page.goto(BASE + "/signin", wait_until="networkidle")
        time.sleep(0.6)
        page.get_by_role("button", name="demo").first.click(timeout=5000)
        time.sleep(3)

        for name, route in DESKTOP:
            page.goto(BASE + route, wait_until="networkidle")
            time.sleep(2.6 if "weather" in route or route == "/discover" else 1.2)
            path = os.path.join(OUT, f"desktop-{name}.png")
            page.screenshot(path=path, full_page=True)
            print(f"wrote {os.path.relpath(path)}")

        page.set_viewport_size({"width": 390, "height": 844})
        for name, route in MOBILE:
            page.goto(BASE + route, wait_until="networkidle")
            time.sleep(2.4 if route == "/discover" else 1.4)
            path = os.path.join(OUT, f"{name}.png")
            page.screenshot(path=path, full_page=True)
            print(f"wrote {os.path.relpath(path)}")

        browser.close()


if __name__ == "__main__":
    main()
