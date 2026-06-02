import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { createItem, normalizeItem } from './core.js';
import { itemToRow, rowToItem } from './supabase-mappers.js';

export function createSupabaseStore({ url, anonKey, familyId, memberId = 'me' }) {
  const supabase = createClient(url, anonKey);
  let items = [];
  const listeners = new Set();
  let channel = null;

  function notify() {
    for (const listener of listeners) listener(getItems());
  }

  function getItems() {
    return items.map(normalizeItem);
  }

  async function load() {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('family_id', familyId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    items = (data ?? []).map(rowToItem);
    notify();
    return getItems();
  }

  function applyRealtime(payload) {
    if (payload.eventType === 'DELETE') {
      items = items.filter((item) => item.id !== payload.old.id);
    } else {
      const next = rowToItem(payload.new);
      const existing = items.some((item) => item.id === next.id);
      items = existing ? items.map((item) => (item.id === next.id ? next : item)) : [next, ...items];
    }
    notify();
  }

  function subscribeRealtime() {
    channel = supabase
      .channel(`items:${familyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `family_id=eq.${familyId}` },
        applyRealtime,
      )
      .subscribe();
  }

  async function upsertItem(item) {
    const { error } = await supabase.from('items').upsert(itemToRow(item, familyId));
    if (error) throw error;
  }

  return {
    mode: 'supabase',
    getItems,
    async ready() {
      await load();
      subscribeRealtime();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async addItem(input, options = {}) {
      const item = createItem(input, { memberId, ...options });
      items = [item, ...getItems()];
      notify();
      await upsertItem(item);
      return item;
    },
    async updateItem(id, updates) {
      const now = new Date().toISOString();
      const current = getItems().find((item) => item.id === id);
      if (!current) return;
      const item = normalizeItem({
        ...current,
        ...updates,
        priceGuessed: updates.priceEstimate === undefined ? current.priceGuessed : false,
        updatedAt: now,
      });
      items = getItems().map((candidate) => (candidate.id === id ? item : candidate));
      notify();
      await upsertItem(item);
    },
    async toggleItem(id, options = {}) {
      const now = options.now ?? new Date().toISOString();
      const current = getItems().find((item) => item.id === id);
      if (!current) return;
      const bought = current.status !== 'bought';
      const item = normalizeItem({
        ...current,
        status: bought ? 'bought' : 'active',
        checkedBy: bought ? options.memberId ?? memberId : null,
        checkedAt: bought ? now : null,
        updatedAt: now,
      });
      items = getItems().map((candidate) => (candidate.id === id ? item : candidate));
      notify();
      await upsertItem(item);
    },
    async deleteItem(id) {
      const previous = getItems();
      items = previous.filter((item) => item.id !== id);
      notify();
      const { error } = await supabase.from('items').delete().eq('id', id).eq('family_id', familyId);
      if (error) {
        items = previous;
        notify();
        throw error;
      }
    },
    async dispose() {
      if (channel) await supabase.removeChannel(channel);
    },
  };
}
