#!/usr/bin/env python3
"""
Render the exported Stitch design HTML at full size.

The Stitch API hands back a small preview PNG (512x410) for every screen, which is
useless for reviewing a design. The exported screen.html is the real artifact, so
render that in a headless browser at the frame's true width instead.

    python3 scripts/render_design.py
"""
import glob
import os

from playwright.sync_api import sync_playwright

BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
STITCH = os.path.join(ROOT, "design", "stitch")
OUT = os.path.join(ROOT, "design", "renders")

MOBILE_VIEWPORT = {"width": 390, "height": 844}
DESKTOP_VIEWPORT = {"width": 1280, "height": 900}


def targets():
    for path in sorted(glob.glob(os.path.join(STITCH, "**", "screen.html"), recursive=True)):
        rel = os.path.relpath(path, STITCH)
        name = rel.split(os.sep)[0] if os.sep in rel else rel.replace(os.sep, "-")
        parts = rel.split(os.sep)
        # design/stitch/mobile/home-mobile/screen.html -> mobile-home-mobile
        if len(parts) == 3:
            name = f"{parts[0]}-{parts[1]}"
        else:
            name = parts[0]
        is_mobile = path.endswith(os.path.join("mobile", os.path.basename(os.path.dirname(path)), "screen.html"))
        yield name, path, MOBILE_VIEWPORT if is_mobile else DESKTOP_VIEWPORT


def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = list(targets())
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=BRAVE, headless=True)
        for name, path, viewport in jobs:
            page = browser.new_context(viewport=viewport, device_scale_factor=2).new_page()
            page.goto("file://" + os.path.abspath(path), wait_until="networkidle")
            page.wait_for_timeout(2500)
            out = os.path.join(OUT, f"{name}.png")
            page.screenshot(path=out, full_page=True)
            print(f"{name:28s} viewport {viewport['width']}x{viewport['height']} -> {os.path.relpath(out)}")
            page.close()
        browser.close()


if __name__ == "__main__":
    main()
