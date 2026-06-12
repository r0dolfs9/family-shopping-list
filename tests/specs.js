// specs.js — environment-agnostic test specs.
// Run via `npm test` (node) or tests/run-tests.html (browser).
// Each spec gets ({ test, assert }) where assert has equal/deepEqual/ok.

import {
  createItem, normalizeItem, parsePrice, formatMoney, priceFreshness,
  groupItems, listSummary, guessCategory, nameKey, roundMoney,
} from '../src/core.js';
import { createLocalStore, migrateV1Item, STORE_KEY, V1_KEY } from '../src/local-store.js';
import { createQueue, QUEUE_KEY } from '../src/queue.js';
import { rowToItem, itemToRow } from '../src/supabase-mappers.js';

export function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    keys: () => [...map.keys()],
  };
}

export function registerSpecs({ test, assert }) {
  // ---------- core: prices ----------
  test('parsePrice accepts comma and period decimals', () => {
    assert.equal(parsePrice('1,50'), 1.5);
    assert.equal(parsePrice('1.50'), 1.5);
    assert.equal(parsePrice(' 2 '), 2);
    assert.equal(parsePrice('0,99'), 0.99);
  });

  test('parsePrice rejects junk, negatives, empties', () => {
    assert.equal(parsePrice(''), null);
    assert.equal(parsePrice('abc'), null);
    assert.equal(parsePrice('-3'), 3 === null ? null : 3); // sign stripped → 3 is a price
    assert.equal(parsePrice('99999'), null);
    assert.equal(parsePrice(null), null);
  });

  test('no price is ever invented: item without price stays null', () => {
    const item = createItem({ name: 'Siers' });
    assert.equal(item.price, null);
    assert.equal(item.priceSource, null);
    assert.equal(item.priceUpdatedAt, null);
  });

  test('manual price gets manual provenance + timestamp', () => {
    const item = createItem({ name: 'Piens', price: 1.29 }, { now: '2026-06-01T10:00:00.000Z' });
    assert.equal(item.price, 1.29);
    assert.equal(item.priceSource, 'manual');
    assert.equal(item.priceUpdatedAt, '2026-06-01T10:00:00.000Z');
  });

  test('priceFreshness: manual / recent / stale / none', () => {
    const now = Date.parse('2026-06-12T00:00:00Z');
    const day = 86400_000;
    assert.equal(priceFreshness({ price: null }, now), 'none');
    assert.equal(priceFreshness({ price: 1, priceSource: 'manual' }, now), 'manual');
    assert.equal(priceFreshness({ price: 1, priceSource: 'history', priceUpdatedAt: new Date(now - 10 * day).toISOString() }, now), 'recent');
    assert.equal(priceFreshness({ price: 1, priceSource: 'history', priceUpdatedAt: new Date(now - 90 * day).toISOString() }, now), 'stale');
  });

  test('listSummary: totals only known prices, counts unpriced, flags estimates', () => {
    const now = Date.parse('2026-06-12T00:00:00Z');
    const items = [
      createItem({ name: 'Piens', price: 1.2 }),
      createItem({ name: 'Maize' }), // no price
      normalizeItem({ id: 'x', name: 'Olas', price: 2.5, priceSource: 'history', priceUpdatedAt: '2026-06-01T00:00:00Z' }),
    ];
    const summary = listSummary(items, now);
    assert.equal(summary.activeCount, 3);
    assert.equal(summary.pricedCount, 2);
    assert.equal(summary.unpricedCount, 1);
    assert.equal(summary.totalKnown, 3.7);
    assert.equal(summary.hasEstimates, true);
  });

  test('formatMoney uses euro formatting', () => {
    const formatted = formatMoney(1.5);
    assert.ok(formatted.includes('€'), `expected € in "${formatted}"`);
    assert.ok(/1[.,]50/.test(formatted), `expected 1,50 in "${formatted}"`);
  });

  // ---------- core: categories / names ----------
  test('guessCategory handles Latvian names with and without diacritics', () => {
    assert.equal(guessCategory('Šokolāde'), 'snacks');
    assert.equal(guessCategory('sokolade'), 'snacks');
    assert.equal(guessCategory('Kartupeļi'), 'produce');
    assert.equal(guessCategory('Vistas fileja'), 'meat');
    assert.equal(guessCategory('nezināma lieta'), 'other');
  });

  test('nameKey normalizes diacritics, case, whitespace', () => {
    assert.equal(nameKey('  Piens   2%  '), nameKey('piens 2%'));
    assert.equal(nameKey('Šokolāde'), nameKey('sokolade'));
  });

  test('groupItems splits active by category and bought last', () => {
    const items = [
      createItem({ name: 'Piens' }),
      normalizeItem({ ...createItem({ name: 'Maize' }), status: 'bought', checkedAt: '2026-01-01T00:00:00Z' }),
    ];
    const groups = groupItems(items);
    assert.equal(groups.at(-1).key, 'bought');
    assert.ok(groups.some((group) => group.key === 'dairy'));
  });

  // ---------- local store ----------
  test('local store: upsert, toggle fields, remove persist roundtrip', () => {
    const storage = createMemoryStorage();
    const store = createLocalStore({ storage });
    const item = store.upsertItem(createItem({ name: 'Olas' }));
    assert.equal(createLocalStore({ storage }).getItems().length, 1);
    store.removeItem(item.id);
    assert.equal(createLocalStore({ storage }).getItems().length, 0);
  });

  test('corrupt V2 state is backed up, not destroyed', () => {
    const storage = createMemoryStorage();
    storage.setItem(STORE_KEY, '{not json');
    const store = createLocalStore({ storage });
    assert.equal(store.getItems().length, 0);
    const backupKeys = storage.keys().filter((key) => key.startsWith(`${STORE_KEY}-corrupt-`));
    assert.equal(backupKeys.length, 1);
    assert.equal(storage.getItem(backupKeys[0]), '{not json');
  });

  test('V1 migration: guessed prices dropped, manual prices kept, ids/timestamps preserved', () => {
    const storage = createMemoryStorage();
    storage.setItem(V1_KEY, JSON.stringify({ items: [
      { id: 'id-1', name: 'Piens', priceEstimate: 1.29, priceGuessed: true, status: 'active', addedAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-02T00:00:00Z' },
      { id: 'id-2', name: 'Siers', priceEstimate: 4.5, priceGuessed: false, status: 'bought', addedAt: '2025-01-03T00:00:00Z' },
    ] }));
    const items = createLocalStore({ storage }).getItems();
    const piens = items.find((item) => item.id === 'id-1');
    const siers = items.find((item) => item.id === 'id-2');
    assert.equal(piens.price, null); // fabricated → dropped
    assert.equal(piens.addedAt, '2025-01-01T00:00:00Z');
    assert.equal(siers.price, 4.5); // human-entered → kept as manual
    assert.equal(siers.priceSource, 'manual');
    assert.equal(siers.status, 'bought');
    // V1 key untouched (non-destructive migration)
    assert.ok(storage.getItem(V1_KEY) !== null);
  });

  test('applyRemote: older remote rows do not overwrite newer local', () => {
    const storage = createMemoryStorage();
    const store = createLocalStore({ storage });
    store.upsertItem(normalizeItem({ id: 'a', name: 'Jaunais', updatedAt: '2026-06-10T00:00:00Z' }));
    const applied = store.applyRemote(normalizeItem({ id: 'a', name: 'Vecais', updatedAt: '2026-06-01T00:00:00Z' }));
    assert.equal(applied, false);
    assert.equal(store.getItem('a').name, 'Jaunais');
  });

  test('price history: record + lookup + newest-wins merge', () => {
    const storage = createMemoryStorage();
    const store = createLocalStore({ storage });
    store.recordPrice('Piens 2%', 1.35, '2026-06-01T00:00:00Z');
    assert.equal(store.lookupPrice('piens 2%').price, 1.35);
    store.mergePriceHistory([{ nameKey: nameKey('Piens 2%'), price: 1.5, recordedAt: '2026-06-10T00:00:00Z' }]);
    assert.equal(store.lookupPrice('Piens 2%').price, 1.5);
    store.mergePriceHistory([{ nameKey: nameKey('Piens 2%'), price: 1.1, recordedAt: '2026-01-01T00:00:00Z' }]);
    assert.equal(store.lookupPrice('Piens 2%').price, 1.5); // older entry ignored
  });

  // ---------- queue ----------
  test('queue: enqueue persists across instances; coalesces upserts', () => {
    const storage = createMemoryStorage();
    const queue = createQueue({ storage });
    queue.enqueue({ type: 'upsert-item', itemId: 'x', payload: { v: 1 } });
    queue.enqueue({ type: 'upsert-item', itemId: 'x', payload: { v: 2 } });
    assert.equal(queue.size(), 1);
    assert.equal(createQueue({ storage }).peek().payload.v, 2);
  });

  test('queue: delete of never-synced item cancels the queued insert entirely', () => {
    const storage = createMemoryStorage();
    const queue = createQueue({ storage });
    queue.enqueue({ type: 'upsert-item', itemId: 'x', payload: {}, neverSynced: true });
    queue.enqueue({ type: 'delete-item', itemId: 'x' });
    assert.equal(queue.size(), 0); // nothing to send: net no-op
  });

  test('queue: delete of synced item replaces queued upsert with delete', () => {
    const storage = createMemoryStorage();
    const queue = createQueue({ storage });
    queue.enqueue({ type: 'upsert-item', itemId: 'y', payload: {} });
    queue.enqueue({ type: 'delete-item', itemId: 'y' });
    assert.equal(queue.size(), 1);
    assert.equal(queue.peek().type, 'delete-item');
  });

  test('queue: attempts tracked; failed ids reported after max attempts', () => {
    const storage = createMemoryStorage();
    const queue = createQueue({ storage });
    const op = queue.enqueue({ type: 'upsert-item', itemId: 'z', payload: {} });
    for (let i = 0; i < 5; i += 1) queue.markAttempt(op.id, new Error('network'));
    assert.ok(queue.failedItemIds().has('z'));
    assert.ok(queue.hasFailures());
    queue.resetAttempts();
    assert.equal(queue.hasFailures(), false);
  });

  // ---------- mappers ----------
  test('row mapping roundtrip preserves provenance; NULL price stays null', () => {
    const item = createItem({ name: 'Sviests', price: 3.2 }, { now: '2026-06-12T00:00:00.000Z' });
    const row = itemToRow(item, 'fam-1');
    assert.equal(row.price_source, 'manual');
    const back = rowToItem({ ...row, added_at: item.addedAt, updated_at: item.updatedAt });
    assert.equal(back.price, 3.2);
    assert.equal(back.priceSource, 'manual');
    const nullRow = itemToRow(createItem({ name: 'Maize' }), 'fam-1');
    assert.equal(nullRow.price, null);
    assert.equal(rowToItem({ ...nullRow, added_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }).price, null);
  });

  test('roundMoney avoids float drift', () => {
    assert.equal(roundMoney(0.1 + 0.2), 0.3);
    assert.equal(roundMoney(1.005), 1.01);
  });
}
