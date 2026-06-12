// sheet.js — item add/edit bottom sheet. Built once per open; never re-rendered
// by external state changes, so typed input survives realtime events.

import { CATEGORIES, parsePrice, formatMoney, guessCategory } from './core.js';
import { el, icons, focusEnd } from './ui-helpers.js';

// mode: 'add' | 'edit'. Returns { close } — calls onSubmit(fields) / onDelete().
export function openSheet({ mode, item = null, prefillName = '', sync, onSubmit, onDelete, onClose }) {
  let submitting = false;
  let selectedCategory = item?.category ?? (prefillName ? guessCategory(prefillName) : 'other');
  let autoCategory = !item; // keep guessing while user types, until manual pick

  const scrim = el('button', { class: 'scrim', 'aria-label': 'Aizvērt', onclick: () => close() });

  const nameInput = el('input', {
    class: 'input-lg', type: 'text', value: item?.name ?? prefillName,
    placeholder: 'Produkta nosaukums', maxlength: '80', autocomplete: 'off',
    oninput: () => {
      if (!autoCategory) return;
      selectCategory(guessCategory(nameInput.value), { auto: true });
      updatePriceHint();
    },
  });

  const qtyInput = el('input', { type: 'text', value: item?.qty ?? '', placeholder: 'piem., 2 gab.', maxlength: '40', autocomplete: 'off' });
  const priceInput = el('input', {
    type: 'text', inputmode: 'decimal', value: item?.price != null && item.priceSource === 'manual' ? String(item.price).replace('.', ',') : '',
    placeholder: '0,00', maxlength: '10', autocomplete: 'off',
  });
  const noteInput = el('input', { type: 'text', value: item?.note ?? '', placeholder: 'piezīme (nav obligāta)', maxlength: '120', autocomplete: 'off' });

  const priceHint = el('p', { class: 'price-hint' });
  function updatePriceHint() {
    const name = nameInput.value.trim();
    const known = name ? sync.lookupPrice(name) : null;
    if (item?.price != null && item.priceSource === 'history') {
      priceHint.textContent = `Aptuvenā cena no ģimenes vēstures: ${formatMoney(item.price)}. Ieraksti precīzu cenu, lai to atjauninātu.`;
    } else if (known && !priceInput.value) {
      priceHint.textContent = `Pēdējā zināmā cena: ${formatMoney(known.price)} (ģimenes vēsture).`;
    } else {
      priceHint.textContent = 'Cenu nenorādot, tā paliks tukša — nekas netiek izdomāts.';
    }
  }
  updatePriceHint();

  const chips = el('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Kategorija' });
  const chipEls = new Map();
  for (const category of CATEGORIES) {
    const input = el('input', {
      type: 'radio', name: 'category', value: category.key,
      onchange: () => selectCategory(category.key, { auto: false }),
    });
    const chip = el('label', { class: 'chip', style: `--chip:${category.hue}` }, input, category.label);
    chipEls.set(category.key, { chip, input });
    chips.append(chip);
  }
  function selectCategory(key, { auto }) {
    selectedCategory = key;
    if (!auto) autoCategory = false;
    for (const [candidate, { chip, input }] of chipEls) {
      chip.classList.toggle('selected', candidate === key);
      input.checked = candidate === key;
    }
  }
  selectCategory(selectedCategory, { auto: true });

  const submitBtn = el('button', { class: 'btn primary', type: 'submit' }, mode === 'add' ? 'Pievienot' : 'Saglabāt');

  const form = el('form', { novalidate: true,
    onsubmit: (event) => {
      event.preventDefault();
      if (submitting) return; // double-tap guard
      const name = nameInput.value.trim();
      if (!name) { focusEnd(nameInput); return; }
      submitting = true;
      submitBtn.disabled = true;
      const price = parsePrice(priceInput.value);
      onSubmit({
        name,
        qty: qtyInput.value.trim(),
        note: noteInput.value.trim(),
        category: selectedCategory,
        price: priceInput.value.trim() ? price : (mode === 'edit' && item?.priceSource === 'manual' ? null : undefined),
      });
      close();
    } },
    nameInput,
    chips,
    el('div', { class: 'field-grid' },
      el('label', { class: 'field' }, 'Daudzums', qtyInput),
      el('label', { class: 'field' }, 'Cena (€)', priceInput),
    ),
    priceHint,
    el('label', { class: 'field note-label' }, 'Piezīme', noteInput),
    el('div', { class: 'sheet-actions' },
      mode === 'edit' && el('button', { class: 'btn ghost danger', type: 'button', onclick: () => { onDelete?.(); close(); } }, 'Dzēst'),
      el('div', { class: 'spacer' }),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => close() }, 'Atcelt'),
      submitBtn,
    ),
  );

  const sheet = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': mode === 'add' ? 'Pievienot produktu' : 'Labot produktu' },
    el('div', { class: 'grab' }),
    form,
  );

  priceInput.addEventListener('input', updatePriceHint);

  function onKey(event) {
    if (event.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKey);

  const previousFocus = document.activeElement;
  document.body.append(scrim, sheet);
  focusEnd(nameInput);

  function close() {
    document.removeEventListener('keydown', onKey);
    scrim.remove();
    sheet.remove();
    previousFocus?.focus?.();
    onClose?.();
  }

  return { close };
}
