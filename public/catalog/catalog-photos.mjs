import { fetchCommonsPhoto } from './photo-source.mjs';

/** Per-element lifecycle keeps a slow response from painting a different place. */
function loadPhoto(host, place, hero) {
  fetchCommonsPhoto(place).then(photo => {
    if (!host.isConnected || !photo) return;
    const img = document.createElement('img');
    img.alt = place.name;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = photo.src;
    const credit = document.createElement('a');
    credit.href = photo.source;
    credit.target = '_blank';
    credit.rel = 'noopener noreferrer';
    credit.textContent = `${photo.credit} · ${photo.licence}`;
    credit.title = `Photo: ${credit.textContent} · Wikimedia Commons`;
    const original = [...host.childNodes];
    img.onerror = () => host.replaceChildren(...original);
    host.replaceChildren(img, credit);
    host.classList.toggle('photo-hero', hero);
  }).catch(() => {});
}

let observer;
const targets = new WeakMap();
export function observePhotos(root, places) {
  if (typeof IntersectionObserver !== 'undefined' && !observer) {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        const item = targets.get(entry.target);
        if (item) loadPhoto(entry.target, item.place, item.hero);
      }
    }, { rootMargin: '120px' });
  }
  // Rebuilt result lists must release detached observer targets.
  observer?.disconnect();
  for (const host of root.querySelectorAll('[data-photo]')) {
    const place = places.find(p => p.id === host.dataset.photo);
    if (!place) continue;
    const hero = host.classList.contains('photo-hero');
    targets.set(host, { place, hero });
    if (observer) observer.observe(host);
    else loadPhoto(host, place, hero);
  }
}
