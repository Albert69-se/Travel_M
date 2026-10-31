/**
 * Temporary navigation bridge while the original React source is unavailable.
 * Replaces the old Google-only /discover route with the maintained local catalog.
 * Does not touch React's compiled JS, browser storage or existing deep-link routes.
 */
const catalog = '/catalog/index.html';
if (/^\/discover\/?$/.test(location.pathname)) {
  location.replace(catalog + location.search);
}
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
      event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest?.('a[href]');
  if (!link || link.hasAttribute('download') || link.target && link.target !== '_self') return;
  const target = new URL(link.href, location.href);
  if (target.origin !== location.origin || !/^\/discover\/?$/.test(target.pathname)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  location.assign(catalog + target.search);
}, true);
