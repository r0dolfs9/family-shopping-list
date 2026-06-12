// remote.js — Supabase connection: anonymous auth, family membership, realtime.
// Identity model: each device signs in anonymously once (session persists).
// The device then creates a family or joins one with an invite code via
// SECURITY DEFINER RPCs. RLS keys everything to auth.uid() → members → family.

import { rowToItem, itemToRow, rowToPriceEntry } from './supabase-mappers.js';

const SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';

export function createRemote({ url, anonKey }) {
  let supabase = null;
  let session = null;
  let member = null; // { id, family_id, display_name, color, initials, role }
  let family = null; // { id, name, invite_code }
  let channel = null;
  let channelState = 'closed'; // 'joined' | 'errored' | 'closed'
  const events = new Set(); // listener({ type, ... })

  function emit(event) {
    for (const listener of events) listener(event);
  }

  return {
    on(listener) {
      events.add(listener);
      return () => events.delete(listener);
    },
    getMember: () => member,
    getFamily: () => family,
    isReady: () => Boolean(supabase && session && member),
    channelState: () => channelState,

    // ---- Connection / identity ----
    async connect() {
      if (!supabase) {
        const { createClient } = await import(SUPABASE_ESM);
        supabase = createClient(url, anonKey, { auth: { persistSession: true } });
      }
      const { data: existing } = await supabase.auth.getSession();
      session = existing?.session ?? null;
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw new Error(`Pieteikšanās neizdevās: ${error.message}`);
        session = data.session;
      }
      await this.loadMembership();
      return { session, member, family };
    },

    async loadMembership() {
      const { data: members, error } = await supabase
        .from('members')
        .select('id, family_id, display_name, color, initials, role')
        .eq('user_id', session.user.id)
        .limit(1);
      if (error) throw error;
      member = members?.[0] ?? null;
      if (member) {
        const { data: families, error: famError } = await supabase
          .from('families')
          .select('id, name, invite_code')
          .eq('id', member.family_id)
          .limit(1);
        if (famError) throw famError;
        family = families?.[0] ?? null;
      }
      return member;
    },

    async createFamily({ familyName, displayName, color, initials }) {
      const { data, error } = await supabase.rpc('create_family', {
        p_family_name: familyName,
        p_display_name: displayName,
        p_color: color,
        p_initials: initials,
      });
      if (error) throw new Error(rpcMessage(error));
      await this.loadMembership();
      return data;
    },

    async joinFamily({ inviteCode, displayName, color, initials }) {
      const { data, error } = await supabase.rpc('join_family', {
        p_invite_code: inviteCode.trim().toUpperCase(),
        p_display_name: displayName,
        p_color: color,
        p_initials: initials,
      });
      if (error) throw new Error(rpcMessage(error));
      await this.loadMembership();
      return data;
    },

    async listMembers() {
      const { data, error } = await supabase
        .from('members')
        .select('id, display_name, color, initials, role')
        .eq('family_id', member.family_id)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },

    // ---- Data ----
    async fetchItems() {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('family_id', member.family_id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToItem);
    },

    async upsertItem(item) {
      const { error } = await supabase.from('items').upsert(itemToRow(item, member.family_id));
      if (error) throw error;
    },

    async deleteItem(id) {
      const { error } = await supabase.from('items').delete().eq('id', id).eq('family_id', member.family_id);
      if (error) throw error;
    },

    async fetchPriceHistory() {
      const { data, error } = await supabase
        .from('price_history')
        .select('name_key, price, recorded_at')
        .eq('family_id', member.family_id);
      if (error) throw error;
      return (data ?? []).map(rowToPriceEntry);
    },

    async recordPrice({ nameKey, price, recordedAt }) {
      const { error } = await supabase.from('price_history').upsert(
        { family_id: member.family_id, name_key: nameKey, price, recorded_at: recordedAt, recorded_by: member.id },
        { onConflict: 'family_id,name_key' },
      );
      if (error) throw error;
    },

    // ---- Realtime ----
    subscribeRealtime(onItemChange) {
      if (channel) supabase.removeChannel(channel);
      channel = supabase
        .channel(`items-${member.family_id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'items', filter: `family_id=eq.${member.family_id}` },
          (payload) => {
            if (payload.eventType === 'DELETE') onItemChange({ type: 'delete', id: payload.old.id });
            else onItemChange({ type: 'upsert', item: rowToItem(payload.new) });
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            const wasDown = channelState !== 'joined';
            channelState = 'joined';
            // After (re)subscribe, events may have been missed → ask for a refetch.
            emit({ type: 'realtime-up', refetch: wasDown });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            channelState = 'errored';
            emit({ type: 'realtime-down' });
          }
        });
    },

    async dispose() {
      if (channel && supabase) await supabase.removeChannel(channel);
      channel = null;
      channelState = 'closed';
    },
  };
}

function rpcMessage(error) {
  if (/invite/i.test(error.message)) return 'Šāds ielūguma kods nav atrasts.';
  if (/already/i.test(error.message)) return 'Šī ierīce jau ir pievienota ģimenei.';
  return error.message;
}
