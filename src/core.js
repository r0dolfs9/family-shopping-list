// core.js — pure logic, no DOM, no network. Unit-testable.

export const CATEGORIES = [
  { key: 'produce', label: 'Dārzeņi', hue: '#4f8a4f' },
  { key: 'fruit', label: 'Augļi', hue: '#d28a18' },
  { key: 'meat', label: 'Gaļa', hue: '#b94b4b' },
  { key: 'dairy', label: 'Piena produkti', hue: '#4779c8' },
  { key: 'bakery', label: 'Maize', hue: '#9a6b3b' },
  { key: 'drinks', label: 'Dzērieni', hue: '#2f8f9d' },
  { key: 'snacks', label: 'Našķi', hue: '#9a5bb8' },
  { key: 'frozen', label: 'Saldēts', hue: '#5b89aa' },
  { key: 'household', label: 'Mājai', hue: '#6f7380' },
  { key: 'other', label: 'Cits', hue: '#2541e0' },
];

const CATEGORY_KEYWORDS = {
  produce: ['kartup', 'burkan', 'tomat', 'gurk', 'salat', 'sipol', 'kapost', 'paprik', 'darzen', 'biet', 'kabac'],
  fruit: ['abol', 'banan', 'apels', 'citron', 'augl', 'vinog', 'bumbier', 'zemen', 'mellen', 'avene'],
  meat: ['vista', 'cuka', 'liellop', 'gal', 'desa', 'desin', 'filej', 'malt', 'speķ', 'spek', 'šķiņķ', 'skink'],
  dairy: ['piens', 'siers', 'jogurt', 'kefir', 'biezpien', 'krejum', 'sviest', 'olas', 'ola '],
  bakery: ['maiz', 'bulcin', 'lavas', 'tortil', 'baget', 'kuka', 'smalkmaiz'],
  snacks: ['cips', 'sokolad', 'cepum', 'konfekt', 'riekst', 'batonin', 'popkorn'],
  drinks: ['udens', 'sula', 'limonad', 'alus', 'vins', 'kafij', 'tej', 'kvass', 'kola'],
  frozen: ['saldet', 'pelmen', 'saldej', 'pica'],
  household: ['papir', 'ziep', 'samp', 'mazg', 'trauk', 'maiss', 'tualet', 'sveces', 'folij', 'salvet'],
};

export function guessCategory(name) {
  const normalized = normalizeText(name);
  for (const [key, stems] of Object.entries(CATEGORY_KEYWORDS)) {
    if (stems.some((stem) => normalized.includes(normalizeText(stem)))) return key;
  }
  return 'other';
}

export function categoryByKey(key) {
  return CATEGORIES.find((category) => category.key === key) ?? CATEGORIES.at(-1);
}

// ---------- Items ----------
// price: number | null. Never invented.
// priceSource: 'manual' (typed by family for this item) | 'history' (from family price history) | null
// priceUpdatedAt: ISO string when that price was set/recorded.

export function createItem(input, options = {}) {
  const now = options.now ?? new Date().toISOString();
  return normalizeItem({
    id: options.id ?? cryptoRandomId(),
    name: input.name,
    qty: input.qty,
    note: input.note,
    category: input.category || undefined,
    price: input.price ?? null,
    priceSource: input.price != null ? (input.priceSource ?? 'manual') : (input.priceSource ?? null),
    priceUpdatedAt: input.price != null ? (input.priceUpdatedAt ?? now) : (input.priceUpdatedAt ?? null),
    status: 'active',
    addedBy: options.memberId ?? null,
    addedAt: now,
    updatedAt: now,
  });
}

export function normalizeItem(item) {
  const name = String(item.name ?? '').trim();
  const price = toPriceNumber(item.price);
  return {
    id: String(item.id ?? cryptoRandomId()),
    name,
    qty: trimOrEmpty(item.qty),
    note: trimOrEmpty(item.note),
    category: item.category || guessCategory(name),
    status: item.status === 'bought' ? 'bought' : 'active',
    price,
    priceSource: price == null ? null : (item.priceSource === 'history' ? 'history' : 'manual'),
    priceUpdatedAt: price == null ? null : (item.priceUpdatedAt ?? new Date().toISOString()),
    addedBy: item.addedBy ?? null,
    addedAt: item.addedAt ?? new Date().toISOString(),
    checkedBy: item.checkedBy ?? null,
    checkedAt: item.checkedAt ?? null,
    updatedAt: item.updatedAt ?? new Date().toISOString(),
  };
}

// Freshness is derived at read time, never stored.
export const FRESH_DAYS = 60;

export function priceFreshness(item, now = Date.now()) {
  if (item.price == null) return 'none';
  if (item.priceSource === 'manual') return 'manual';
  const age = now - Date.parse(item.priceUpdatedAt ?? 0);
  return age <= FRESH_DAYS * 86400_000 ? 'recent' : 'stale';
}

// ---------- Grouping / totals ----------

export function groupItems(items) {
  const normalized = items.map(normalizeItem);
  const groups = [];
  for (const category of CATEGORIES) {
    const categoryItems = normalized.filter((item) => item.status === 'active' && item.category === category.key);
    if (categoryItems.length) groups.push({ ...category, items: categoryItems });
  }
  const boughtItems = normalized
    .filter((item) => item.status === 'bought')
    .sort((a, b) => String(b.checkedAt ?? '').localeCompare(String(a.checkedAt ?? '')));
  if (boughtItems.length) groups.push({ key: 'bought', label: 'Grozā', hue: '#6f7380', items: boughtItems });
  return groups;
}

export function listSummary(items, now = Date.now()) {
  const active = items.map(normalizeItem).filter((item) => item.status === 'active');
  let totalKnown = 0;
  let pricedCount = 0;
  let hasEstimates = false;
  for (const item of active) {
    const freshness = priceFreshness(item, now);
    if (freshness === 'none') continue;
    pricedCount += 1;
    totalKnown += item.price;
    if (freshness !== 'manual') hasEstimates = true;
  }
  return {
    activeCount: active.length,
    pricedCount,
    unpricedCount: active.length - pricedCount,
    totalKnown: roundMoney(totalKnown),
    hasEstimates,
  };
}

// ---------- Money (Latvian formatting) ----------

const moneyFormat = (() => {
  try {
    return new Intl.NumberFormat('lv-LV', { style: 'currency', currency: 'EUR' });
  } catch {
    return null;
  }
})();

export function formatMoney(value) {
  const number = Number(value || 0);
  if (moneyFormat) return moneyFormat.format(number);
  return `${number.toFixed(2).replace('.', ',')} €`;
}

// Accepts "1,50", "1.50", " 2 ". Returns number or null (never NaN, never negative).
export function parsePrice(value) {
  const trimmed = String(value ?? '').replace(',', '.').replace(/[^\d.]/g, '').trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number) || number < 0 || number > 9999) return null;
  return roundMoney(number);
}

// ---------- Helpers ----------

export function nameKey(name) {
  return normalizeText(name).replace(/\s+/g, ' ').trim();
}

export function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function trimOrEmpty(value) {
  return String(value ?? '').trim();
}

export function cryptoRandomId() {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return random;
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 10)}`;
}

export function toPriceNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? roundMoney(number) : null;
}
