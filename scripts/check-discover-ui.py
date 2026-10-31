"""Responsive Discover regression checks against a local preview server."""
import sys
from playwright.sync_api import sync_playwright

base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5174'
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for width in [1440, 768, 390]:
        page.set_viewport_size({'width': width, 'height': 900})
        page.goto(base + '/discover')
        frame = page.frame_locator('iframe[title="Discover places"]')
        frame.locator('.place-row').first.wait_for()
        page.wait_for_timeout(500)  # Allow the embedded catalog to report its height.
        assert frame.locator('.place-row').count() == 24
        assert page.url.endswith('/discover')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert frame.locator('body').evaluate('el => el.scrollWidth <= innerWidth')
        # Use a deliberately oversized image to reproduce intrinsic-size overflow.
        frame.locator('.place-photo').first.evaluate('''el => {
          const img = new Image();
          img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="3600"><rect width="2400" height="3600" fill="#94b6a3"/></svg>');
          el.replaceChildren(img);
        }''')
        assert frame.locator('.place-photo').first.evaluate('''el => {
          const a=el.getBoundingClientRect(), b=el.querySelector('img').getBoundingClientRect();
          return b.width <= a.width+1 && b.height <= a.height+1 && a.height < 400;
        }''')
        page.screenshot(path=f'/tmp/discover-{width}.png')
        target = frame.locator('.place-title').nth(8)
        target.scroll_into_view_if_needed()
        scroll_before = page.evaluate('scrollY')
        target.click()
        frame.locator('.detail-title').wait_for()
        if width == 390:
            assert not frame.locator('.listing').is_visible()
            page.wait_for_timeout(300)
            assert page.locator('iframe[title="Discover places"]').evaluate('el => getComputedStyle(el).position') == 'fixed'
            assert frame.locator('#back-results').is_visible()
            assert frame.locator('#map-wrapper').is_visible()
            frame.locator('#satellite-type').click()
            if frame.locator('#map .gm-style').count():
                assert frame.locator('#satellite-type').get_attribute('aria-pressed') == 'true'
        frame.locator('#back-results').click()
        assert frame.locator('.listing').is_visible()
        if width == 390:
            assert abs(page.evaluate('scrollY') - scroll_before) < 20
        frame.locator('#query').fill('zzzznonexistent')
        assert frame.locator('#empty').is_visible()
        frame.locator('#clear-filters').click()
        assert frame.locator('.place-row').count() == 24
        frame.locator('#province').select_option('Chiang Rai Province')
        assert '100 matching' in frame.locator('#result-count').inner_text()
        frame.locator('#category').select_option('Nature')
        assert all('Nature' in x for x in frame.locator('.place-meta').all_text_contents())
        frame.locator('#clear-filters').click()
        frame.locator('#show-more').click()
        assert frame.locator('.place-row').count() == 48
        frame.locator('.save-mini').first.click()
        assert 'Sign in' in frame.locator('#notice').inner_text()
        print(f'PASS {width}px: containment, selection, back, search, filters, reset, pagination, guest save')
    page.set_viewport_size({'width': 1440, 'height': 900})
    page.goto(base + '/signin')
    page.get_by_role('button', name='Log in with demo account').click()
    page.wait_for_url(base + '/')
    page.get_by_role('link', name='Discover', exact=True).click()
    frame = page.frame_locator('iframe[title="Discover places"]')
    frame.locator('.place-title').first.wait_for()
    name = frame.locator('.place-title').first.inner_text()
    frame.locator('.save-mini').first.click()
    page.get_by_role('link', name='Saved places', exact=True).click()
    page.get_by_role('link', name=name, exact=True).wait_for()
    print('PASS signed-in save synchronizes with app Saved places without reload')
    page.get_by_role('link', name='Discover', exact=True).click()
    frame = page.frame_locator('iframe[title="Discover places"]')
    frame.locator('#map-mode').click()
    try:
        frame.locator('#map .gm-style').wait_for(timeout=15000)
        print('PASS map initializes inside app shell')
    except Exception:
        assert 'unavailable' in frame.locator('#map-caption').inner_text() or 'rejected' in frame.locator('#map-caption').inner_text()
        print('PASS unavailable-map fallback')
    frame.locator('#back-results').click()
    assert frame.locator('.listing').is_visible()
    assert not errors, errors
    browser.close()
