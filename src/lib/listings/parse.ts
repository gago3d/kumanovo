import { parse } from "node-html-parser";
import { matchNeighborhood, toWorld } from "@/lib/city/map";
import { locatePin } from "./locate";
import { isLandType } from "./types";
import type { Listing, ListingType, Offer, PricePeriod, SourceId } from "./types";

export { eurOf, formatPrice } from "./format";

const WANT_RE = /\b(барам|baram|сакам|sakam|wanted|kuluvam|kupuvam)\b/i;
const SALE_RE = /\b(продав|prodav|продаж|sale|shitet)\b/i;
const RENT_RE = /\b(издава|изнајм|izdava|iznajm|kirija|кирија|rent|qira|naem|наем)\b/i;
const LOKAL_RE =
  /\b(локал|дуќан|дукан|duk[ja]n|деловен|deloven|канцелар|kancelar|warehouse|магацин|hala|хала|објект за работ|kancelari)/i;
const HOUSE_RE = /\b(куќ|kuk[ae]|кука|shtëpi|shtepi|вил|vila|sprat od kuka)\b/i;
const APT_RE = /\b(стан|stan|apartman|гарсон|garson)\b/i;
const VIKEND_RE = /\b(викенд|vikend|vokendic|weekend)\b/i;
const NIVA_RE =
  /\b(нива|niva|плац|plac|земјишт|zemjist|farma|farmi|parcel|парцел|gradezno|градежно)\b/i;

function classifyType(title: string, url: string): ListingType {
  const t = `${title} ${url}`;
  if (VIKEND_RE.test(t) || /vikendici/.test(url)) return "vikend";
  if (NIVA_RE.test(t) || /placovi-nivi-farmi|farms-land/.test(url)) return "niva";
  if (LOKAL_RE.test(t) || /deloven-prostor|business-space|dukani|kancelarija|magacin/.test(url))
    return "lokal";
  if (HOUSE_RE.test(t) || /kukji-vili|houses/.test(url)) return "kukja";
  if (APT_RE.test(t) || /stanovi|apartments/.test(url)) return "stan";
  if (/dukan|lokal|prostor/.test(t)) return "lokal";
  return "stan";
}

function classifyOffer(title: string, url: string): Offer | "skip" {
  const t = `${title} ${url}`;
  if (WANT_RE.test(t) && !RENT_RE.test(t)) return "skip";
  if (/baram-|kupuvanje/.test(url) && !/izdavanje|prodazba/.test(url)) return "skip";
  if (/izdavanje|for-rent|iznajm/.test(url) && !/prodazba/.test(url)) return "rent";
  if (/prodazba|for-sale|prodav/.test(url) && !RENT_RE.test(t)) return "sale";
  if (SALE_RE.test(t) && !RENT_RE.test(t)) return "sale";
  const type = classifyType(title, url);
  if (isLandType(type)) return "sale";
  return "rent";
}

function parsePrice(text: string, offer: Offer): {
  amount: number | null;
  currency: "EUR" | "MKD" | null;
  period: PricePeriod;
} {
  const day = /дневно|dnevno|\/ден|\/day/i.test(text);
  const m = text.match(/(\d[\d\s.]{0,8})\s*(EUR|ЕУР|€|МКД|MKD|ден)/i);
  if (!m) return { amount: null, currency: null, period: "negotiable" };
  const raw = m[1].replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "");
  const amount = Number(raw.replace(",", "."));
  if (!Number.isFinite(amount)) return { amount: null, currency: null, period: "negotiable" };
  const cur = /МКД|MKD|ден/i.test(m[2]) ? "MKD" : "EUR";
  if (amount <= 1 && cur === "EUR") return { amount: null, currency: null, period: "negotiable" };
  if (offer === "sale" && cur === "EUR" && amount < 80)
    return { amount: null, currency: null, period: "negotiable" };
  if (offer === "sale" && cur === "MKD" && amount < 500)
    return { amount: null, currency: null, period: "negotiable" };
  if (offer === "sale") return { amount, currency: cur, period: "total" };
  return { amount, currency: cur, period: day ? "day" : "month" };
}

function parseArea(text: string): number | null {
  const m = text.match(/(\d{2,5})\s*(m²|m2|м²|м2|kv|кв)/i);
  return m ? Number(m[1]) : null;
}

