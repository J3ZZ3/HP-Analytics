import type {
  OverviewResponse,
  OverallTimeseriesResponse,
  TopProductsResponse,
  ProductStatsResponse,
  ProductSortBy,
  SortDir,
  TopProductItem,
} from "@/types";

export const MOCK_ENABLED = import.meta.env.VITE_MOCK === "true";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function seededRand(seed: number) {
  let s = seed;
  return (min: number, max: number) => {
    s = (s * 16807 + 7) % 2147483647;
    return min + (s % (max - min + 1));
  };
}

const LINES = [
  "EliteBook", "Spectre", "ZBook", "Pavilion", "Envy",
  "ProBook", "Dragonfly", "Victus", "OmniBook", "EliteDesk",
  "ProDesk", "EliteOne", "Pro Tower", "Slim Desktop", "Chromebook",
  "ZBook Studio", "ZBook Firefly", "Pavilion Aero", "Envy Move", "Elite Tower",
];

const SUFFIXES = [
  "13", "14", "15", "16", "17",
  "x360", "Plus", "Pro", "Ultra", "G10",
  "G11", "AiO", "Mini", "Flip", "Go",
];

const rand = seededRand(42);

interface CatalogEntry {
  id: string;
  name: string;
  price: number;
  baseViews: number;
  convPct: number;
}

const CATALOG: CatalogEntry[] = [];
const usedNames = new Set<string>();

for (let i = 0; i < 250; i++) {
  let name: string;
  do {
    const line = LINES[rand(0, LINES.length - 1)];
    const suffix = SUFFIXES[rand(0, SUFFIXES.length - 1)];
    const variant = rand(0, 9) > 6 ? ` ${rand(100, 999)}` : "";
    name = `HP ${line} ${suffix}${variant}`;
  } while (usedNames.has(name));
  usedNames.add(name);

  const raw = rand(1, 10000);
  const baseViews = Math.round(80 + 45000 * Math.pow(raw / 10000, 3));

  const priceRaw = rand(1, 10000);
  const price = Math.round((300 + 2700 * Math.pow(priceRaw / 10000, 1.5)) / 50) * 50 - 1;

  const convBase = rand(8, 220) / 10;
  const pricePenalty = Math.max(0.3, 1 - (price / 5000));
  const convPct = Math.round(convBase * pricePenalty * 10) / 10;

  CATALOG.push({
    id: `prod-${String(i + 1).padStart(4, "0")}-${((i + 1) * 0x1234abcd >>> 0).toString(16).padStart(8, "0")}`,
    name,
    price,
    baseViews,
    convPct: Math.max(0.5, convPct),
  });
}

function buildItem(i: number, scale: number): TopProductItem {
  const c = CATALOG[i];
  const views = Math.round(c.baseViews * scale);
  const purchases = Math.round(views * (c.convPct / 100));
  const revenue = Math.round(purchases * c.price * 0.85);
  return { product_id: c.id, product_name: c.name, views, purchases, revenue };
}

function allItems(scale: number): TopProductItem[] {
  return CATALOG.map((_, i) => buildItem(i, scale));
}

export function getMockOverview(days: number): OverviewResponse {
  const items = allItems(days / 30);
  const views = items.reduce((s, it) => s + it.views, 0);
  const purchases = items.reduce((s, it) => s + it.purchases, 0);
  const revenue = items.reduce((s, it) => s + it.revenue, 0);
  return {
    days,
    views,
    purchases,
    revenue,
    active_products: items.length,
    conversion_rate: views > 0 ? Math.round((purchases / views) * 10000) / 100 : 0,
    changes: { views: 12, purchases: -3, revenue: 8 },
  };
}

export function getMockTimeseries(days: number): OverallTimeseriesResponse {
  const r = seededRand(days * 42);
  const points = [];
  for (let i = days - 1; i >= 0; i--) {
    const dow = new Date(daysAgo(i)).getDay();
    const weekendDip = dow === 0 || dow === 6 ? 0.6 : 1;
    const trend = 1 + ((days - i) / days) * 0.3;
    const v = Math.round(r(1200, 2100) * weekendDip * trend);
    const p = Math.round(v * (r(5, 12) / 100));
    points.push({ day: daysAgo(i), views: v, purchases: p, revenue: p * r(45, 120) });
  }
  return { days, points };
}

export function getMockTopProducts(
  days: number,
  limit: number,
  sortBy: ProductSortBy = "views",
): TopProductsResponse {
  const items = allItems(days / 30);
  items.sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));
  return { days, limit, items: items.slice(0, limit) };
}

export function getMockProductStats(
  days: number,
  sortBy: ProductSortBy,
  sortDir: SortDir,
  page: number,
  limit: number,
  search?: string,
): ProductStatsResponse {
  let items = allItems(days / 30);

  if (search) {
    const q = search.toLowerCase();
    items = items.filter((it) => it.product_name.toLowerCase().includes(q));
  }

  const dir = sortDir === "asc" ? 1 : -1;
  items.sort((a, b) => dir * ((a[sortBy] as number) - (b[sortBy] as number)));

  const total = items.length;
  const start = (page - 1) * limit;
  return { total, page, limit, items: items.slice(start, start + limit) };
}
