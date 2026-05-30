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
  remax:         { label: 'RE/MAX',      bg: 'bg-red-100',     text: 'text-red-700',     category: 'network', url: 'https://www.remax.lu' },
  engelvoelkers: { label: 'E&V',         bg: 'bg-yellow-100',  text: 'text-yellow-700',  category: 'network', url: 'https://www.engelvoelkers.com' },
  kw:            { label: 'KW',          bg: 'bg-red-100',     text: 'text-red-800',     category: 'network', url: 'https://www.kwluxembourg.com' },
  barnes:        { label: 'BARNES',      bg: 'bg-slate-100',   text: 'text-slate-700',   category: 'network', url: 'https://www.barnes-luxembourg.com' },
  newimmo:       { label: 'New Immo',    bg: 'bg-orange-100',  text: 'text-orange-700',  category: 'agency',  url: 'https://www.newimmo.lu' },
  beckimmo:      { label: 'Beck',        bg: 'bg-emerald-100', text: 'text-emerald-700', category: 'agency',  url: 'https://www.beckimmo.lu' },
  lagence:       { label: "L'Agence",   bg: 'bg-pink-100',    text: 'text-pink-700',    category: 'agency',  url: 'https://www.lagence.lu' },
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

// Only includes the 17 scrapers that have actual server-side implementations.
// remax, newimmo, beckimmo remain in SOURCE_META for badge display but are not scraped.
export const CATEGORY_SOURCES: Record<SourceCategory, string[]> = {
  portal:  ['athome', 'immotop', 'vivi', 'properstar'],
  network: ['engelvoelkers', 'kw', 'barnes'],
  agency:  ['lagence', 'fortimmo', 'homein', 'residence', 'fischbach', 'movein', 'castel', 'rollinger', 'meiermm', 'kloe'],
};

export const ALL_SOURCES = Object.keys(SOURCE_META);
