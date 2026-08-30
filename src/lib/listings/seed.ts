import { matchNeighborhood } from "@/lib/city/map";
import { placeListing } from "./locate";
import type { Listing, ListingType, ListingsPayload, Offer, PricePeriod, SourceId, SourceStatus } from "./types";

type Seed = {
  source: SourceId;
  ext: string;
  url: string;
  title: string;
  type: ListingType;
  offer?: Offer;
  amount: number | null;
  currency: "EUR" | "MKD" | null;
  period?: PricePeriod;
  m2?: number | null;
  rooms?: number | null;
  address?: string | null;
  posted: string | null;
  hint?: string;
};

const SEED: Seed[] = [
  { source: "pazar3", ext: "9098956", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/centar-plostad/9098956", title: "Центар плоштад", type: "stan", amount: 300, currency: "EUR", posted: "2026-08-27T08:48:00+02:00", hint: "плоштад" },
  { source: "pazar3", ext: "9079288", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/se-izdava-stan/9079288", title: "Се издава стан", type: "stan", amount: 200, currency: "EUR", posted: "2026-08-23T12:12:00+02:00" },
  { source: "pazar3", ext: "9097266", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/ipet-me-qira-se-izdava/9097266", title: "Ipet me qira — се издава", type: "stan", amount: 350, currency: "EUR", posted: "2026-08-23T09:32:00+02:00" },
  { source: "pazar3", ext: "9087392", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/izdavam-stan-za-kratok-prestoj/9087392", title: "Стан за краток престој", type: "stan", amount: 40, currency: "EUR", period: "day", posted: "2026-08-20T12:21:00+02:00" },
  { source: "pazar3", ext: "4250818", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/se-izdava-stan-za-kratok-prestoj/4250818", title: "Се издава стан за краток престој", type: "stan", amount: 25, currency: "EUR", period: "day", posted: "2026-08-19T14:08:00+02:00" },
  { source: "pazar3", ext: "4276078", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/stan-za-kratok-prestoj-stan-za-kratok-prestoj/4276078", title: "Стан за краток престој", type: "stan", amount: 30, currency: "EUR", period: "day", posted: "2026-08-18T14:59:00+02:00" },
  { source: "pazar3", ext: "9094493", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/moderen-i-kompletno-ureden-stan-idealen-za-udobno-zhiveenje/9094493", title: "Модерен комплетно уреден стан", type: "stan", amount: 450, currency: "EUR", posted: "2026-08-17T16:53:00+02:00" },
  { source: "pazar3", ext: "9094510", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/se-izdava-prekrasen-i-vednash-vseliv-stan-vo-kompleks-bela2/9094510", title: "Стан во комплекс Бела 2", type: "stan", amount: 400, currency: "EUR", posted: "2026-08-17T16:49:00+02:00", hint: "бела 2 трговски" },
  { source: "pazar3", ext: "7602790", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/se-iznajmuva/7602790", title: "Се изнајмува стан", type: "stan", amount: 350, currency: "EUR", posted: "2026-08-17T10:26:00+02:00" },
  { source: "pazar3", ext: "8154726", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/stan-kancelarija/8154726", title: "Стан / канцеларија", type: "lokal", amount: 300, currency: "EUR", posted: "2026-08-13T20:51:00+02:00", hint: "центар" },
  { source: "pazar3", ext: "6306356", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/se-izdava-stan-centar/6306356", title: "Се издава стан центар", type: "stan", amount: 300, currency: "EUR", posted: "2026-01-18T12:00:00+01:00", hint: "центар" },
  { source: "pazar3", ext: "6285420", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/se-iznajmuva-stan-na-namesten-oktomvriska-revolucija/6285420", title: "Наместен стан на Октомвриска Револуција", type: "stan", amount: 21000, currency: "MKD", posted: "2026-01-15T12:00:00+01:00", hint: "октомвриска" },
  { source: "pazar3", ext: "6240280", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/se-iznajmuva-dvosoben-namesten-stan/6240280", title: "Двособен наместен стан", type: "stan", amount: 13500, currency: "MKD", rooms: 2, posted: "2025-12-30T12:00:00+01:00" },
  { source: "pazar3", ext: "6127719", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/se-izdava-namesten-stan/6127719", title: "Се издава наместен стан", type: "stan", amount: 250, currency: "EUR", posted: "2025-11-25T12:00:00+01:00" },
  { source: "pazar3", ext: "5543005", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/se-izdava-namesten-stan-vo-trgovski/5543005", title: "Наместен стан во трговски", type: "stan", amount: 280, currency: "EUR", posted: "2025-08-29T12:00:00+02:00", hint: "трговски" },
  { source: "pazar3", ext: "6360708", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/se-izvada-namesten-stan/6360708", title: "Се издава наместен стан", type: "stan", amount: 23500, currency: "MKD", posted: "2026-02-24T12:00:00+01:00" },
  { source: "pazar3", ext: "6090769", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/izdavanje/kumanovo/kumanovo-opstina/se-iznajmuva-prodava-4-soben-stan-vo-centar-nad-ramstor/6090769", title: "4-собен стан над Рамстор", type: "stan", offer: "rent", amount: null, currency: null, period: "negotiable", rooms: 4, posted: "2025-11-07T12:00:00+01:00", hint: "рамстор центар" },
  { source: "pazar3", ext: "9099561", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/dukani-trafiki/izdavanje/kumanovo/kumanovo-opstina/se-izdava-deloben-prostor/9099561", title: "Се издава деловен простор", type: "lokal", amount: 650, currency: "EUR", posted: "2026-08-28T18:32:00+02:00", hint: "центар" },
  { source: "pazar3", ext: "3197749", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/dukani-trafiki/izdavanje/kumanovo/kumanovo-opstina/se-iznajmuva-dukjan-deloven-prostor-vo-naselba-pero-cico/3197749", title: "Дуќан во населба Перо Чичо", type: "lokal", amount: null, currency: null, period: "negotiable", posted: "2026-08-29T11:30:00+02:00", hint: "перо чичо" },
  { source: "pazar3", ext: "8716080", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/dukani-trafiki/izdavanje/kumanovo/kumanovo-opstina/se-izdava-dukan-vo-czentar-na-gradot/8716080", title: "Дуќан во центар на градот", type: "lokal", amount: null, currency: null, period: "negotiable", posted: "2026-07-27T21:52:00+02:00", hint: "центар" },
  { source: "pazar3", ext: "9037708", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/dukani-trafiki/izdavanje/kumanovo/kumanovo-opstina/se-izdava-dukan/9037708", title: "Се издава дуќан", type: "lokal", amount: null, currency: null, period: "negotiable", posted: "2026-07-15T12:31:00+02:00" },
  { source: "pazar3", ext: "9050859", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/kancelarija/izdavanje/kumanovo/kumanovo-opstina/lokalot-se-iznajmuva/9050859", title: "Локалот се изнајмува", type: "lokal", amount: null, currency: null, period: "negotiable", posted: "2026-06-29T22:41:00+02:00", hint: "центар" },
  { source: "pazar3", ext: "9009422", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/drugo/izdavanje/kumanovo/kumanovo-opstina/izdavanje-deloven-prostor-vo-kumanovo-42-m/9009422", title: "Издавање деловен простор во Куманово — 42 m²", type: "lokal", amount: null, currency: null, period: "negotiable", m2: 42, posted: "2026-06-18T22:25:00+02:00" },
  { source: "pazar3", ext: "9034137", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/kancelarija/izdavanje/kumanovo/kumanovo-opstina/ploshtad/9034137", title: "Деловен простор — Плоштад", type: "lokal", amount: 350, currency: "EUR", posted: "2026-06-11T19:31:00+02:00", hint: "плоштад" },
  { source: "pazar3", ext: "9032130", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/dukani-trafiki/izdavanje/kumanovo/kumanovo-opstina/se-izdava-deloven-prostor-dukan-vo-strog-czentar-na-gradot/9032130", title: "Дуќан во строг центар", type: "lokal", amount: null, currency: null, period: "negotiable", posted: "2026-06-08T13:17:00+02:00", hint: "строг центар" },
  { source: "pazar3", ext: "8840862", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/dukani-trafiki/izdavanje/kumanovo/kumanovo-opstina/ducan/8840862", title: "Дуќан", type: "lokal", amount: 250, currency: "EUR", posted: "2026-06-01T17:50:00+02:00" },
  { source: "pazar3", ext: "5225729", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/dukani-trafiki/izdavanje/kumanovo/kumanovo-opstina/se-izdava-dukan-pod-kirija/5225729", title: "Дуќан под кирија — ул. Илинденска", type: "lokal", amount: null, currency: null, period: "negotiable", m2: 20, address: "ул. Илинденска, Куманово", posted: "2025-01-01T12:00:00+01:00", hint: "илинденска" },
  { source: "pazar3", ext: "8983606", url: "https://www.pazar3.mk/oglas/zivealista/kukji-vili/izdavanje/kumanovo/kumanovo-opstina/shtepi-me-qira-banese-5-dhomeshe-ne-lokacion-te-mire/8983606", title: "Куќа 5 соби под кирија", type: "kukja", amount: 350, currency: "EUR", rooms: 5, posted: "2026-05-16T08:33:00+02:00" },
  { source: "pazar3", ext: "4650771", url: "https://www.pazar3.mk/oglas/zivealista/kukji-vili/izdavanje/kumanovo/kumanovo-opstina/se-iznajmuva-sprat-od-kuka/4650771", title: "Се изнајмува спрат од куќа", type: "kukja", amount: 290, currency: "EUR", posted: "2026-06-23T08:26:00+02:00" },
  { source: "pazar3", ext: "6360079", url: "https://www.pazar3.mk/oglas/zivealista/kukji-vili/izdavanje/kumanovo/kumanovo-opstina/se-izdava-sprat-od-kuka/6360079", title: "Се издава спрат од куќа", type: "kukja", amount: 250, currency: "EUR", posted: "2026-02-23T13:15:00+01:00" },
  { source: "pazar3", ext: "3107084", url: "https://www.pazar3.mk/oglas/zivealista/kukji-vili/izdavanje/kumanovo/kumanovo-opstina/se-izdava-kuka-vo-centar-na-bulevar/3107084", title: "Куќа во центар на булевар", type: "kukja", amount: 140, currency: "EUR", posted: "2026-01-31T17:38:00+01:00", hint: "булевар центар" },
  { source: "pazar3", ext: "2753095", url: "https://www.pazar3.mk/oglas/zivealista/kukji-vili/izdavanje/kumanovo/kumanovo-opstina/izdavam-kuka-vo-centar-na-bulevar-3mub/2753095", title: "Куќа на булевар 3 МУБ", type: "kukja", amount: 140, currency: "EUR", posted: "2025-09-16T15:29:00+02:00", hint: "3муб булевар" },
  { source: "reklama5", ext: "969463", url: "https://www.reklama5.mk/Search?ad=969463&cat=167&city=288", title: "Се издава дуќан во Куманово", type: "lokal", amount: 350, currency: "EUR", posted: "2025-06-19T07:32:00+02:00" },
  { source: "reklama5", ext: "2256178", url: "https://www.reklama5.mk/Search?ad=2256178&cat=168&city=288", title: "Деловен простор за издавање", type: "lokal", amount: 350, currency: "EUR", posted: "2025-06-25T11:56:00+02:00" },
  { source: "keyadvisory", ext: "625m2", url: "https://keyadvisory.mk/imot/se-izdava-deloven-prostor-od-625m2-vo-kumanovo/", title: "Се издава деловен простор од 625 м²", type: "lokal", amount: 2500, currency: "EUR", m2: 625, posted: null, hint: "центар" },
  { source: "facebook", ext: "leninova-107", url: "https://www.facebook.com/groups/874216653549188/posts/1859843151653195/", title: "Деловен простор — ул. Ленинова, 107 м²", type: "lokal", amount: null, currency: null, period: "negotiable", m2: 107, address: "ул. Ленинова, над стариот кружен тек", posted: "2026-08-20T12:00:00+02:00", hint: "ленинова" },
  { source: "pazar3", ext: "6359784", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/dukani-trafiki/prodazba/kumanovo/kumanovo-opstina/izdavam-dukan-strog-centar-garnizon-do-dukan-mice/6359784", title: "Издавам дуќан строг центар Гарнизон", type: "lokal", amount: null, currency: null, period: "negotiable", posted: "2026-08-27T10:36:00+02:00", hint: "гарнизон центар" },
  { source: "pazar3", ext: "9097466", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/magacin/prodazba/kumanovo/kumanovo-opstina/deloven-prostor-kancelariski-i-magacinski-prostor/9097466", title: "Деловен простор — канцелариски и магацински", type: "lokal", offer: "sale", amount: null, currency: null, period: "negotiable", posted: "2026-08-22T12:30:00+02:00", hint: "центар" },
  { source: "pazar3", ext: "9083499", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/drugo/izdavanje/kumanovo/kumanovo-opstina/deloven-prostor/9083499", title: "Деловен простор", type: "lokal", amount: null, currency: null, period: "negotiable", posted: "2026-07-29T10:25:00+02:00" },
  { source: "pazar3", ext: "9052451", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/drugo/prodazba/kumanovo/kumanovo-opstina/se-prodava-stanbeno-deloven-objekt-od-600m2-vo-dobroshane/9052451", title: "Станбено-деловен објект 600 м² во Доброшане", type: "lokal", offer: "sale", amount: 700000, currency: "EUR", period: "total", m2: 600, posted: "2026-07-03T15:35:00+02:00", hint: "доброшане" },
  { source: "pazar3", ext: "9053956", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/dukani-trafiki/prodazba/kumanovo/kumanovo-opstina/ekskluzivna-lokaczija-vo-srzhta-na-gradot-sudska-palata/9053956", title: "Ексклузивна локација — Судска палата", type: "lokal", offer: "sale", amount: null, currency: null, period: "negotiable", posted: "2026-07-10T16:51:00+02:00", hint: "судска центар" },
  { source: "pazar3", ext: "7911267", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/magacin/prodazba/kumanovo/kumanovo-opstina/se-prodavaat-kancelarii-vo-kumanovo/7911267", title: "Се продаваат канцеларии во Куманово", type: "lokal", offer: "sale", amount: null, currency: null, period: "negotiable", posted: "2026-08-17T11:46:00+02:00", hint: "центар" },
  { source: "pazar3", ext: "9100208", url: "https://www.pazar3.mk/oglas/zivealista/vikendici/prodazba/kumanovo/kumanovo-opstina/prodavam-vikendica-vo-selo-vojnik-na-12-km-od-kumanovo/9100208", title: "Викендица во село Војник, 12 км од Куманово", type: "vikend", offer: "sale", amount: null, currency: null, period: "negotiable", posted: "2026-08-27T20:51:00+02:00", hint: "војник" },
  { source: "pazar3", ext: "9078181", url: "https://www.pazar3.mk/oglas/zivealista/vikendici/prodazba/kumanovo/kumanovo-opstina/vikendica-vo-supli-kamen-kumanovo/9078181", title: "Викендица во Шупли Камен", type: "vikend", offer: "sale", amount: 31500, currency: "EUR", period: "total", posted: "2026-07-17T17:21:00+02:00", hint: "шупли камен" },
  { source: "pazar3", ext: "9053716", url: "https://www.pazar3.mk/oglas/zivealista/vikendici/prodazba/kumanovo/kumanovo-opstina/vikendica/9053716", title: "Викендица", type: "vikend", offer: "sale", amount: 70000, currency: "EUR", period: "total", posted: "2026-07-07T19:54:00+02:00" },
  { source: "pazar3", ext: "8588138", url: "https://www.pazar3.mk/oglas/zivealista/vikendici/prodazba/kumanovo/kumanovo-opstina/se-prodava-vokendicza-so-placz/8588138", title: "Се продава викендица со плац", type: "vikend", offer: "sale", amount: null, currency: null, period: "negotiable", posted: "2026-04-30T15:54:00+02:00" },
  { source: "pazar3", ext: "8122925", url: "https://www.pazar3.mk/oglas/zivealista/vikendici/prodazba/kumanovo/kumanovo-opstina/vikendica/8122925", title: "Викендица", type: "vikend", offer: "sale", amount: 72000, currency: "EUR", period: "total", posted: "2025-10-26T07:36:00+02:00" },
  { source: "pazar3", ext: "7835036", url: "https://www.pazar3.mk/oglas/zivealista/vikendici/prodazba/kumanovo/kumanovo-opstina/se-prodava/7835036", title: "Се продава викендица", type: "vikend", offer: "sale", amount: 13000, currency: "EUR", period: "total", posted: "2025-09-16T17:40:00+02:00" },
  { source: "pazar3", ext: "7554927", url: "https://www.pazar3.mk/oglas/zivealista/vikendici/prodazba/kumanovo/staro-nagoricane/vikendica-vo-strezovce-do-glaven-pat/7554927", title: "Викендица во Стрезовце до главен пат", type: "vikend", offer: "sale", amount: 32000, currency: "EUR", period: "total", posted: "2025-08-18T16:20:00+02:00", hint: "стрезовце" },
  { source: "pazar3", ext: "7014956", url: "https://www.pazar3.mk/oglas/zivealista/vikendici/prodazba/kumanovo/kumanovo-opstina/plac-od-1300kv-so-vikendica/7014956", title: "Плац 1300 м² со викендица", type: "vikend", offer: "sale", amount: 11111, currency: "EUR", period: "total", m2: 1300, posted: "2025-04-29T22:34:00+02:00" },
  { source: "pazar3", ext: "5799745", url: "https://www.pazar3.mk/oglas/zivealista/vikendici/prodazba/kumanovo/kumanovo-opstina/se-prodava-vikendica-bedinski-basci/5799745", title: "Викендица — Бедински бавчи", type: "vikend", offer: "sale", amount: null, currency: null, period: "negotiable", posted: "2025-08-20T10:54:00+02:00", hint: "бединје" },
  { source: "pazar3", ext: "9097800", url: "https://www.pazar3.mk/oglas/zivealista/placovi-nivi-farmi/prodazba/kumanovo/kumanovo-opstina/gradezno-zemjiste/9097800", title: "Градежно земјиште", type: "niva", offer: "sale", amount: null, currency: null, period: "negotiable", posted: "2026-08-23T12:00:00+02:00" },
  { source: "pazar3", ext: "8983600", url: "https://www.pazar3.mk/oglas/zivealista/placovi-nivi-farmi/prodazba/kumanovo/kumanovo-opstina/niva-plac-vo-romanovce-na-avtopat-kum-skopje/8983600", title: "Нива-плац во Романовце на автопат Куманово–Скопје", type: "niva", offer: "sale", amount: null, currency: null, period: "negotiable", posted: "2026-08-21T12:00:00+02:00", hint: "романовце" },
  { source: "pazar3", ext: "9090984", url: "https://www.pazar3.mk/oglas/zivealista/placovi-nivi-farmi/prodazba/kumanovo/kumanovo-opstina/se-prodava-placz-vo-dovezencze-idealen-za-vikendicza/9090984", title: "Плац во Довезенце — идеален за викендица", type: "niva", offer: "sale", amount: null, currency: null, period: "negotiable", posted: "2026-08-20T12:00:00+02:00", hint: "довезенце" },
  { source: "pazar3", ext: "4667421", url: "https://www.pazar3.mk/oglas/zivealista/placovi-nivi-farmi/prodazba/kumanovo/kumanovo-opstina/se-prodava/4667421", title: "Се продава плац", type: "niva", offer: "sale", amount: 30000, currency: "EUR", period: "total", posted: "2026-08-20T12:00:00+02:00" },
  { source: "pazar3", ext: "7036165", url: "https://www.pazar3.mk/oglas/zivealista/placovi-nivi-farmi/prodazba/kumanovo/kumanovo-opstina/hitno-se-prodava-niva-vo-cekeze/7036165", title: "Нива во Чекезе", type: "niva", offer: "sale", amount: null, currency: null, period: "negotiable", posted: "2026-08-16T12:00:00+02:00", hint: "чекезе" },
  { source: "pazar3", ext: "6111726", url: "https://www.pazar3.mk/oglas/zivealista/placovi-nivi-farmi/izdavanje/kumanovo/kumanovo-opstina/placz-pod-naem/6111726", title: "Плац под наем", type: "niva", offer: "rent", amount: 25, currency: "EUR", period: "month", posted: "2026-08-15T12:00:00+02:00" },
  { source: "pazar3", ext: "7198132", url: "https://www.pazar3.mk/oglas/zivealista/placovi-nivi-farmi/prodazba/kumanovo/kumanovo-opstina/se-prodava-niva-plac-vo-bedinje/7198132", title: "Нива/плац во Бединје", type: "niva", offer: "sale", amount: 16500, currency: "EUR", period: "total", posted: "2026-08-14T12:00:00+02:00", hint: "бединје" },
  { source: "pazar3", ext: "9092777", url: "https://www.pazar3.mk/oglas/zivealista/placovi-nivi-farmi/prodazba/kumanovo/kumanovo-opstina/se-prodava-niva/9092777", title: "Се продава нива", type: "niva", offer: "sale", amount: null, currency: null, period: "negotiable", posted: "2026-08-14T12:00:00+02:00" },
  { source: "pazar3", ext: "9083970", url: "https://www.pazar3.mk/oglas/zivealista/placovi-nivi-farmi/prodazba/kumanovo/kumanovo-opstina/se-prodava-gradezhno-zemjishte-3140-m-vo-grad-kumanovo/9083970", title: "Градежно земјиште 3140 м² во град Куманово", type: "niva", offer: "sale", amount: null, currency: null, period: "negotiable", m2: 3140, posted: "2026-07-29T12:00:00+02:00", hint: "центар" },
  { source: "pazar3", ext: "9055514", url: "https://www.pazar3.mk/oglas/zivealista/placovi-nivi-farmi/prodazba/kumanovo/staro-nagoricane/se-prodava-niva-plac-vo-s-celopek-kumanovo/9055514", title: "Нива/плац во с. Челопек", type: "niva", offer: "sale", amount: null, currency: null, period: "negotiable", posted: "2026-07-11T12:00:00+02:00", hint: "челопек" },
  { source: "pazar3", ext: "9032909", url: "https://www.pazar3.mk/oglas/zivealista/placovi-nivi-farmi/prodazba/kumanovo/kumanovo-opstina/se-prodava-imot-kumanovo-dejlovce/9032909", title: "Имот во Дејловце", type: "niva", offer: "sale", amount: null, currency: null, period: "negotiable", posted: "2026-08-09T12:00:00+02:00", hint: "дејловце" },
  { source: "pazar3", ext: "5244581", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/prodazba/kumanovo/kumanovo-opstina/se-prodava-stan-vo-kumanovo/5244581", title: "Се продава стан во Куманово — 63 м²", type: "stan", offer: "sale", amount: null, currency: null, period: "total", m2: 63, rooms: 2, posted: null, hint: "центар" },
  { source: "pazar3", ext: "2953002", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/prodazba/kumanovo/kumanovo-opstina/stan-prodavam/2953002", title: "Стан продавам — 50 м², 3 соби", type: "stan", offer: "sale", amount: null, currency: null, period: "total", m2: 50, rooms: 3, posted: null },
  { source: "pazar3", ext: "8077909", url: "https://www.pazar3.mk/oglas/zivealista/stanovi/prodazba/kumanovo/kumanovo-opstina/se-prodava-dupleks-sta-vo-kumanovo/8077909", title: "Се продава дуплекс стан 78 м²", type: "stan", offer: "sale", amount: null, currency: null, period: "total", m2: 78, posted: null },
  { source: "pazar3", ext: "7292120", url: "https://www.pazar3.mk/oglas/zivealista/kukji-vili/prodazba/kumanovo/kumanovo-opstina/se-prodava-kuka-so-placz-vo-selo-vincze/7292120", title: "Куќа со плац во село Винце", type: "kukja", offer: "sale", amount: null, currency: null, period: "total", m2: 100, posted: null, hint: "винце" },
  { source: "pazar3", ext: "4799489", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/kancelarija/prodazba/kumanovo/kumanovo-opstina/se-prodava-petosed-vo-odlichna-sostojba/4799489", title: "Се продава петосед во одлична состојба", type: "lokal", offer: "sale", amount: null, currency: null, period: "negotiable", posted: null, hint: "центар" },
  { source: "pazar3", ext: "9031730", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/dukani-trafiki/prodazba/kumanovo/kumanovo-opstina/se-prodava-i-se-izdava-dukjan/9031730", title: "Се продава и се издава дуќан", type: "lokal", offer: "sale", amount: null, currency: null, period: "negotiable", posted: null },
  { source: "pazar3", ext: "9009280", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/drugo/prodazba/kumanovo/kumanovo-opstina/se-izdava-deloven-prostor/9009280", title: "Се издава деловен простор", type: "lokal", amount: null, currency: null, period: "negotiable", posted: null },
  { source: "pazar3", ext: "9038163", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/kancelarija/izdavanje/kumanovo/kumanovo-opstina/atraktivna-ponuda-se-iznajmuva-vo-czentar-na-gradot/9038163", title: "Се изнајмува во центар на градот", type: "lokal", amount: null, currency: null, period: "negotiable", posted: null, hint: "центар" },
  { source: "pazar3", ext: "9056256", url: "https://www.pazar3.mk/oglas/rabota-biznis/deloven-prostor/dukani-trafiki/prodazba/kumanovo/kumanovo-opstina/deloven-prostor/9056256", title: "Деловен простор", type: "lokal", offer: "sale", amount: null, currency: null, period: "negotiable", posted: null },
];

export function seedListings(now = new Date().toISOString()): Listing[] {
  return SEED.map((s) => {
    const text = `${s.title} ${s.address ?? ""} ${s.hint ?? ""}`;
    const n = matchNeighborhood(text);
    const base = placeListing({
      id: `${s.source}:${s.ext}`,
      title: s.title,
      address: s.address ?? null,
      neighborhood: n.nameMk,
      sourceUrl: s.url,
      description: s.hint ?? null,
      lat: n.lat,
      lng: n.lng,
      worldX: 0,
      worldZ: 0,
    });
    return {
      id: `${s.source}:${s.ext}`,
      source: s.source,
      sourceUrl: s.url,
      title: s.title,
      description: null,
      listingType: s.type,
      offer: s.offer ?? "rent",
      priceAmount: s.amount,
      priceCurrency: s.currency,
      pricePeriod: s.period ?? (s.amount === null ? "negotiable" : "month"),
      areaM2: s.m2 ?? null,
      rooms: s.rooms ?? null,
      address: base.address,
      neighborhood: base.neighborhood,
      lat: base.lat,
      lng: base.lng,
      worldX: base.worldX,
      worldZ: base.worldZ,
      contactPhone: null,
      photoUrl: null,
      postedAt: s.posted,
      fetchedAt: now,
      available: true,
    };
  });
}

/** Client-safe last-seen payload when the live fetch/DB path fails. */
export function fallbackPayload(includeSale = false): ListingsPayload {
  const now = new Date().toISOString();
  let listings = seedListings(now);
  if (!includeSale) listings = listings.filter((l) => l.offer === "rent" || l.listingType === "vikend" || l.listingType === "niva");
  const count = (s: SourceId) => listings.filter((l) => l.source === s).length;
  const mk = (source: SourceId, status: SourceStatus["status"], detail: string, ok: boolean): SourceStatus => ({
    source,
    status,
    detail,
    lastOkAt: ok ? now : null,
    lastTryAt: now,
    listingCount: count(source),
  });
  return {
    listings,
    sources: [
      mk("pazar3", "ok", "последно видени јавни огласи (кеш)", true),
      mk("reklama5", "blocked", "Cloudflare ја блокира живата врска; прикажани се последно видени огласи", false),
      mk("keyadvisory", "ok", "јавен агенциски оглас", true),
      mk("facebook", "restricted", "Приватните inbox-и не се читаат.", true),
      mk("google", "restricted", "Нема официјален API клуч.", false),
    ],
    cachedAt: now,
    stale: true,
    cacheMinutes: 30,
  };
}
