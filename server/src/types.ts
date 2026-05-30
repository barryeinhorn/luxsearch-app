export type SourceStatus = {
  name: string;
  status: 'ok' | 'blocked' | 'empty' | 'failed';
  error?: string;
};

export type PropertyFeatures = {
  garage: boolean;
  balcony: boolean;
  terrace: boolean;
  garden: boolean;
  furnished: boolean;
  elevator: boolean;
  cellar: boolean;
  evCharger: boolean;
};

export type Property = {
  id: string;
  source: string;
  sourceUrl?: string;
  title: string;
  type?: string;
  transaction?: string;
  price: number;
  charges: number;
  chargesKnown?: boolean;
  totalMonthly?: number;
  bedrooms: number;
  bathrooms?: number;
  area: number;
  address?: string;
  commune: string;
  postalCode?: string;
  lat: number;
  lng: number;
  images?: string[];
  available?: string;
  description?: string;
  features?: PropertyFeatures;
  energyClass?: string;
  yearBuilt?: number;
  floor?: number;
  scrapedAt?: string;
  agencyFee?: number;
  daysOnMarket?: number;
  rentPerSqm?: number;
};

export type ScraperCategory = 'portal' | 'network' | 'agency';

export type SourceName =
  | 'athome' | 'immotop' | 'vivi' | 'properstar' | 'immodirekt' | 'luxresidence'
  | 'remax' | 'engelvoelkers' | 'kw' | 'barnes'
  | 'atisimmo' | 'newimmo' | 'beckimmo' | 'lagence' | 'fortimmo'
  | 'homein' | 'residence' | 'fischbach' | 'movein'
  | 'castel' | 'rollinger' | 'meiermm' | 'kloe'
  | 'other';

export type SearchParams = {
  transaction: 'rent' | 'sale';
  minBedrooms: number;
  communes: string[];
  propertyType: 'all' | 'apartment' | 'house' | 'studio';
};

export interface ScraperDefinition {
  id: SourceName;
  name: string;
  category: ScraperCategory;
  baseUrl: string;
  fn: (params: SearchParams) => Promise<Property[]>;
}
