import { createItem, normalizeItem } from './core.js';

export function createLocalStore({ storage = globalThis.localStorage, key = 'tally-family-shopping-list', seedItems = [] } = {}) {
  let state = readState(storage, key, seedItems);
  const listeners = new Set();

  function persist() {
    storage.setItem(key, JSON.stringify(state));
    for (const listener of listeners) listener(getItems());
  }

  function getItems() {
    return state.items.map(normalizeItem);
  }

  return {
    mode: 'local',
    getItems,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    addItem(input, options = {}) {
      const item = createItem(input, options);
      state = { ...state, items: [item, ...getItems()] };
      persist();
      return item;
    },
    updateItem(id, updates) {
      state = {
        ...state,
        items: getItems().map((item) => {
          if (item.id !== id) return item;
          return normalizeItem({
            ...item,
            ...updates,
            priceGuessed: updates.priceEstimate === undefined ? item.priceGuessed : false,
            updatedAt: new Date().toISOString(),
          });
        }),
      };
      persist();
    },
    toggleItem(id, options = {}) {
      const now = options.now ?? new Date().toISOString();
      state = {
        ...state,
        items: getItems().map((item) => {
          if (item.id !== id) return item;
          const bought = item.status !== 'bought';
          return normalizeItem({
            ...item,
            status: bought ? 'bought' : 'active',
            checkedBy: bought ? options.memberId ?? 'me' : null,
            checkedAt: bought ? now : null,
            updatedAt: now,
          });
        }),
      };
      persist();
    },
    deleteItem(id) {
      state = { ...state, items: getItems().filter((item) => item.id !== id) };
      persist();
    },
    replaceItems(items) {
      state = { ...state, items: items.map(normalizeItem) };
      persist();
    },
  };
}

function readState(storage, key, seedItems) {
  try {
    const stored = storage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { items: Array.isArray(parsed.items) ? parsed.items.map(normalizeItem) : [] };
    }
  } catch {
    storage.removeItem(key);
  }

  return { items: seedItems.map(normalizeItem) };
}
