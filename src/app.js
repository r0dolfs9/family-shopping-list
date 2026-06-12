// app.js — view layer. Renders from sync state; targeted updates, no full-page
// innerHTML rebuilds. Sheets/screens are independent overlays that survive renders.

import { categoryByKey, groupItems, listSummary, formatMoney, nameKey } from './core.js';
import { createSync } from './sync.js';
import { el, icons, priceLabel, STATUS_LABELS } from './ui-helpers.js';
import { openSheet } from './sheet.js';
import { openSettings, openSetup, getTheme, setTheme } from './settings.js';

const sync = createSync();
const app = document.getElementById('app');

setTheme(getTheme());

// ---------- Static frame (built once) ----------
const syncPill = el('button', { class: 'sync-pill', type: 'button', 'aria-live': 'polite', onclick: onSyncPillTap },
  el('span', { class: 'dot', 'aria-hidden': 'true' }), el('span', { class: 'sync-text' }, '…'));
const familyNameEl = el('p', { class: 'family-name' }, '\u00a0');
const summaryEl = el('div', { class: 'summary' });
const listEl = el('main', { class: 'list', 'aria-label': 'Iepirkumu saraksts' });
const errorBanner = el('div', { class: 'banner', hidden: true, role: 'alert' });

const quickInput = el('input', { type: 'text', placeholder: 'Pievienot produktu…', maxlength: '80', autocomplete: 'off', 'aria-label': 'Produkta nosaukums' });
const quickForm = el('form', { onsubmit: (event) => {
  event.preventDefault();
  const name = quickInput.value.trim();
  if (!name) return; // empty / already-submitted (input clears synchronously → double-tap is a no-op)
  quickInput.value = '';
  handleDuplicateAwareAdd(name);
} },
  quickInput,
  el('button', { class: 'detail-btn', type: 'button', 'aria-label': 'Pievienot ar detaļām', html: icons.sliders, onclick: () => {
    openSheet({ mode: 'add', prefillName: quickInput.value.trim(), sync, onSubmit: (fields) => { sync.addItem(fields); quickInput.value = ''; } });
  } }),
  el('button', { class: 'submit-btn', type: 'submit', 'aria-label': 'Pievienot', html: icons.plus }),
);

app.append(
  el('div', { class: 'topbar' },
    el('span', { class: 'brand' }, 'Tally'),
    el('div', { class: 'top-actions' },
      syncPill,
      el('button', { class: 'icon-btn', 'aria-label': 'Iestatījumi', html: icons.gear, onclick: () => openSettings({ sync }) }),
    ),
  ),
  el('div', { class: 'hero' },
    familyNameEl,
    el('h1', {}, 'Iepirkumu saraksts'),
    summaryEl,
  ),
  errorBanner,
  listEl,
  el('div', { class: 'addbar' }, quickForm),
);

// ---------- Duplicate-aware add ----------
function handleDuplicateAwareAdd(name) {
  const key = nameKey(name);
  const existing = sync.getItems().find((item) => item.status === 'active' && nameKey(item.name) === key);
  if (existing) {
    showSnackbar(`“${existing.name}” jau ir sarakstā.`, 'Pievienot vēlreiz', () => sync.addItem({ name }));
    return;
  }
  sync.addItem({ name });
}

// ---------- Snackbar (undo etc.) ----------
let snackbar = null;
let snackbarTimer = null;
function showSnackbar(message, actionLabel, onAction) {
  snackbar?.remove();
  clearTimeout(snackbarTimer);
  const node = el('div', { class: 'snackbar', role: 'status' },
    el('span', {}, message),
    actionLabel && el('button', { type: 'button', onclick: () => { node.remove(); clearTimeout(snackbarTimer); onAction?.(); } }, actionLabel),
  );
  snackbar = node;
  document.body.append(node);
  snackbarTimer = setTimeout(() => node.remove(), 6000);
}

function onSyncPillTap() {
  const { status, detail } = sync.getStatus();
  if (status === 'error') sync.retryFailed();
  else if (detail) showSnackbar(detail, null, null);
}

