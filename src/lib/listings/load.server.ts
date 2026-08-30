import { toWorld } from "@/lib/city/map";
import { fallbackPayload, seedListings } from "./seed";
import { dedup, parseKeyAdvisory, parsePazar3, parseReklama5 } from "./parse";
import type { Listing, ListingsPayload, SourceId, SourceState, SourceStatus } from "./types";

const CACHE_MS = 30 * 60 * 1000;

const SOURCE_META: Record<
  SourceId,
  { label: string; urls: string[]; parser?: (html: string, now: string) => Listing[] }
> = {
  pazar3: {
    label: "Pazar3",
    urls: [
      "https://www.pazar3.mk/oglasi/zivealista/stanovi/izdavanje/kumanovo",
      "https://www.pazar3.mk/oglasi/zivealista/stanovi/prodazba/kumanovo",
      "https://www.pazar3.mk/oglasi/rabota-biznis/deloven-prostor/izdavanje/kumanovo",
      "https://www.pazar3.mk/oglasi/rabota-biznis/deloven-prostor/prodazba/kumanovo",
      "https://www.pazar3.mk/oglasi/zivealista/kukji-vili/izdavanje/kumanovo",
      "https://www.pazar3.mk/oglasi/zivealista/kukji-vili/prodazba/kumanovo",
      "https://www.pazar3.mk/oglasi/zivealista/vikendici/kumanovo",
      "https://www.pazar3.mk/oglasi/zivealista/placovi-nivi-farmi/kumanovo",
    ],
    parser: parsePazar3,
  },
  reklama5: {
    label: "Reklama5",
    urls: ["https://www.reklama5.mk/Search?city=288&cat=157&rent=1&includeforrent=1"],
    parser: parseReklama5,
  },
  keyadvisory: {
    label: "Key Advisory",
    urls: ["https://keyadvisory.mk/imoti/offices/"],
    parser: parseKeyAdvisory,
  },
  facebook: {
    label: "Facebook",
    urls: ["https://www.facebook.com/groups/8390769087604112/"],
  },
  google: {
    label: "Google",
    urls: ["https://www.google.com/search?q=%D0%B8%D0%B7%D0%B4%D0%B0%D0%B2%D0%B0%D1%9A%D0%B5+%D0%BB%D0%BE%D0%BA%D0%B0%D0%BB+%D0%9A%D1%83%D0%BC%D0%B0%D0%BD%D0%BE%D0%B2%D0%BE"],
  },
};

type Row = {
  id: string;
  source: SourceId;
  source_url: string;
  title: string;
  description: string | null;
  listing_type: Listing["listingType"];
  offer: Listing["offer"];
  price_amount: number | null;
  price_currency: Listing["priceCurrency"];
  price_period: Listing["pricePeriod"];
  area_m2: number | null;
  rooms: number | null;
  address: string | null;
  neighborhood: string | null;
  lat: number;
  lng: number;
  world_x: number;
  world_z: number;
  contact_phone: string | null;
  photo_url: string | null;
  posted_at: string | null;
  fetched_at: string;
  available: boolean;
};

type Sql = {
  <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
};

function fromRow(r: Row): Listing {
  const base = toWorld(r.lat, r.lng);
  return {
    id: r.id,
    source: r.source,
    sourceUrl: r.source_url,
    title: r.title,
    description: r.description,
    listingType: r.listing_type,
    offer: r.offer,
    priceAmount: r.price_amount,
    priceCurrency: r.price_currency,
    pricePeriod: r.price_period,
    areaM2: r.area_m2,
    rooms: r.rooms,
    address: r.address,
    neighborhood: r.neighborhood,
    lat: r.lat,
    lng: r.lng,
    worldX: base.x,
    worldZ: base.z,
    contactPhone: r.contact_phone,
    photoUrl: r.photo_url,
    postedAt: r.posted_at,
    fetchedAt: r.fetched_at,
    available: r.available,
  };
}

