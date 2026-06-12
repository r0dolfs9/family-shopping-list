// supabase-mappers.js — item <-> DB row mapping (V2 schema).

import { normalizeItem } from './core.js';

export function rowToItem(row) {
  return normalizeItem({
    id: row.id,
    name: row.name,
    qty: row.qty ?? '',
    note: row.note ?? '',
    category: row.category ?? undefined,
    status: row.status,
    price: row.price ?? null,
    priceSource: row.price_source ?? null,
    priceUpdatedAt: row.price_updated_at ?? null,
    addedBy: row.added_by ?? null,
    addedAt: row.added_at,
    checkedBy: row.checked_by ?? null,
    checkedAt: row.checked_at ?? null,
    updatedAt: row.updated_at,
  });
}

export function itemToRow(item, familyId) {
  return {
    id: item.id,
    family_id: familyId,
    name: item.name,
    qty: item.qty || null,
    note: item.note || null,
    category: item.category,
    status: item.status,
    price: item.price,
    price_source: item.price == null ? null : item.priceSource,
    price_updated_at: item.price == null ? null : item.priceUpdatedAt,
    added_by: item.addedBy,
    added_at: item.addedAt,
    checked_by: item.checkedBy,
    checked_at: item.checkedAt,
    updated_at: item.updatedAt,
  };
}

export function rowToPriceEntry(row) {
  return { nameKey: row.name_key, price: Number(row.price), recordedAt: row.recorded_at };
}
