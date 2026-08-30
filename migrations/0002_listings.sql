-- Listings cache + seen-ads ledger (unowned; public read, no user_id)
create table if not exists listings (
  id            text primary key,
  source        text not null,
  source_url    text not null,
  title         text not null,
  description   text,
  listing_type  text not null,
  offer         text not null,
  price_amount  double precision,
  price_currency text,
  price_period  text,
  area_m2       double precision,
  rooms         double precision,
  address       text,
  neighborhood  text,
  lat           double precision,
  lng           double precision,
  world_x       double precision,
  world_z       double precision,
  contact_phone text,
  photo_url     text,
  posted_at     timestamptz,
  fetched_at    timestamptz not null default now(),
  available     boolean not null default true,
  raw_hash      text not null
);

create index if not exists listings_source_idx on listings (source);
create index if not exists listings_offer_idx on listings (offer);
create index if not exists listings_posted_idx on listings (posted_at desc);
create index if not exists listings_dedup_idx on listings (address, price_amount, area_m2);

create table if not exists source_status (
  source        text primary key,
  status        text not null,
  detail        text,
  last_ok_at    timestamptz,
  last_try_at   timestamptz not null default now(),
  listing_count integer not null default 0
);

create table if not exists fetch_meta (
  key           text primary key,
  value         text not null,
  updated_at    timestamptz not null default now()
);
