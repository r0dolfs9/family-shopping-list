// queue.js — persistent outbox of operations that must reach Supabase.
// Local store is updated first (instant UI); ops flush in order when online.

export const QUEUE_KEY = 'tally-v2-queue';
export const MAX_AUTO_ATTEMPTS = 5;

export function createQueue({ storage = globalThis.localStorage } = {}) {
  let ops = read(storage);
  const listeners = new Set();

  function persist() {
    try {
      storage.setItem(QUEUE_KEY, JSON.stringify(ops));
    } catch (error) {
      console.error('queue write failed', error);
    }
    for (const listener of listeners) listener();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    // op: { type: 'upsert-item' | 'delete-item' | 'record-price', itemId?, payload }
    enqueue(op) {
      const entry = {
        id: `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        attempts: 0,
        lastError: null,
        ...op,
      };
      // Coalesce: a newer upsert of the same item replaces an older queued upsert;
      // a delete removes queued upserts for that item.
      if (entry.type === 'upsert-item' && entry.itemId) {
        ops = ops.filter((existing) => !(existing.type === 'upsert-item' && existing.itemId === entry.itemId));
      }
      if (entry.type === 'delete-item' && entry.itemId) {
        const hadInsertOnly = ops.some((existing) => existing.type === 'upsert-item' && existing.itemId === entry.itemId && existing.neverSynced);
        ops = ops.filter((existing) => existing.itemId !== entry.itemId);
        if (hadInsertOnly) {
          // Item never reached the server — nothing to delete remotely.
          persist();
          return entry;
        }
      }
      ops = [...ops, entry];
      persist();
      return entry;
    },

    peek() {
      return ops[0] ?? null;
    },
    all() {
      return [...ops];
    },
    size() {
      return ops.length;
    },
    pendingItemIds() {
      return new Set(ops.filter((op) => op.itemId).map((op) => op.itemId));
    },
    failedItemIds() {
      return new Set(ops.filter((op) => op.itemId && op.attempts >= MAX_AUTO_ATTEMPTS).map((op) => op.itemId));
    },
    hasFailures() {
      return ops.some((op) => op.attempts >= MAX_AUTO_ATTEMPTS);
    },

    markAttempt(id, error) {
      ops = ops.map((op) => (op.id === id ? { ...op, attempts: op.attempts + 1, lastError: String(error?.message ?? error ?? '') } : op));
      persist();
    },
    resetAttempts() {
      ops = ops.map((op) => ({ ...op, attempts: 0 }));
      persist();
    },
    remove(id) {
      ops = ops.filter((op) => op.id !== id);
      persist();
    },
  };
}

function read(storage) {
  try {
    const raw = storage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