async function fetchHtml(url: string): Promise<{ ok: true; html: string } | { ok: false; status: number; reason: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "KumanovskiStan/1.0 (+https://grok.com; public listing search; respects robots)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "mk-MK,mk;q=0.9,en;q=0.8",
      },
    });
    if (res.status === 403 || res.status === 503) {
      return { ok: false, status: res.status, reason: "blocked" };
    }
    if (!res.ok) return { ok: false, status: res.status, reason: "unavailable" };
    const html = await res.text();
    if (/cf-error|just a moment|attention required/i.test(html.slice(0, 2500))) {
      return { ok: false, status: 403, reason: "blocked" };
    }
    return { ok: true, html };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return { ok: false, status: 0, reason: msg.includes("abort") ? "unavailable" : "unavailable" };
  } finally {
    clearTimeout(t);
  }
}

async function upsertListings(sql: Sql, items: Listing[]) {
  for (const it of items) {
    await sql`
      insert into listings (
        id, source, source_url, title, description, listing_type, offer,
        price_amount, price_currency, price_period, area_m2, rooms, address,
        neighborhood, lat, lng, world_x, world_z, contact_phone, photo_url,
        posted_at, fetched_at, available, raw_hash
      ) values (
        ${it.id}, ${it.source}, ${it.sourceUrl}, ${it.title}, ${it.description},
        ${it.listingType}, ${it.offer}, ${it.priceAmount}, ${it.priceCurrency},
        ${it.pricePeriod}, ${it.areaM2}, ${it.rooms}, ${it.address},
        ${it.neighborhood}, ${it.lat}, ${it.lng}, ${it.worldX}, ${it.worldZ},
        ${it.contactPhone}, ${it.photoUrl}, ${it.postedAt}, ${it.fetchedAt},
        ${it.available}, ${it.id}
      )
      on conflict (id) do update set
        title = excluded.title,
        source_url = excluded.source_url,
        listing_type = excluded.listing_type,
        offer = excluded.offer,
        price_amount = excluded.price_amount,
        price_currency = excluded.price_currency,
        price_period = excluded.price_period,
        area_m2 = excluded.area_m2,
        rooms = excluded.rooms,
        address = excluded.address,
        neighborhood = excluded.neighborhood,
        lat = excluded.lat,
        lng = excluded.lng,
        world_x = excluded.world_x,
        world_z = excluded.world_z,
        posted_at = coalesce(excluded.posted_at, listings.posted_at),
        fetched_at = excluded.fetched_at,
        available = excluded.available
    `;
  }
}

async function writeStatus(sql: Sql, source: SourceId, status: SourceState, detail: string, count: number, ok: boolean) {
  await sql`
    insert into source_status (source, status, detail, last_ok_at, last_try_at, listing_count)
    values (${source}, ${status}, ${detail}, ${ok ? new Date().toISOString() : null}, ${new Date().toISOString()}, ${count})
    on conflict (source) do update set
      status = excluded.status,
      detail = excluded.detail,
      last_try_at = excluded.last_try_at,
      listing_count = excluded.listing_count,
      last_ok_at = case when ${ok} then excluded.last_ok_at else source_status.last_ok_at end
  `;
}

async function ensureSeed(sql: Sql) {
  const seed = seedListings();
  const existing = await sql<{ id: string }>`select id from listings`;
  const have = new Set(existing.map((r) => r.id));
  const missing = seed.filter((s) => !have.has(s.id));
  if (missing.length) await upsertListings(sql, missing);
  if (existing.length > 0) return;
  const bySrc = new Map<SourceId, number>();
  for (const s of seed) bySrc.set(s.source, (bySrc.get(s.source) ?? 0) + 1);
  await writeStatus(sql, "pazar3", "ok", "последно видени јавни огласи (кеш)", bySrc.get("pazar3") ?? 0, true);
  await writeStatus(sql, "reklama5", "blocked", "Cloudflare ја блокира живата врска; прикажани се последно видени огласи", bySrc.get("reklama5") ?? 0, false);
  await writeStatus(sql, "keyadvisory", "ok", "јавен агенциски оглас", bySrc.get("keyadvisory") ?? 0, true);
  await writeStatus(
    sql,
    "facebook",
    "restricted",
    "Приватните inbox-и не се читаат. Јавни групи + индексиран пост за Ленинова.",
    bySrc.get("facebook") ?? 0,
    true,
  );
  await writeStatus(sql, "google", "restricted", "Нема официјален API клуч. Без измислени Google огласи.", 0, false);
}

function pageUrl(base: string, page: number) {
  if (page <= 1) return base;
  return `${base}${base.includes("?") ? "&" : "?"}page=${page}`;
}

