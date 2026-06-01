import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createItem,
  estimatePrice,
  formatMoney,
  guessCategory,
  groupItems,
  listSummary,
  normalizeItem,
} from '../src/core.js';

test('guessCategory maps Latvian grocery names to stable category keys', () => {
  assert.equal(guessCategory('piens 2%'), 'dairy');
  assert.equal(guessCategory('banani'), 'fruit');
  assert.equal(guessCategory('vista fileja'), 'meat');
  assert.equal(guessCategory('tualetes papirs'), 'household');
  assert.equal(guessCategory('nezinama lieta'), 'other');
});

test('createItem trims fields and fills derived values', () => {
  const item = createItem(
    { name: '  piens  ', qty: ' 2 ', note: '  vakaram ' },
    { memberId: 'm1', now: '2026-06-01T12:00:00.000Z', id: 'item-1' },
  );

  assert.equal(item.id, 'item-1');
  assert.equal(item.name, 'piens');
  assert.equal(item.qty, '2');
  assert.equal(item.note, 'vakaram');
  assert.equal(item.category, 'dairy');
  assert.equal(item.status, 'active');
  assert.equal(item.addedBy, 'm1');
  assert.equal(item.priceGuessed, true);
  assert.equal(item.priceEstimate, estimatePrice('piens'));
});

test('normalizeItem preserves explicit price and selected category', () => {
  const item = normalizeItem({
    id: 'x',
    name: 'Maize',
    category: 'bakery',
    priceEstimate: '1.29',
    status: 'bought',
  });

  assert.equal(item.priceEstimate, 1.29);
  assert.equal(item.priceGuessed, false);
  assert.equal(item.category, 'bakery');
  assert.equal(item.status, 'bought');
});

test('groupItems separates active categories from bought basket', () => {
  const groups = groupItems([
    normalizeItem({ id: '1', name: 'piens' }),
    normalizeItem({ id: '2', name: 'banani' }),
    normalizeItem({ id: '3', name: 'maize', status: 'bought' }),
  ]);

  assert.deepEqual(groups.map((group) => group.key), ['fruit', 'dairy', 'bought']);
  assert.equal(groups.find((group) => group.key === 'bought').items[0].name, 'maize');
});

test('listSummary counts only active items and formats estimated total', () => {
  const summary = listSummary([
    normalizeItem({ id: '1', name: 'piens', priceEstimate: 1.2 }),
    normalizeItem({ id: '2', name: 'banani', priceEstimate: 2.4 }),
    normalizeItem({ id: '3', name: 'maize', priceEstimate: 1.0, status: 'bought' }),
  ]);

  assert.equal(summary.activeCount, 2);
  assert.equal(summary.totalEstimate, 3.6);
  assert.equal(formatMoney(summary.totalEstimate), '3.60 €');
});
