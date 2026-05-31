import { fetchWithPlaywright, extractCommune } from './shared.js';

export interface ScrapedAgency {
  name: string;
  address: string;
  commune: string;
  phone: string;
  website: string;
  editusUrl: string;
}

const BASE = 'https://www.editus.lu';
const PAGE_URL = (n: number) =>
  `${BASE}/en/results/real-estate-council/real-estate-agency-667r?f=17%3ALuxembourg&page=${n}`;

// Ordered by likelihood — Editus has redesigned a few times
const CARD_SELECTORS = [
  'article.result-item',
  '.result-item',
  'li.result',
  '.search-result-item',
  '[data-result]',
  'article[class]',
];

export async function scrapeEditus(): Promise<ScrapedAgency[]> {
  const results: ScrapedAgency[] = [];

  for (let page = 1; page <= 20; page++) {
    const url = PAGE_URL(page);
    console.log(`[editus] page ${page}: ${url}`);

    const $ = await fetchWithPlaywright(url);
    if (!$) {
      console.warn(`[editus] page ${page}: fetch failed — Playwright unavailable or Cloudflare blocked`);
      break;
    }

    const cards = $(CARD_SELECTORS.join(', ')).toArray();

    if (cards.length === 0) {
      const snippet = $.html().slice(2000, 5000);
      console.log(`[editus] page ${page}: 0 cards. HTML[2k-5k]: ${snippet}`);
      break;
    }

    let pageCount = 0;
    for (const card of cards) {
      const el = $(card);

      const nameAnchor = el.find('h2 a, h3 a, .result-title a, .name a, .title a').first();
      const name = (nameAnchor.text().trim()
        || el.find('h2, h3, .result-title, .name, .title').first().text().trim());
      if (!name) continue;

      const href = nameAnchor.attr('href') ?? el.find('a').first().attr('href') ?? '';
      const editusUrl = href.startsWith('http') ? href : href ? `${BASE}${href}` : '';

      const address = el
        .find('.address, .location, address, [class*="address"], [class*="location"], .infos, .info')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim();

      const phoneEl = el.find('a[href^="tel:"]').first();
      const phone = phoneEl.length
        ? (phoneEl.attr('href') ?? '').replace('tel:', '').trim()
        : el.find('[class*="phone"], [class*="tel"], .phone, .mobile').first().text().trim();

      // Website = any external link that isn't editus itself
      const websiteEl = el.find('a[href^="http"], a[href^="//"]').filter((_i, a) => {
        const h = $(a).attr('href') ?? '';
        return !h.includes('editus.lu') && !h.startsWith('tel:') && !h.startsWith('mailto:');
      }).first();
      const website = websiteEl.attr('href') ?? '';

      results.push({
        name,
        address,
        commune: extractCommune(address),
        phone,
        website,
        editusUrl,
      });
      pageCount++;
    }

    console.log(`[editus] page ${page}: ${pageCount} agencies (running total: ${results.length})`);
    if (pageCount === 0) break;

    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`[editus] scrape done: ${results.length} agencies`);
  return results;
}
