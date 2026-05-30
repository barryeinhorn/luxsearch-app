export type SourceCategory = 'portal' | 'network' | 'agency';

export type SourceMeta = {
  label: string;
  bg: string;
  text: string;
  category: SourceCategory;
};

export const SOURCE_META: Record<string, SourceMeta> = {
  athome:        { label: 'atHome',      bg: 'bg-blue-100',    text: 'text-blue-700',    category: 'portal' },
  immotop:       { label: 'Immotop',     bg: 'bg-purple-100',  text: 'text-purple-700',  category: 'portal' },
  vivi:          { label: 'Vivi',        bg: 'bg-teal-100',    text: 'text-teal-700',    category: 'portal' },
  properstar:    { label: 'Properstar',  bg: 'bg-cyan-100',    text: 'text-cyan-700',    category: 'portal' },
  remax:         { label: 'RE/MAX',      bg: 'bg-red-100',     text: 'text-red-700',     category: 'network' },
  engelvoelkers: { label: 'E&V',         bg: 'bg-yellow-100',  text: 'text-yellow-700',  category: 'network' },
  kw:            { label: 'KW',          bg: 'bg-red-100',     text: 'text-red-800',     category: 'network' },
  barnes:        { label: 'BARNES',      bg: 'bg-slate-100',   text: 'text-slate-700',   category: 'network' },
  newimmo:       { label: 'New Immo',    bg: 'bg-orange-100',  text: 'text-orange-700',  category: 'agency' },
  beckimmo:      { label: 'Beck',        bg: 'bg-emerald-100', text: 'text-emerald-700', category: 'agency' },
  lagence:       { label: "L'Agence",   bg: 'bg-pink-100',    text: 'text-pink-700',    category: 'agency' },
  fortimmo:      { label: 'Forte',       bg: 'bg-violet-100',  text: 'text-violet-700',  category: 'agency' },
  homein:        { label: 'Home-In',     bg: 'bg-green-100',   text: 'text-green-700',   category: 'agency' },
  residence:     { label: 'Residence',   bg: 'bg-indigo-100',  text: 'text-indigo-700',  category: 'agency' },
  fischbach:     { label: 'Fischbach',   bg: 'bg-amber-100',   text: 'text-amber-700',   category: 'agency' },
  movein:        { label: 'Move-In',     bg: 'bg-lime-100',    text: 'text-lime-700',    category: 'agency' },
  castel:        { label: 'Castel',      bg: 'bg-rose-100',    text: 'text-rose-700',    category: 'agency' },
  rollinger:     { label: 'Rollinger',   bg: 'bg-sky-100',     text: 'text-sky-700',     category: 'agency' },
  meiermm:       { label: 'Meier MM',    bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', category: 'agency' },
  kloe:          { label: 'KLOE',        bg: 'bg-stone-100',   text: 'text-stone-700',   category: 'agency' },
};

const FALLBACK: SourceMeta = { label: 'Other', bg: 'bg-slate-100', text: 'text-slate-600', category: 'agency' };

export function getSourceMeta(source: string): SourceMeta {
  return SOURCE_META[source] ?? FALLBACK;
}

export const CATEGORY_SOURCES: Record<SourceCategory, string[]> = {
  portal:  ['athome', 'immotop', 'vivi', 'properstar'],
  network: ['engelvoelkers', 'kw', 'barnes', 'remax'],
  agency:  ['lagence', 'fortimmo', 'homein', 'residence', 'fischbach', 'movein', 'castel', 'rollinger', 'meiermm', 'kloe', 'newimmo', 'beckimmo'],
};

export const ALL_SOURCES = Object.keys(SOURCE_META);
