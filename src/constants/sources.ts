export type SourceCategory = 'portal' | 'network' | 'agency';

export type SourceMeta = {
  label: string;
  bg: string;
  text: string;
  category: SourceCategory;
  url: string;
};

export const SOURCE_META: Record<string, SourceMeta> = {
  athome:        { label: 'atHome',      bg: 'bg-blue-100',    text: 'text-blue-700',    category: 'portal',  url: 'https://www.athome.lu' },
  immotop:       { label: 'Immotop',     bg: 'bg-purple-100',  text: 'text-purple-700',  category: 'portal',  url: 'https://www.immotop.lu' },
  vivi:          { label: 'Vivi',        bg: 'bg-teal-100',    text: 'text-teal-700',    category: 'portal',  url: 'https://www.vivi.lu' },
  properstar:    { label: 'Properstar',  bg: 'bg-cyan-100',    text: 'text-cyan-700',    category: 'portal',  url: 'https://www.properstar.com' },
  immodirekt:    { label: 'Immodirekt',  bg: 'bg-orange-100',  text: 'text-orange-700',  category: 'portal',  url: 'https://www.immodirekt.lu' },
  luxresidence:  { label: 'LuxRes.',     bg: 'bg-blue-100',    text: 'text-blue-800',    category: 'portal',  url: 'https://www.luxresidence.lu' },
  atisimmo:      { label: 'Atis',        bg: 'bg-teal-100',    text: 'text-teal-800',    category: 'agency',  url: 'https://www.atisimmo.lu' },
  remax:         { label: 'RE/MAX',      bg: 'bg-red-100',     text: 'text-red-700',     category: 'network', url: 'https://www.remax.lu' },
  engelvoelkers: { label: 'E&V',         bg: 'bg-yellow-100',  text: 'text-yellow-700',  category: 'network', url: 'https://www.engelvoelkers.com' },
  kw:            { label: 'KW',          bg: 'bg-red-100',     text: 'text-red-800',     category: 'network', url: 'https://www.kwluxembourg.com' },
  barnes:        { label: 'BARNES',      bg: 'bg-slate-100',   text: 'text-slate-700',   category: 'network', url: 'https://www.barnes-luxembourg.com' },
  newimmo:       { label: 'New Immo',    bg: 'bg-orange-100',  text: 'text-orange-700',  category: 'agency',  url: 'https://www.newimmo.lu' },
  beckimmo:      { label: 'Beck',        bg: 'bg-emerald-100', text: 'text-emerald-700', category: 'agency',  url: 'https://www.beckimmo.lu' },
  lagence:       { label: "L'Agence",    bg: 'bg-pink-100',    text: 'text-pink-700',    category: 'agency',  url: 'https://www.lagence.lu' },
  fortimmo:      { label: 'Forte',       bg: 'bg-violet-100',  text: 'text-violet-700',  category: 'agency',  url: 'https://www.fortimmo.lu' },
  homein:        { label: 'Home-In',     bg: 'bg-green-100',   text: 'text-green-700',   category: 'agency',  url: 'https://www.homein.lu' },
  residence:     { label: 'Residence',   bg: 'bg-indigo-100',  text: 'text-indigo-700',  category: 'agency',  url: 'https://www.residence.lu' },
  fischbach:     { label: 'Fischbach',   bg: 'bg-amber-100',   text: 'text-amber-700',   category: 'agency',  url: 'https://www.fischbach.lu' },
  movein:        { label: 'Move-In',     bg: 'bg-lime-100',    text: 'text-lime-700',    category: 'agency',  url: 'https://www.move-in.lu' },
  castel:        { label: 'Castel',      bg: 'bg-rose-100',    text: 'text-rose-700',    category: 'agency',  url: 'https://www.castel-immo.lu' },
  rollinger:     { label: 'Rollinger',   bg: 'bg-sky-100',     text: 'text-sky-700',     category: 'agency',  url: 'https://www.rollinger.lu' },
  meiermm:       { label: 'Meier MM',    bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', category: 'agency',  url: 'https://www.agencemm.lu' },
  kloe:          { label: 'KLOE',        bg: 'bg-stone-100',   text: 'text-stone-700',   category: 'agency',  url: 'https://www.kloe.lu' },
};

const FALLBACK: SourceMeta = { label: 'Other', bg: 'bg-slate-100', text: 'text-slate-600', category: 'agency', url: '#' };

export function getSourceMeta(source: string): SourceMeta {
  return SOURCE_META[source] ?? FALLBACK;
}

// Only scrapers that are active and returning results
export const CATEGORY_SOURCES: Record<SourceCategory, string[]> = {
  portal:  ['athome', 'vivi'],
  network: ['barnes'],
  agency:  ['newimmo', 'beckimmo', 'fischbach'],
};

export const ALL_SOURCES = Object.keys(SOURCE_META);

export type DirectoryAgencyCategory = 'Portal' | 'Luxury' | 'Network' | 'City' | 'Local';

export type DirectoryAgency = {
  id: string;
  name: string;
  description: string;
  url: string;
  category: DirectoryAgencyCategory;
};

// Agencies not reachable from our scraper (geo-IP blocked, React SPA, or no listings page).
// Shown as static links in the UI.
export const DIRECTORY_AGENCIES: DirectoryAgency[] = [
  { id: 'immotop',       name: 'Immotop',              description: "Luxembourg's largest property portal",         url: 'https://www.immotop.lu',                     category: 'Portal'  },
  { id: 'properstar',    name: 'Properstar',            description: 'International portal with LU listings',        url: 'https://www.properstar.com/luxembourg',       category: 'Portal'  },
  { id: 'atisimmo',      name: 'AtisImmo',              description: 'Residential and investment properties',        url: 'https://www.atisimmo.lu',                    category: 'Portal'  },
  { id: 'immodirekt',    name: 'Immodirekt',            description: 'Direct listing portal',                        url: 'https://www.immodirekt.lu',                  category: 'Portal'  },
  { id: 'luxresidence',  name: 'LuxResidence',          description: 'Luxury and premium properties',                url: 'https://www.luxresidence.lu',                category: 'Portal'  },
  { id: 'engelvoelkers', name: 'Engel & Völkers',       description: 'Luxury residential and commercial',            url: 'https://www.engelvoelkers.com/lu',            category: 'Luxury'  },
  { id: 'remax',         name: 'RE/MAX Luxembourg',     description: 'Global franchise with local agents',           url: 'https://www.remax.lu',                       category: 'Network' },
  { id: 'kw',            name: 'Keller Williams',       description: 'International network of independent agents',  url: 'https://www.kwluxembourg.com',               category: 'Network' },
  { id: 'lagence',       name: "L'Agence",              description: 'City-focused residential specialist',          url: 'https://www.lagence.lu',                     category: 'City'    },
  { id: 'fortimmo',      name: 'Forte Immobilier',      description: 'Residential and commercial sales & rentals',   url: 'https://www.fortimmo.lu',                    category: 'City'    },
  { id: 'homein',        name: 'Home-In',               description: 'Local residential agency',                     url: 'https://www.homein.lu',                      category: 'Local'   },
  { id: 'residence',     name: 'Résidence Immobilière', description: 'Luxembourg residential properties',            url: 'https://www.residence.lu',                   category: 'Local'   },
  { id: 'meiermm',       name: 'Meier Muckensturm',     description: 'Established local real estate agency',         url: 'https://www.agencemm.lu',                    category: 'Local'   },
  { id: 'kloe',          name: 'KLOE Immobilier',        description: 'Local agency for residential properties',      url: 'https://www.kloe.lu',                        category: 'Local'   },
  { id: 'castel',        name: 'Castel Immobilier',      description: 'Luxembourg residential sales and rentals',     url: 'https://www.castel-immo.lu',                 category: 'Local'   },
  { id: 'movein',        name: 'Move-In Immobilier',     description: 'Residential properties and relocation',        url: 'https://www.move-in.lu',                     category: 'Local'   },
  { id: 'rollinger',     name: 'Rollinger',              description: 'Local Luxembourg property agency',             url: 'https://www.rollinger.lu',                   category: 'Local'   },
];
