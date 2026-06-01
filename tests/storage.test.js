import test from 'node:test';
import assert from 'node:assert/strict';

import { createMemoryStorage } from './helpers/memory-storage.js';
import { createLocalStore } from '../src/local-store.js';

test('local store starts from seeded defaults when storage is empty', () => {
  const storage = createMemoryStorage();
  const store = createLocalStore({ storage, key: 'list', seedItems: [{ id: '1', name: 'piens' }] });

  assert.equal(store.getItems().length, 1);
  assert.equal(store.getItems()[0].category, 'dairy');
});

test('local store persists add, update, toggle, and delete operations', () => {
  const storage = createMemoryStorage();
  const store = createLocalStore({ storage, key: 'list', seedItems: [] });

  const created = store.addItem({ name: 'banani', qty: '1 kg' }, { memberId: 'm1', id: 'a' });
  assert.equal(created.category, 'fruit');
  assert.equal(JSON.parse(storage.getItem('list')).items.length, 1);

  store.updateItem('a', { name: 'banani bio', priceEstimate: 2.5 });
  assert.equal(store.getItems()[0].priceEstimate, 2.5);
  assert.equal(store.getItems()[0].priceGuessed, false);

  store.toggleItem('a', { memberId: 'm2', now: '2026-06-01T12:10:00.000Z' });
  assert.equal(store.getItems()[0].status, 'bought');
  assert.equal(store.getItems()[0].checkedBy, 'm2');

  store.deleteItem('a');
  assert.equal(store.getItems().length, 0);
});

test('local store notifies subscribers after mutations', () => {
  const storage = createMemoryStorage();
  const store = createLocalStore({ storage, key: 'list', seedItems: [] });
  let calls = 0;

  const unsubscribe = store.subscribe(() => {
    calls += 1;
  });

  store.addItem({ name: 'kafija' }, { id: 'coffee' });
  unsubscribe();
  store.addItem({ name: 'cukurs' }, { id: 'sugar' });

  assert.equal(calls, 1);
});
