// local-store.js — single source of truth for the UI.
// Persists to localStorage, migrates V1 data, never destroys data on corruption.

import { normalizeItem, nameKey, toPriceNumber } from './core.js';

export const STORE_KEY = 'tally-v2-state';
export const V1_KEY = 'tally-family-shopping-list';

export function createLocalStore({ storage = globalThis.localStorage } = {}) {
  let state = readState(storage);
  const listeners = new Set();

  function persist() {
    try {
      storage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('localStorage write failed', error);
    }
    notify();
  }

  function notify() {
    for (const listener of listeners) listener();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getItems() {
      return state.items.map(normalizeItem);
    },
    getItem(id) {
      const item = state.items.find((candidate) => candidate.id === id);
      return item ? normalizeItem(item) : null;
    },

    upsertItem(item) {
      const normalized = normalizeItem(item);
      const index = state.items.findIndex((candidate) => candidate.id === normalized.id);
      const items = [...state.items];
      if (index === -1) items.unshift(normalized);
      else items[index] = normalized;
      state = { ...state, items };
      persist();
      return normalized;
    },

    // Last-write-wins: only apply a remote row if it is not older than what we have.
    applyRemote(item) {
      const normalized = normalizeItem(item);
      const existing = state.items.find((candidate) => candidate.id === normalized.id);
      if (existing && String(existing.updatedAt) > String(normalized.updatedAt)) return false;
      this.upsertItem(normalized);
      return true;
    },

    removeItem(id) {
      const before = state.items.length;
      state = { ...state, items: state.items.filter((item) => item.id !== id) };
      if (state.items.length !== before) persist();
    },

    replaceAll(items) {
      state = { ...state, items: items.map(normalizeItem) };
      persist();
    },

    // ---- Family price history (name -> last known price) ----
    recordPrice(name, price, now = new Date().toISOString()) {
      const key = nameKey(name);
      const value = toPriceNumber(price);
      if (!key || value == null) return;
      state = { ...state, priceHistory: { ...state.priceHistory, [key]: { price: value, recordedAt: now } } };
      persist();
    },
    lookupPrice(name) {
      const entry = state.priceHistory[nameKey(name)];
      return entry ? { price: entry.price, recordedAt: entry.recordedAt } : null;
    },
    mergePriceHistory(entries) {
      // entries: [{ nameKey, price, recordedAt }] — keep newest per key.
      const merged = { ...state.priceHistory };
      for (const entry of entries) {
        const current = merged[entry.nameKey];
        if (!current || String(entry.recordedAt) > String(current.recordedAt)) {
          merged[entry.nameKey] = { price: toPriceNumber(entry.price), recordedAt: entry.recordedAt };
        }
      }
      state = { ...state, priceHistory: merged };
      persist();
    },
    getPriceHistory() {
      return { ...state.priceHistory };
    },

    // ---- Migration info ----
    getMeta() {
      return { ...state.meta };
    },
    setMeta(patch) {
      state = { ...state, meta: { ...state.meta, ...patch } };
      persist();
    },
  };
}

function readState(storage) {
  const empty = { items: [], priceHistory: {}, meta: {} };

  // 1. Try V2 state.
  const rawV2 = safeGet(storage, STORE_KEY);
  if (rawV2 !== null) {
    try {
      const parsed = JSON.parse(rawV2);
      return {
        items: Array.isArray(parsed.items) ? parsed.items.map(normalizeItem) : [],
        priceHistory: parsed.priceHistory && typeof parsed.priceHistory === 'object' ? parsed.priceHistory : {},
        meta: parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {},
      };
    } catch {
      // Never delete: keep the corrupt blob under a backup key for recovery.
      backupCorrupt(storage, STORE_KEY, rawV2);
    }
  }

  // 2. Migrate V1 data if present (non-destructive: V1 key is left in place).
  const rawV1 = safeGet(storage, V1_KEY);
  if (rawV1 !== null) {
    try {
      const parsed = JSON.parse(rawV1);
      const items = Array.isArray(parsed.items) ? parsed.items.map(migrateV1Item) : [];
      return { ...empty, items, meta: { migratedFromV1: new Date().toISOString() } };
    } catch {
      backupCorrupt(storage, V1_KEY, rawV1);
    }
  }

  return empty;
}

// V1 had invented prices: priceGuessed=true means the number was fabricated → drop it.
// priceGuessed=false means a human typed it → keep as manual.
export function migrateV1Item(v1) {
  const manual = v1.priceGuessed === false && v1.priceEstimate != null && Number(v1.priceEstimate) > 0;
  return normalizeItem({
    id: v1.id,
    name: v1.name,
    qty: v1.qty,
    note: v1.note,
    category: v1.category,
    status: v1.status,
    price: manual ? Number(v1.priceEstimate) : null,
    priceSource: manual ? 'manual' : null,
    priceUpdatedAt: manual ? (v1.updatedAt ?? v1.addedAt) : null,
    addedBy: typeof v1.addedBy === 'string' && v1.addedBy.length > 8 ? v1.addedBy : null,
    addedAt: v1.addedAt,
    checkedBy: v1.checkedBy,
    checkedAt: v1.checkedAt,
    updatedAt: v1.updatedAt,
  });
}

function backupCorrupt(storage, key, raw) {
  try {
    storage.setItem(`${key}-corrupt-${Date.now()}`, raw);
    storage.removeItem(key);
  } catch {
    /* quota — leave as is */
  }
}

function safeGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}