// ---------- Rendering ----------
function render() {
  const items = sync.getItems();
  const { status, detail, pending, failed } = sync.getStatus();

  // Sync pill
  syncPill.dataset.status = status;
  syncPill.querySelector('.sync-text').textContent = STATUS_LABELS[status] ?? status;

  // Error banner
  if (status === 'error') {
    errorBanner.hidden = false;
    errorBanner.replaceChildren(
      el('span', {}, detail || 'Dažas izmaiņas nav nosūtītas.'),
      el('button', { type: 'button', onclick: () => sync.retryFailed() }, 'Mēģināt vēlreiz'),
    );
  } else {
    errorBanner.hidden = true;
  }

  // Family name
  const family = sync.getFamily();
  familyNameEl.textContent = family ? family.name : (sync.isRemote() ? '\u00a0' : 'Šajā ierīcē');

  // Summary
  const summary = listSummary(items);
  const summaryChildren = [
    el('span', {}, el('strong', {}, String(summary.activeCount)), ' produkti'),
    summary.pricedCount > 0 ? el('span', {}, (summary.hasEstimates ? '~' : ''), el('strong', {}, formatMoney(summary.totalKnown))) : null,
    summary.unpricedCount > 0 ? el('span', { class: 'unpriced' }, `${summary.unpricedCount} bez cenas`) : null,
  ].filter(Boolean);
  summaryEl.replaceChildren(...summaryChildren);

  // List
  const groups = groupItems(items);
  if (!groups.length) {
    listEl.replaceChildren(
      el('div', { class: 'empty-state' },
        el('h2', {}, 'Saraksts ir tukšs'),
        el('p', {}, 'Pievieno pirmo produktu ar lauku zemāk — citi ģimenes locekļi to redzēs uzreiz.'),
      ),
    );
    return;
  }

  const now = Date.now();
  listEl.replaceChildren(...groups.map((group) => {
    const groupTotal = group.items.reduce((sum, item) => sum + (item.price ?? 0), 0);
    const pricedAll = group.items.every((item) => item.price != null);
    return el('section', { class: 'group', 'aria-label': group.label },
      el('div', { class: 'group-head', style: `--dot:${group.hue}` },
        el('span', { class: 'cat-dot', 'aria-hidden': 'true' }),
        el('span', { class: 'cat-name' }, group.label),
        el('span', { class: 'cat-count' }, String(group.items.length)),
        groupTotal > 0 && el('span', { class: 'cat-total' }, (pricedAll ? '' : '≥') + formatMoney(groupTotal)),
      ),
      ...group.items.map((item) => renderRow(item, { pending: pending.has(item.id), failed: failed.has(item.id), now })),
    );
  }));
}

function renderRow(item, { pending, failed, now }) {
  const price = priceLabel(item, now);
  const bought = item.status === 'bought';
  return el('div', { class: `row${bought ? ' is-bought' : ''}`, 'data-id': item.id },
    el('button', { class: 'check', type: 'button', 'aria-label': bought ? `Atlikt atpakaļ: ${item.name}` : `Atzīmēt kā nopirktu: ${item.name}`, 'aria-pressed': bought ? 'true' : 'false', onclick: () => {
      const next = sync.toggleItem(item.id);
      if (next?.status === 'bought') showSnackbar(`“${item.name}” grozā.`, 'Atcelt', () => sync.toggleItem(item.id));
    } },
      el('span', { class: 'box', html: icons.check }),
    ),
    el('button', { class: 'row-main', type: 'button', onclick: () => openEdit(item.id) },
      el('span', { class: 'name' }, item.name),
      (item.qty || item.note || pending || failed) && el('span', { class: 'meta' },
        item.qty && el('span', { class: 'qty' }, item.qty),
        item.note && el('span', {}, item.note),
        failed ? el('span', { class: 'failed-tag' }, 'nav nosūtīts') : pending && el('span', { class: 'pending-tag' }, 'gaida sinhronizāciju'),
      ),
    ),
    el('div', { class: 'row-end' },
      el('span', { class: `price ${price.cls}` }, price.text),
      price.age && el('span', { class: 'price-age' }, price.age),
    ),
  );
}

function openEdit(id) {
  const item = sync.getItem(id);
  if (!item) return;
  openSheet({
    mode: 'edit', item, sync,
    onSubmit: (fields) => {
      const updates = { name: fields.name, qty: fields.qty, note: fields.note, category: fields.category };
      if (fields.price !== undefined) updates.price = fields.price;
      sync.updateItem(id, updates);
    },
    onDelete: () => {
      const snapshot = sync.deleteItem(id);
      if (snapshot) showSnackbar(`“${snapshot.name}” dzēsts.`, 'Atcelt', () => sync.restoreItem(snapshot));
    },
  });
}

// ---------- Boot ----------
sync.subscribe(render);
render();

if (sync.isRemote()) {
  sync.connect().then(() => {
    if (sync.getStatus().status === 'setup') {
      openSetup({ sync, onDone: render });
    }
  });
}
