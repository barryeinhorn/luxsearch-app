-- LuxSearch Supabase schema
-- Run this in Supabase Dashboard → SQL Editor before first deployment

-- Properties table: stores all scraped listings (also serves as 15-min cache)
create table if not exists properties (
  id text primary key,
  source text not null,
  source_url text,
  title text,
  type text,
  transaction text,
  price integer,
  charges integer,
  charges_known boolean default false,
  total_monthly integer,
  bedrooms integer,
  bathrooms integer,
  area integer,
  address text,
  commune text,
  postal_code text,
  lat float,
  lng float,
  images jsonb default '[]',
  available text,
  description text,
  features jsonb default '{}',
  energy_class text,
  year_built integer,
  floor integer,
  search_params_hash text,
  scraped_at timestamptz default now()
);

-- Index for fast cache lookups by hash + recency
create index if not exists idx_properties_hash_scraped
  on properties(search_params_hash, scraped_at desc);

create index if not exists idx_properties_commune
  on properties(commune);

create index if not exists idx_properties_transaction
  on properties(transaction);

-- Geocode cache: persists Nominatim results across deployments
create table if not exists geocode_cache (
  address text primary key,
  lat float not null,
  lng float not null,
  cached_at timestamptz default now()
);

-- Market data table (optional — for future use)
create table if not exists market_data (
  id serial primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Row Level Security: public read, server-side write via secret key
alter table properties enable row level security;
alter table geocode_cache enable row level security;
alter table market_data enable row level security;

create policy "Public read access" on properties
  for select using (true);

create policy "Public read access" on geocode_cache
  for select using (true);

create policy "Public read access" on market_data
  for select using (true);
