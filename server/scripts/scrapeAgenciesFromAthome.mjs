/**
 * Scrapes unique agencies from athome.lu listing pages (no Playwright needed — raw HTML works).
 * Fetches pages 1-80 of rent listings, extracts unique agencies from contact fields.
 * Run: node scripts/scrapeAgenciesFromAthome.mjs
 * Output: src/data/agenciesStatic.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../src/data/agenciesStatic.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-GB,en;q=0.9',
};

const LUX_COMMUNES = [
  'Luxembourg', 'Limpertsberg', 'Kirchberg', 'Gasperich', 'Bonnevoie',
  'Hollerich', 'Clausen', 'Grund', 'Pfaffenthal', 'Weimerskirch', 'Belair',
  'Cessange', 'Merl', 'Strassen', 'Bertrange', 'Hesperange', 'Cents', 'Hamm',
  'Rollingergrund', 'Gare', 'Dommeldange', 'Muhlenbach', 'Neudorf',
  'Eich', 'Beggen', 'Bouillon', 'Fetschenhof', 'Findel',
  // Other communes
  'Esch-sur-Alzette', 'Esch', 'Differdange', 'Dudelange', 'Ettelbruck',
  'Diekirch', 'Wiltz', 'Echternach', 'Remich', 'Grevenmacher',
  'Mondorf-les-Bains', 'Mersch', 'Steinsel', 'Niederanven', 'Sandweiler',
  'Schifflange', 'Bettembourg', 'Leudelange', 'Mamer', 'Kehlen',
  'Kopstal', 'Lorentzweiler', 'Walferdange', 'Junglinster', 'Frisange',
  'Roeser', 'Mondercange', 'Käerjeng', 'Sanem', 'Pétange', 'Rodange',
  'Belvaux', 'Oberkorn',
];

function extractCommune(city) {
  if (!city) return '';
  // athome city field often like "Luxembourg-Centre-ville" or "Kirchberg"
  // Strip the neighborhood part
  const clean = city.replace(/-.*/, '').trim();
  // Match against known communes
  for (const c of LUX_COMMUNES) {
    if (clean.toLowerCase() === c.toLowerCase()) return c;
    if (city.toLowerCase().includes(c.toLowerCase())) return c;
  }
  return clean;
}

function formatAddress(addr) {
  if (!addr) return '';
  const parts = [addr.street, addr.zip, addr.city].filter(Boolean);
  return parts.join(', ').trim();
}

async function fetchPage(pageNum, transaction = 'rent') {
  const path = transaction === 'rent' ? '/en/rent/' : '/en/buy/';
  const url = `https://www.athome.lu${path}?page=${pageNum}`;

  const resp = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  const html = await resp.text();

  const match = html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]+?);<\/script>/);
  if (!match) return [];

  const raw = match[1].replace(/:\s*undefined/g, ':null');
  let data;
  try { data = JSON.parse(raw); } catch (e) { return []; }

  return data?.search?.listings ?? [];
}

async function run() {
  const agencyMap = new Map(); // id -> agency data

  const fetchGroup = async (transaction, pages) => {
    let newCount = 0;
    for (let page = 1; page <= pages; page++) {
      process.stdout.write(`\r[${transaction}] page ${page}/${pages}  `);
      try {
        const listings = await fetchPage(page, transaction);
        if (listings.length === 0) {
          console.log(`\n[${transaction}] page ${page}: no listings — stopping`);
          break;
        }

        for (const listing of listings) {
          const c = listing.contact;
          if (!c || c.type !== 'agency' || !c.id || agencyMap.has(c.id)) continue;

          const addr = c.address ?? {};
          const city = addr.city ?? '';
          const commune = extractCommune(city);

          agencyMap.set(c.id, {
            name: c.name ?? '',
            address: formatAddress(addr),
            commune,
            phone: c.phone ?? '',
            website: c.website ?? '',
            editusUrl: '',
          });
          newCount++;
        }

        await new Promise(r => setTimeout(r, 400));
      } catch (e) {
        console.warn(`\n[${transaction}] page ${page} error: ${e.message}`);
      }
    }
    return newCount;
  };

  console.log('Scraping rent listings pages 1-80...');
  await fetchGroup('rent', 80);
  console.log(`\nUnique agencies after rent: ${agencyMap.size}`);

  console.log('Scraping buy listings pages 1-40...');
  await fetchGroup('buy', 40);
  console.log(`\nUnique agencies after buy: ${agencyMap.size}`);

  const agencies = Array.from(agencyMap.values())
    .filter(a => a.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`\nTotal unique agencies: ${agencies.length}`);

  if (agencies.length > 0) {
    console.log('\nSample agencies:');
    agencies.slice(0, 5).forEach(a =>
      console.log(`  ${a.name} | ${a.commune} | ${a.phone} | ${a.website}`)
    );
  }

  mkdirSync(join(__dirname, '../src/data'), { recursive: true });
  writeFileSync(OUT, JSON.stringify(agencies, null, 2));
  console.log(`\nSaved ${agencies.length} agencies to ${OUT}`);
}

run().catch(e => { console.error(e); process.exit(1); });
