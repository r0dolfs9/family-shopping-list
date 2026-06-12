// sync.js — orchestrates local store (source of truth for UI), the persistent
// op queue, and the optional Supabase remote. The UI talks only to this module.
//
// Status values: 'local' | 'connecting' | 'setup' | 'synced' | 'syncing' | 'offline' | 'error'
// 'synced' is only claimed when the queue is empty AND realtime is joined.

import { createItem, normalizeItem, nameKey } from './core.js';
import { createLocalStore } from './local-store.js';
import { createQueue, MAX_AUTO_ATTEMPTS } from './queue.js';
import { createRemote } from './remote.js';
import { appConfig, isSupabaseConfigured } from './app-config.js';

export function createSync() {
  const local = createLocalStore();
  const queue = createQueue();
  const remote = isSupabaseConfigured() ? createRemote(appConfig.supabase) : null;

  let status = remote ? 'connecting' : 'local';
  let statusDetail = '';
  let flushing = false;
  let flushTimer = null;
  const listeners = new Set();

  function notify() {
    for (const listener of listeners) listener();
  }
  function setStatus(next, detail = '') {
    if (status === next && statusDetail === detail) return;
    status = next;
    statusDetail = detail;
    notify();
  }
  function recomputeStatus() {
    if (!remote) return setStatus('local');
    if (!navigator.onLine) return setStatus('offline');
    if (!remote.isReady()) return; // connecting/setup managed by connect()
    if (queue.hasFailures()) return setStatus('error', 'Dažas izmaiņas neizdevās nosūtīt.');
    if (queue.size() > 0 || flushing) return setStatus('syncing');
    if (remote.channelState() !== 'joined') return setStatus('syncing');
    setStatus('synced');
  }

  local.subscribe(notify);
  queue.subscribe(() => {
    recomputeStatus();
    notify();
  });

  // ---- Mutations (local-first, then queue) ----
  function applyAndQueue(item, { neverSynced = false } = {}) {
    local.upsertItem(item);
    if (remote) {
      queue.enqueue({ type: 'upsert-item', itemId: item.id, payload: item, neverSynced });
      scheduleFlush();
    }
  }

  const api = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getItems: () => local.getItems(),
    getItem: (id) => local.getItem(id),
    getStatus: () => ({ status, detail: statusDetail, pending: queue.pendingItemIds(), failed: queue.failedItemIds(), queueSize: queue.size() }),
    getMember: () => remote?.getMember() ?? null,
    getFamily: () => remote?.getFamily() ?? null,
    isRemote: () => Boolean(remote),
    remote,

    lookupPrice: (name) => local.lookupPrice(name),

    addItem(input) {
      const memberId = remote?.getMember()?.id ?? null;
      // If no manual price, try family price history.
      let price = input.price ?? null;
      let priceSource = price != null ? 'manual' : null;
      let priceUpdatedAt = null;
      if (price == null) {
        const known = local.lookupPrice(input.name);
        if (known) {
          price = known.price;
          priceSource = 'history';
          priceUpdatedAt = known.recordedAt;
        }
      }
      const item = createItem({ ...input, price, priceSource, priceUpdatedAt }, { memberId });
      if (input.price != null) api.recordPrice(item.name, input.price);
      applyAndQueue(item, { neverSynced: true });
      return item;
    },

    updateItem(id, updates) {
      const current = local.getItem(id);
      if (!current) return null;
      const next = normalizeItem({
        ...current,
        ...updates,
        priceSource: updates.price !== undefined ? (updates.price == null ? null : 'manual') : current.priceSource,
        priceUpdatedAt: updates.price !== undefined ? (updates.price == null ? null : new Date().toISOString()) : current.priceUpdatedAt,
        updatedAt: new Date().toISOString(),
      });
      if (updates.price != null) api.recordPrice(next.name, updates.price);
      applyAndQueue(next);
      return next;
    },

    toggleItem(id) {
      const current = local.getItem(id);
      if (!current) return null;
      const bought = current.status !== 'bought';
      const now = new Date().toISOString();
      const next = normalizeItem({
        ...current,
        status: bought ? 'bought' : 'active',
        checkedBy: bought ? remote?.getMember()?.id ?? null : null,
        checkedAt: bought ? now : null,
        updatedAt: now,
      });
      applyAndQueue(next);
      return next;
    },

    deleteItem(id) {
      const snapshot = local.getItem(id);
      if (!snapshot) return null;
      local.removeItem(id);
      if (remote) {
        queue.enqueue({ type: 'delete-item', itemId: id });
        scheduleFlush();
      }
      return snapshot;
    },

    restoreItem(snapshot) {
      const next = normalizeItem({ ...snapshot, updatedAt: new Date().toISOString() });
      applyAndQueue(next, { neverSynced: true });
      return next;
    },

    recordPrice(name, price) {
      const recordedAt = new Date().toISOString();
      local.recordPrice(name, price, recordedAt);
      if (remote) {
        queue.enqueue({ type: 'record-price', payload: { nameKey: nameKey(name), price, recordedAt } });
        scheduleFlush();
      }
    },

    retryFailed() {
      queue.resetAttempts();
      scheduleFlush(0);
    },

    // ---- Connection ----
    async connect() {
      if (!remote) return;
      setStatus('connecting');
      try {
        await remote.connect();
        if (!remote.getMember()) {
          setStatus('setup');
          return;
        }
        await afterMembership();
      } catch (error) {
        console.error(error);
        setStatus(navigator.onLine ? 'error' : 'offline', error?.message ?? '');
      }
    },

    async completeSetup(action, fields) {
      // action: 'create' | 'join'
      if (action === 'create') await remote.createFamily(fields);
      else await remote.joinFamily(fields);
      await afterMembership();
    },
  };

  async function afterMembership() {
    // 1. Reconcile: pull remote, merge by last-write-wins.
    const remoteItems = await remote.fetchItems();
    const remoteIds = new Set(remoteItems.map((item) => item.id));
    for (const item of remoteItems) local.applyRemote(item);

    // 2. One-time push of pre-existing local items (local → family migration).
    if (!local.getMeta().pushedLocalToFamily) {
      for (const item of local.getItems()) {
        if (!remoteIds.has(item.id)) queue.enqueue({ type: 'upsert-item', itemId: item.id, payload: item, neverSynced: true });
      }
      local.setMeta({ pushedLocalToFamily: new Date().toISOString() });
    }

    // 3. Price history both ways.
    try {
      local.mergePriceHistory(await remote.fetchPriceHistory());
    } catch (error) {
      console.warn('price history fetch failed', error);
    }

    // 4. Realtime.
    remote.on(async (event) => {
      if (event.type === 'realtime-up' && event.refetch) {
        try {
          const fresh = await remote.fetchItems();
          for (const item of fresh) maybeApplyRemote(item);
        } catch { /* will retry on next reconnect */ }
      }
      recomputeStatus();
    });
    remote.subscribeRealtime((change) => {
      if (change.type === 'delete') {
        if (!queue.pendingItemIds().has(change.id)) local.removeItem(change.id);
      } else {
        maybeApplyRemote(change.item);
      }
    });

    recomputeStatus();
    scheduleFlush(0);
  }

  function maybeApplyRemote(item) {
    // Never overwrite an item that still has queued local ops — ours is newer
    // (or will be pushed and win by updated_at on other clients).
    if (queue.pendingItemIds().has(item.id)) return;
    local.applyRemote(item);
  }

  // ---- Flush loop ----
  function scheduleFlush(delay = 250) {
    if (!remote) return;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, delay);
  }

  async function flush() {
    if (!remote || flushing || !remote.isReady() || !navigator.onLine) {
      recomputeStatus();
      return;
    }
    flushing = true;
    recomputeStatus();
    try {
      let op = queue.peek();
      while (op) {
        if (op.attempts >= MAX_AUTO_ATTEMPTS) break; // wait for manual retry / reconnect
        try {
          if (op.type === 'upsert-item') await remote.upsertItem(normalizeItem(op.payload));
          else if (op.type === 'delete-item') await remote.deleteItem(op.itemId);
          else if (op.type === 'record-price') await remote.recordPrice(op.payload);
          queue.remove(op.id);
        } catch (error) {
          console.error('flush op failed', op.type, error);
          queue.markAttempt(op.id, error);
          const backoff = Math.min(30000, 1000 * 2 ** (op.attempts + 1));
          scheduleFlush(backoff);
          break;
        }
        op = queue.peek();
      }
    } finally {
      flushing = false;
      recomputeStatus();
    }
  }

  // ---- Connectivity ----
  window.addEventListener('online', () => {
    queue.resetAttempts();
    recomputeStatus();
    scheduleFlush(0);
  });
  window.addEventListener('offline', recomputeStatus);

  return api;
}
