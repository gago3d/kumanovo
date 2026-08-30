import { jitterLatLng, matchNeighborhood } from "@/lib/city/map";
import { eurOf } from "./format";
import type { Listing, ListingType, Offer, SourceId } from "./types";

export type Buyer = {
  id: string;
  source: SourceId;
  sourceUrl: string;
  title: string;
  want: ListingType;
  offer: Offer;
  maxAmount: number | null;
  currency: "EUR" | "MKD" | null;
  areaM2: number | null;
  rooms: number | null;
  neighborhood: string | null;
  lat: number;
  lng: number;
  postedAt: string | null;
  contactPhone: string | null;
};

type Seed = {
  source: SourceId;
  ext: string;
  url: string;
  title: string;
  want: ListingType;
  offer?: Offer;
  max?: number | null;
  currency?: "EUR" | "MKD" | null;
  m2?: number | null;
  rooms?: number | null;
  hint?: string;
  posted?: string | null;
  phone?: string | null;
};

/** Public "барам" ads — real posts/listings, no invented people. */
const SEED: Seed[] = [
  {
    source: "pazar3",
    ext: "9051640",
    url: "https://www.pazar3.mk/oglas/zivealista/stanovi/baram-za-iznajmuvanje/kumanovo/kumanovo-opstina/kukja-ili-stan/9051640",
    title: "Барам куќа или стан",
    want: "kukja",
    posted: "2026-07-02T00:57:00+02:00",
  },
  {
    source: "pazar3",
    ext: "9038359",
    url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/industrija-rabotilnica/baram-za-iznajmuvanje/kumanovo/kumanovo-opstina/baram-hala-za-iznajmuvanje-200-400m2/9038359",
    title: "Барам хала за изнајмување 200–400 м²",
    want: "lokal",
    max: 150,
    currency: "EUR",
    m2: 200,
    posted: "2026-06-22T23:25:00+02:00",
  },
  {
    source: "pazar3",
    ext: "8601095",
    url: "https://www.pazar3.mk/oglas/zivealista/vikendici/baram-za-iznajmuvanje/kumanovo/kumanovo-opstina/baram-vikendica-za-nova-godina/8601095",
    title: "Барам викендица за Нова година",
    want: "vikend",
    posted: "2025-12-16T20:01:00+01:00",
  },
  {
    source: "pazar3",
    ext: "5447829",
    url: "https://www.pazar3.mk/oglas/zivealista/stanovi/baram-za-iznajmuvanje/kumanovo/kumanovo-opstina/se-bara-ednosoben-stan-za-iznajmuvanje-vo-kumanovo/5447829",
    title: "Се бара еднособен стан за изнајмување",
    want: "stan",
    rooms: 1,
    posted: "2025-07-17T02:00:00+02:00",
  },
  {
    source: "pazar3",
    ext: "5347151",
    url: "https://www.pazar3.mk/oglas/zivealista/stanovi/baram-za-iznajmuvanje/kumanovo/kumanovo-opstina/baram-stan-pod-kirija-vo-centar-na-kumanovo-ili-garsonjera/5347151",
    title: "Барам стан под кирија во центар или гарсоњера",
    want: "stan",
    hint: "центар",
    posted: "2025-05-27T10:21:00+02:00",
  },
  {
    source: "pazar3",
    ext: "5185612",
    url: "https://www.pazar3.mk/oglas/zivealista/stanovi/baram-za-iznajmuvanje/kumanovo/kumanovo-opstina/baram-namesten-stan/5185612",
    title: "Барам наместен стан",
    want: "stan",
    hint: "центар периферија",
    posted: "2025-12-21T15:06:00+01:00",
  },
  {
    source: "pazar3",
    ext: "5181314",
    url: "https://www.pazar3.mk/oglas/zivealista/kukji-vili/baram-za-iznajmuvanje/kumanovo/kumanovo-opstina/baram-sprat-od-kuca-ili-trosoben-stan-pod-kirija/5181314",
    title: "Барам спрат од куќа или трособен стан",
    want: "kukja",
    rooms: 3,
    posted: "2025-12-10T14:37:00+01:00",
  },
  {
    source: "pazar3",
    ext: "4764203",
    url: "https://www.pazar3.mk/oglas/zivealista/stanovi/baram-za-iznajmuvanje/kumanovo/kumanovo-opstina/baram-stan-pod-kirija-do-max-400e/4764203",
    title: "Барам стан под кирија до max 400 €",
    want: "stan",
    max: 400,
    currency: "EUR",
    posted: "2025-10-02T21:26:00+02:00",
  },
  {
    source: "pazar3",
    ext: "5300490",
    url: "https://www.pazar3.mk/oglas/zivealista/kukji-vili/baram-za-iznajmuvanje/kumanovo/kumanovo-opstina/se-bara-kuka-za-iznajmuvanje/5300490",
    title: "Се бара куќа за изнајмување",
    want: "kukja",
    posted: "2025-05-09T23:35:00+02:00",
  },
  {
    source: "pazar3",
    ext: "6226641",
    url: "https://www.pazar3.mk/oglas/zivealista/kukji-vili/baram-za-iznajmuvanje/kumanovo/kumanovo-opstina/trazam-kuca/6226641",
    title: "Барам куќа",
    want: "kukja",
    posted: "2025-12-18T16:30:00+01:00",
  },
  {
    source: "facebook",
    ext: "8784450078236009",
    url: "https://www.facebook.com/groups/8390769087604112/posts/8784450078236009/",
    title: "Барам наместен стан за подолг период, 1–2 соби",
    want: "stan",
    rooms: 2,
    phone: "075287266",
  },
  {
    source: "facebook",
    ext: "1751384325863468",
    url: "https://www.facebook.com/groups/491796325155614/posts/1751384325863468/",
    title: "Барам стан до 80 м², по можност трособен, мирна локација",
    want: "stan",
    rooms: 3,
    m2: 80,
    hint: "карпош јане",
  },
  {
    source: "facebook",
    ext: "2503952453402903",
    url: "https://www.facebook.com/groups/1365010057297154/posts/2503952453402903/",
    title: "Итно барам стан до 80 м², двособен, мирна локација",
    want: "stan",
    rooms: 2,
    m2: 80,
    phone: "078381909",
  },
  {
    source: "facebook",
    ext: "2336732320124918",
    url: "https://www.facebook.com/groups/1365010057297154/posts/2336732320124918/",
    title: "Барам стан под кирија до 200–250 €",
    want: "stan",
    max: 250,
    currency: "EUR",
  },
  {
    source: "facebook",
    ext: "1516048049397098",
    url: "https://www.facebook.com/groups/491796325155614/posts/1516048049397098/",
    title: "Барам дуќан за купување поголем од 50 м²",
    want: "lokal",
    offer: "sale",
    m2: 50,
    phone: "072569984",
    hint: "центар",
  },
  {
    source: "facebook",
    ext: "2393216337809849",
    url: "https://www.facebook.com/groups/1365010057297154/posts/2393216337809849/",
    title: "Барам деловен простор / дуќан 150–200 м² под кирија",
    want: "lokal",
    m2: 150,
    phone: "078233797",
    hint: "центар",
  },
  {
    source: "facebook",
    ext: "4434225793488862",
    url: "https://www.facebook.com/groups/kumanovoads/posts/4434225793488862/",
    title: "Барам нива за викендица — стар пат Хавана–Брадиновци",
    want: "niva",
    offer: "sale",
    hint: "бединје",
  },
];