async function refresh(sql: Sql) {
  const now = new Date().toISOString();
  const live: Listing[] = [];

  for (const id of ["pazar3", "reklama5", "keyadvisory"] as SourceId[]) {
    const meta = SOURCE_META[id];
    if (!meta.parser) continue;
    let got: Listing[] = [];
    let state: SourceState = "unavailable";
    let detail = "нема одговор";
    for (const base of meta.urls) {
      for (let page = 1; page <= 40; page++) {
        const url = pageUrl(base, page);
        const res = await fetchHtml(url);
        if (!res.ok) {
          if (page === 1) {
            state = res.reason === "blocked" ? "blocked" : "unavailable";
            detail =
              state === "blocked"
                ? "изворот врати заштита (Cloudflare). Почитуваме robots — без заобиколување."
                : `HTTP ${res.status || "timeout"}`;
          }
          break;
        }
        const parsed = meta.parser(res.html, now);
        const have = new Set(got.map((g) => g.id));
        const fresh = parsed.filter((p) => !have.has(p.id));
        got = got.concat(fresh);
        if (parsed.length) {
          state = "ok";
          detail = `живо: ${got.length} огласи`;
        }
        if (fresh.length === 0) break;
      }
    }
    live.push(...got);
    await writeStatus(sql, id, state, detail, got.length, state === "ok");
  }

  await writeStatus(
    sql,
    "facebook",
    "restricted",
    "Facebook Marketplace/инбокси не се собираат (ToS). Линкови до јавни групи.",
    1,
    false,
  );
  await writeStatus(
    sql,
    "google",
    "restricted",
    "Google Maps/Search listings бараат официјален API. Не се крадат SERP-ови.",
    0,
    false,
  );

  if (live.length) {
    await upsertListings(sql, dedup(live));
  }

  await sql`
    insert into fetch_meta (key, value, updated_at)
    values ('last_fetch', ${now}, ${now})
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
  `;
}

export async function loadPayload(includeSale: boolean): Promise<ListingsPayload> {
  if (!process.env.DATABASE_URL && import.meta.env.PROD) {
    return fallbackPayload(includeSale);
  }
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await ensureSeed(sql);

  const meta = await sql<{ value: string; updated_at: string }>`
    select value, updated_at from fetch_meta where key = 'last_fetch'
  `;
  const last = meta[0]?.updated_at ? Date.parse(meta[0].updated_at) : 0;
  const stale = !last || Date.now() - last > CACHE_MS;
  if (stale) {
    try {
      await refresh(sql);
    } catch (err) {
      console.error("[listings] refresh failed", err);
    }
  }

  const rows = await sql<Row>`
    select * from listings
    where available = true
    order by posted_at desc nulls last
  `;
  let listings = rows.map(fromRow);
  if (!includeSale) listings = listings.filter((l) => l.offer === "rent" || l.listingType === "vikend" || l.listingType === "niva");

  const statuses = await sql<{
    source: SourceId;
    status: SourceState;
    detail: string;
    last_ok_at: string | null;
    last_try_at: string;
    listing_count: number;
  }>`select * from source_status`;

  const sources: SourceStatus[] = (["pazar3", "reklama5", "keyadvisory", "facebook", "google"] as SourceId[]).map(
    (s) => {
      const row = statuses.find((x) => x.source === s);
      return {
        source: s,
        status: row?.status ?? "unavailable",
        detail: row?.detail ?? "",
        lastOkAt: row?.last_ok_at ?? null,
        lastTryAt: row?.last_try_at ?? new Date().toISOString(),
        listingCount: row?.listing_count ?? 0,
      };
    },
  );

  const cachedAtRow = await sql<{ updated_at: string }>`
    select updated_at from fetch_meta where key = 'last_fetch'
  `;

  return {
    listings: dedup(listings),
    sources,
    cachedAt: cachedAtRow[0]?.updated_at ?? null,
    stale,
    cacheMinutes: 30,
  };
}

export async function refreshThenLoad(includeSale: boolean): Promise<ListingsPayload> {
  if (!process.env.DATABASE_URL && import.meta.env.PROD) {
    return fallbackPayload(includeSale);
  }
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await ensureSeed(sql);
  await refresh(sql);
  return loadPayload(includeSale);
}