// ui-helpers.js — DOM utilities, icons, formatting for the view layer.

import { formatMoney, priceFreshness } from './core.js';

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key === 'html') node.innerHTML = value; // trusted, static markup only (icons)
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const icons = {
  check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8.5 6 12l7.5-8"/></svg>',
  plus: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>',
  sliders: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 6h9M16 6h1M3 14h3M10 14h7"/><circle cx="14" cy="6" r="2"/><circle cx="8" cy="14" r="2"/></svg>',
  gear: '<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="3.2"/><path d="M11 2.8v2.4M11 16.8v2.4M2.8 11h2.4M16.8 11h2.4M5.2 5.2l1.7 1.7M15.1 15.1l1.7 1.7M16.8 5.2l-1.7 1.7M6.9 15.1l-1.7 1.7"/></svg>',
  back: '<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 5 7.5 11l6 6"/></svg>',
};

const dayMs = 86400_000;

export function priceLabel(item, now = Date.now()) {
  const freshness = priceFreshness(item, now);
  if (freshness === 'none') return { text: '—', cls: 'is-none', age: '' };
  const text = formatMoney(item.price);
  if (freshness === 'manual') return { text, cls: '', age: '' };
  const days = Math.max(0, Math.floor((now - Date.parse(item.priceUpdatedAt)) / dayMs));
  const age = days === 0 ? '~ šodien' : days === 1 ? '~ vakar' : `~ pirms ${days} d.`;
  return { text: `~${text}`, cls: freshness === 'recent' ? 'is-estimate' : 'is-stale', age };
}

export const STATUS_LABELS = {
  local: 'Tikai šajā ierīcē',
  connecting: 'Savienojas…',
  setup: 'Nepieciešama iestatīšana',
  synced: 'Sinhronizēts',
  syncing: 'Sinhronizē…',
  offline: 'Bezsaistē',
  error: 'Sinhronizācijas kļūda',
};

export function focusEnd(input) {
  input.focus();
  const len = input.value.length;
  try { input.setSelectionRange(len, len); } catch { /* number inputs */ }
}