function parseRooms(text: string): number | null {
  const m =
    text.match(/(\d(?:[.,]\d)?)\s*(соби|sobi|соен|soben)/i) ||
    text.match(/\b(\d)\s*[- ]?\s*(room|br)\b/i) ||
    text.match(/\b(еднособен|двособен|трособен|четирисобен|1[.,]5|гарсониера)/i);
  if (!m) return null;
  const map: Record<string, number> = {
    еднособен: 1,
    двособен: 2,
    трособен: 3,
    четирисобен: 4,
    гарсониера: 0.5,
    "1.5": 1.5,
    "1,5": 1.5,
  };
  const key = m[1].toLowerCase();
  if (map[key] != null) return map[key];
  const n = Number(String(m[1]).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const MONTHS: Record<string, number> = {
  јан: 0, фев: 1, мар: 2, апр: 3, мај: 4, јун: 5, јул: 6, авг: 7, сеп: 8, окт: 9, ное: 10, дек: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export function parsePosted(text: string, now = new Date()): string | null {
  if (/денес|denes|today/i.test(text)) return now.toISOString();
  if (/вчера|vcera|yesterday/i.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d.toISOString();
  }
  const m = text.match(
    /(\d{1,2})\s*(јан|фев|мар|апр|мај|јун|јул|авг|септ?|окт|ноем?|дек|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  );
  if (!m) return null;
  const day = Number(m[1]);
  const key = m[2].toLowerCase().slice(0, 3);
  const month = MONTHS[key];
  if (month == null) return null;
  let year = now.getFullYear();
  if (month > now.getMonth() + 1) year -= 1;
  return new Date(year, month, day, 12, 0, 0).toISOString();
}

function locate(title: string, extra: string, id: string) {
  const pin = locatePin(id, `${title} ${extra}`);
  const n = matchNeighborhood(`${title} ${extra}`);
  const w = toWorld(pin.lat, pin.lng);
  return { n: { ...n, nameMk: pin.neighborhood }, lat: pin.lat, lng: pin.lng, worldX: w.x, worldZ: w.z, address: pin.address };
}

function toListing(
  source: SourceId,
  ext: string,
  url: string,
  title: string,
  blob: string,
  now: string,
): Listing | null {
  const offer = classifyOffer(title, url);
  if (offer === "skip") return null;
  const id = `${source}:${ext}`;
  const price = parsePrice(`${title} ${blob}`, offer);
  const loc = locate(title, `${blob} ${url}`, id);
  const listingType = classifyType(title, url);
  return {
    id,
    source,
    sourceUrl: url,
    title: title.trim().slice(0, 180) || "Оглас",
    description: null,
    listingType,
    offer,
    priceAmount: price.amount,
    priceCurrency: price.currency,
    pricePeriod: price.period,
    areaM2: parseArea(`${title} ${blob}`),
    rooms: parseRooms(`${title} ${blob}`),
    address: loc.address,
    neighborhood: loc.n.nameMk,
    lat: loc.lat,
    lng: loc.lng,
    worldX: loc.worldX,
    worldZ: loc.worldZ,
    contactPhone: null,
    photoUrl: null,
    postedAt: parsePosted(blob),
    fetchedAt: now,
    available: true,
  };
}

const HREF_OK =
  /izdavanje|prodazba|stanovi|kukji|deloven|dukani|kancelarija|vikendici|placovi|nivi|farmi|magacin/i;

export function parsePazar3(html: string, now: string): Listing[] {
  const root = parse(html);
  const out: Listing[] = [];
  const seen = new Set<string>();
  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href") ?? "";
    const m = href.match(/\/oglas\/.+\/(\d+)\/?$/);
    if (!m) continue;
    const ext = m[1];
    if (seen.has(ext)) continue;
    if (!/kumanovo/i.test(href)) continue;
    if (!HREF_OK.test(href)) continue;
    const title = a.text.trim().replace(/\s+/g, " ");
    if (title.length < 3 || title.length > 180) continue;
    seen.add(ext);
    const parent = a.parentNode as { text?: string } | undefined;
    const blob = `${title} ${(parent?.text ?? "").slice(0, 400)}`;
    const url = href.startsWith("http") ? href : `https://www.pazar3.mk${href}`;
    const item = toListing("pazar3", ext, url, title, blob, now);
    if (item) out.push(item);
  }
  return out;
}

export function parseReklama5(html: string, now: string): Listing[] {
  const root = parse(html);
  const out: Listing[] = [];
  const seen = new Set<string>();
  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href") ?? "";
    const m = href.match(/[?&]ad=(\d+)/i) || href.match(/\/Ad\/(?:Details|Index)\/(\d+)/i);
    if (!m) continue;
    const ext = m[1];
    if (seen.has(ext)) continue;
    const title = a.text.trim().replace(/\s+/g, " ");
    if (title.length < 4) continue;
    const wrap = a.parentNode as { text?: string } | undefined;
    const blob = (wrap?.text ?? "").slice(0, 500);
    if (!/kumanovo|куманово/i.test(`${title} ${blob} ${href}`)) continue;
    seen.add(ext);
    const url = href.startsWith("http") ? href : `https://www.reklama5.mk${href}`;
    const item = toListing("reklama5", ext, url, title, blob, now);
    if (item) out.push(item);
  }
  return out;
}

export function parseKeyAdvisory(html: string, now: string): Listing[] {
  const root = parse(html);
  const out: Listing[] = [];
  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href") ?? "";
    const title = a.text.trim().replace(/\s+/g, " ");
    if (!/kumanovo|куманово/i.test(`${href} ${title}`)) continue;
    if (!/izdava|издава|rent|prodav|продав/i.test(`${href} ${title}`)) continue;
    if (title.length < 8) continue;
    const url = href.startsWith("http") ? href : `https://keyadvisory.mk${href}`;
    const ext = href.split("/").filter(Boolean).pop() ?? title.slice(0, 24);
    const blob = (a.parentNode as { text?: string } | undefined)?.text ?? title;
    const item = toListing("keyadvisory", ext, url, title, blob, now);
    if (item) out.push(item);
  }
  return out;
}

export function dedup(list: Listing[]): Listing[] {
  const byId = new Map<string, Listing>();
  const byKey = new Map<string, Listing>();
  for (const item of list) {
    if (byId.has(item.id)) continue;
    const addr = (item.address ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const key = `${addr}|${item.priceAmount ?? "x"}|${item.areaM2 ?? "x"}|${item.listingType}`;
    const prev = byKey.get(key);
    if (prev && addr) {
      const a = Date.parse(prev.postedAt ?? "") || 0;
      const b = Date.parse(item.postedAt ?? "") || 0;
      if (b > a) {
        byId.delete(prev.id);
        byKey.set(key, item);
        byId.set(item.id, item);
      }
      continue;
    }
    byId.set(item.id, item);
    if (addr) byKey.set(key, item);
  }
  return [...byId.values()];
}