export const BUYERS: Buyer[] = SEED.map((s) => {
  const n = matchNeighborhood(`${s.title} ${s.hint ?? ""}`);
  const jll = jitterLatLng(`buyer:${s.ext}`, n.lat, n.lng, 4.2);
  return {
    id: `buyer:${s.source}:${s.ext}`,
    source: s.source,
    sourceUrl: s.url,
    title: s.title,
    want: s.want,
    offer: s.offer ?? "rent",
    maxAmount: s.max ?? null,
    currency: s.currency ?? null,
    areaM2: s.m2 ?? null,
    rooms: s.rooms ?? null,
    neighborhood: n.nameMk,
    lat: jll.lat,
    lng: jll.lng,
    postedAt: s.posted ?? null,
    contactPhone: s.phone ?? null,
  };
});

export type MatchHit = {
  listing: Listing;
  score: number;
  why: string[];
};

export type CheckStatus = "pending" | "live" | "changed" | "gone";

export type ListingCheck = {
  status: CheckStatus;
  at: number;
  note: string;
  sig: string;
};

export function listingSig(l: Pick<Listing, "title" | "priceAmount" | "priceCurrency" | "pricePeriod" | "available">) {
  return `${l.title}|${l.priceAmount}|${l.priceCurrency}|${l.pricePeriod}|${l.available}`;
}

export function matchBuyer(buyer: Buyer, listings: Listing[]): MatchHit | null {
  let best: MatchHit | null = null;
  for (const listing of listings) {
    const why: string[] = [];
    let score = 0;
    if (listing.listingType === buyer.want) {
      score += 42;
      why.push("тип");
    } else if (
      (buyer.want === "stan" && listing.listingType === "kukja") ||
      (buyer.want === "kukja" && listing.listingType === "stan")
    ) {
      score += 18;
      why.push("близок тип");
    } else continue;
    if (listing.offer === buyer.offer) {
      score += 16;
      why.push(buyer.offer === "rent" ? "кирија" : "продажба");
    }
    if (buyer.neighborhood && listing.neighborhood && listing.neighborhood === buyer.neighborhood) {
      score += 18;
      why.push(listing.neighborhood);
    }
    const price = eurOf(listing.priceAmount, listing.priceCurrency);
    const cap = eurOf(buyer.maxAmount, buyer.currency);
    if (cap != null && price != null) {
      if (price <= cap) {
        score += 14;
        why.push("во буџет");
      } else if (price <= cap * 1.15) {
        score += 6;
        why.push("блиску до буџет");
      }
    } else if (listing.pricePeriod === "negotiable" || buyer.maxAmount == null) {
      score += 6;
    }
    if (buyer.rooms != null && listing.rooms != null) {
      if (listing.rooms >= buyer.rooms) {
        score += 8;
        why.push(`${listing.rooms}+ соби`);
      }
    }
    if (buyer.areaM2 != null && listing.areaM2 != null) {
      if (listing.areaM2 >= buyer.areaM2 * 0.85) {
        score += 6;
        why.push(`${listing.areaM2} м²`);
      }
    }
    if (!best || score > best.score) best = { listing, score: Math.min(99, score), why };
  }
  return best;
}

export function matchAll(buyers: Buyer[], listings: Listing[]) {
  return buyers
    .map((buyer) => ({ buyer, hit: matchBuyer(buyer, listings) }))
    .sort((a, b) => (b.hit?.score ?? 0) - (a.hit?.score ?? 0));
}
