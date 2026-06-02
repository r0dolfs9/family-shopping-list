import test from 'node:test';
import assert from 'node:assert/strict';

import { itemToRow, rowToItem } from '../src/supabase-mappers.js';

test('rowToItem converts Supabase snake_case rows to app items', () => {
  const item = rowToItem({
    id: 'item-1',
    family_id: 'family-1',
    name: 'Piens',
    qty: '2',
    price_estimate: '1.25',
    price_guessed: false,
    note: 'vakaram',
    category: 'dairy',
    status: 'bought',
    added_by: 'member-1',
    added_at: '2026-06-02T10:00:00.000Z',
    checked_by: 'member-2',
    checked_at: '2026-06-02T10:10:00.000Z',
    updated_at: '2026-06-02T10:11:00.000Z',
  });

  assert.deepEqual(item, {
    id: 'item-1',
    name: 'Piens',
    qty: '2',
    priceEstimate: 1.25,
    priceGuessed: false,
    note: 'vakaram',
    category: 'dairy',
    status: 'bought',
    addedBy: 'member-1',
    addedAt: '2026-06-02T10:00:00.000Z',
    checkedBy: 'member-2',
    checkedAt: '2026-06-02T10:10:00.000Z',
    updatedAt: '2026-06-02T10:11:00.000Z',
  });
});

test('itemToRow converts app item updates to Supabase insert/update rows', () => {
  const row = itemToRow(
    {
      id: 'item-1',
      name: 'Banani',
      qty: '1 kg',
      priceEstimate: 1.6,
      priceGuessed: true,
      note: '',
      category: 'fruit',
      status: 'active',
      addedBy: 'member-1',
      addedAt: '2026-06-02T10:00:00.000Z',
      checkedBy: null,
      checkedAt: null,
      updatedAt: '2026-06-02T10:11:00.000Z',
    },
    'family-1',
  );

  assert.deepEqual(row, {
    id: 'item-1',
    family_id: 'family-1',
    name: 'Banani',
    qty: '1 kg',
    price_estimate: 1.6,
    price_guessed: true,
    note: '',
    category: 'fruit',
    status: 'active',
    added_by: 'member-1',
    added_at: '2026-06-02T10:00:00.000Z',
    checked_by: null,
    checked_at: null,
    updated_at: '2026-06-02T10:11:00.000Z',
  });
});
