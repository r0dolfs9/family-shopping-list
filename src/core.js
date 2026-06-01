export const CATEGORIES = [
  { key: 'produce', label: 'Darzeni', hue: '#4f8a4f' },
  { key: 'fruit', label: 'Augli', hue: '#d28a18' },
  { key: 'meat', label: 'Gala', hue: '#b94b4b' },
  { key: 'dairy', label: 'Piena produkti', hue: '#4779c8' },
  { key: 'bakery', label: 'Maize', hue: '#9a6b3b' },
  { key: 'drinks', label: 'Dzerieni', hue: '#2f8f9d' },
  { key: 'snacks', label: 'Naski', hue: '#9a5bb8' },
  { key: 'frozen', label: 'Saldets', hue: '#5b89aa' },
  { key: 'household', label: 'Majai', hue: '#6f7380' },
  { key: 'other', label: 'Cits', hue: '#2541e0' },
];

const CATEGORY_KEYWORDS = {
  produce: ['kartup', 'burkan', 'tomat', 'gurk', 'salat', 'sipol', 'kapost', 'paprik', 'darzen'],
  fruit: ['abol', 'banan', 'apels', 'citron', 'aug', 'vinosaur', 'bumbier', 'zemene'],
  meat: ['vista', 'cuka', 'liellop', 'gala', 'des', 'filej', 'malt'],
  dairy: ['piens', 'siers', 'jogurt', 'kefir', 'biezpien', 'krejum', 'sviest'],
  bakery: ['maiz', 'bulcin', 'lavaš', 'tortil', 'baget'],
  drinks: ['udens', 'sula', 'limonad', 'alus', 'vins', 'kafij', 'tej'],
  snacks: ['cips', 'sokolad', 'cepum', 'konfekt', 'riekst'],
  frozen: ['saldet', 'pelmen', 'saldēj', 'pica'],
  household: ['papir', 'ziep', 'šamp', 'samp', 'mazg', 'trauk', 'maiss', 'tualet'],
};

const PRICE_HINTS = [
  ['piens', 1.25],
  ['maiz', 1.1],
  ['banan', 1.6],
  ['abol', 1.4],
  ['vista', 4.8],
  ['siers', 3.2],
  ['kafij', 5.5],
  ['udens', 0.85],
  ['papir', 3.4],
  ['olas', 2.5],
];

export function guessCategory(name) {
  const normalized = normalizeText(name);
  for (const [key, stems] of Object.entries(CATEGORY_KEYWORDS)) {
    if (stems.some((stem) => normalized.includes(normalizeText(stem)))) return key;
  }
  return 'other';
}

export function estimatePrice(name) {
  const normalized = normalizeText(name);
  const match = PRICE_HINTS.find(([stem]) => normalized.includes(normalizeText(stem)));
  return match ? match[1] : 1.5;
}

export function createItem(input, options = {}) {
  return normalizeItem({
    id: options.id ?? cryptoRandomId(),
    name: input.name,
    qty: input.qty,
    note: input.note,
    category: input.category,
    priceEstimate: input.priceEstimate,
    status: 'active',
    addedBy: options.memberId ?? 'me',
    addedAt: options.now ?? new Date().toISOString(),
    updatedAt: options.now ?? new Date().toISOString(),
  });
}

export function normalizeItem(item) {
  const name = String(item.name ?? '').trim();
  const explicitPrice = item.priceEstimate !== undefined && item.priceEstimate !== null && item.priceEstimate !== '';
  const category = item.category || guessCategory(name);

  return {
    id: String(item.id ?? cryptoRandomId()),
    name,
    qty: trimOrEmpty(item.qty),
    note: trimOrEmpty(item.note),
    category,
    status: item.status === 'bought' ? 'bought' : 'active',
    priceEstimate: explicitPrice ? Number(item.priceEstimate) : estimatePrice(name),
    priceGuessed: item.priceGuessed ?? !explicitPrice,
    addedBy: item.addedBy ?? 'me',
    addedAt: item.addedAt ?? new Date().toISOString(),
    checkedBy: item.checkedBy ?? null,
    checkedAt: item.checkedAt ?? null,
    updatedAt: item.updatedAt ?? new Date().toISOString(),
  };
}

export function groupItems(items) {
  const normalized = items.map(normalizeItem);
  const groups = [];

  for (const category of CATEGORIES) {
    const categoryItems = normalized.filter((item) => item.status === 'active' && item.category === category.key);
    if (categoryItems.length) groups.push({ ...category, items: categoryItems });
  }

  const boughtItems = normalized.filter((item) => item.status === 'bought');
  if (boughtItems.length) {
    groups.push({ key: 'bought', label: 'Groza', hue: '#6f7380', items: boughtItems });
  }

  return groups;
}

export function listSummary(items) {
  const active = items.map(normalizeItem).filter((item) => item.status === 'active');
  const totalEstimate = roundMoney(active.reduce((sum, item) => sum + Number(item.priceEstimate || 0), 0));
  return { activeCount: active.length, totalEstimate };
}

export function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} €`;
}

export function categoryByKey(key) {
  return CATEGORIES.find((category) => category.key === key) ?? CATEGORIES.at(-1);
}

function trimOrEmpty(value) {
  return String(value ?? '').trim();
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function cryptoRandomId() {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return random;
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
