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

export type CommuneData = {
  commune: string;
  avgRent1BR: number;
  avgRent2BR: number;
  avgRent3BR: number;
  avgSalePricePerM2: number;
  medianDaysOnMarket: number;
  yoyChange: number;
};

export type MarketSnapshot = {
  lastUpdated: string;
  cityAvgRent3BR: number;
  cityAvgSalePriceM2: number;
  totalActiveListings: number;
  sources: string[];
  communes: CommuneData[];
};

export type School = {
  id: string;
  name: string;
  shortName: string;
  address: string;
  commune: string;
  lat: number;
  lng: number;
  type: 'public_international' | 'european' | 'private_international';
  cost: 'free' | 'subsidised' | 'paid';
  annualFee: number;
  feeRange?: string;
  curriculum: string;
  languages: string[];
  ageRange: string;
  website: string;
  note?: string;
};

export type Filters = {
  transaction: 'rent' | 'sale';
  propertyType: 'all' | 'apartment' | 'house' | 'studio';
  bedrooms: 'any' | '1+' | '2+' | '3+' | '4+';
  maxPrice: number;
  minArea: number;
  communes: string[];
  selectedSchoolIds: string[];
  schoolCostFilter: string[];
  radius: number;
  garage: boolean;
  furnished: boolean;
  balcony: boolean;
  evCharger: boolean;
  selectedSources: string[]; // empty = all
};

export const DEFAULT_FILTERS: Filters = {
  transaction: 'rent',
  propertyType: 'all',
  bedrooms: 'any',
  maxPrice: 8000,
  minArea: 0,
  communes: [],
  selectedSchoolIds: [],
  schoolCostFilter: [],
  radius: 2,
  garage: false,
  furnished: false,
  balcony: false,
  evCharger: false,
  selectedSources: [],
};
