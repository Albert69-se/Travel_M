/**
 * Strict matching for Wikipedia's coordinate-indexed articles.
 * Never turn a nearby landmark's picture into a different attraction's photo.
 */
export function normalizePhotoName(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function selectMatchingArticle(placeName, articles, maxDistance = 650) {
  const aliases = {
    'wat phrathat doi suthep racha worawihan': 'wat phra that doi suthep',
    'doi suthep': 'wat phra that doi suthep',
    'wat rong khun white temple': 'wat rong khun',
  };
  const normalized = normalizePhotoName(placeName);
  const name = aliases[normalized] || normalized;
  if (!name || !Array.isArray(articles)) return null;
  const tokens = name.split(' ');
  return articles
    .filter((article) => {
      const title = normalizePhotoName(article.title);
      const distance = Number(article.dist);
      if (!title || !Number.isFinite(distance) || distance < 0 || distance > maxDistance) return false;
      if (title === name) return true;
      // Permit a longer official name, but not a generic neighbouring article.
      // Two significant common tokens are required for any non-exact match.
      const titleTokens = title.split(' ');
      const common = tokens.filter((token) => token.length >= 3 && titleTokens.includes(token));
      const significant = tokens.filter((token) => token.length >= 3);
      return common.length >= 2 && significant.length > 0 &&
        (common.length / significant.length >= 0.8) &&
        Math.abs(titleTokens.length - tokens.length) <= 1 &&
        (title.includes(name) || name.includes(title));
    })
    .sort((a, b) => a.dist - b.dist)[0] || null;
}

export function plainCredit(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, 240);
}
