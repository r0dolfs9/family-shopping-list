import { CATEGORIES, categoryByKey, formatMoney, groupItems, listSummary } from './core.js';
import { createLocalStore } from './local-store.js';
import { appConfig } from './app-config.js';

const seedItems = [
  { id: 'seed-1', name: 'Piens', qty: '2', category: 'dairy', priceEstimate: 2.5, addedBy: 'me' },
  { id: 'seed-2', name: 'Banani', qty: '1 kg', category: 'fruit', priceEstimate: 1.6, addedBy: 'me' },
  { id: 'seed-3', name: 'Maize', qty: '1', category: 'bakery', priceEstimate: 1.1, addedBy: 'me' },
];

const members = [
  appConfig.currentMember,
  { id: 'family-1', name: 'Gimene', initials: 'GI', color: '#d28a18' },
  { id: 'family-2', name: 'Maja', initials: 'MA', color: '#4f8a4f' },
];

const store = createLocalStore({ seedItems });
const state = {
  items: store.getItems(),
  editingId: null,
  sheetOpen: false,
  settingsOpen: false,
  theme: localStorage.getItem('tally-theme') || 'light',
  density: localStorage.getItem('tally-density') || 'airy',
};

document.documentElement.dataset.theme = state.theme;
document.documentElement.dataset.density = state.density;

store.subscribe((items) => {
  state.items = items;
  render();
});

render();

function render() {
  const root = document.querySelector('#app');
  const summary = listSummary(state.items);
  root.innerHTML = `
    <section class="phone">
      <header class="topbar">
        <button class="avatar-stack" data-action="family" aria-label="Atvert gimeni">
          ${members.map((member) => `<span class="avatar" style="--avatar:${member.color}">${member.initials}</span>`).join('')}
        </button>
        <div class="top-actions">
          <span class="sync-pill ${isSupabaseConfigured() ? 'online' : 'local'}">
            <span></span>${isSupabaseConfigured() ? 'Sinhronizets' : 'Lokals rezims'}
          </span>
          <button class="icon-btn" data-action="settings" aria-label="Iestatijumi">⚙</button>
        </div>
      </header>

      <section class="hero">
        <p>${escapeHtml(appConfig.familyName)}</p>
        <h1>Iepirkumu saraksts</h1>
        <div>${summary.activeCount} preces · vel ~<strong>${formatMoney(summary.totalEstimate)}</strong></div>
      </section>

      <section class="list" aria-label="Iepirkumu saraksts">
        ${renderGroups()}
      </section>

      <footer class="addbar">
        <button class="add-field" data-action="new">Pievienot sarakstam...</button>
        <button class="add-btn" data-action="new" aria-label="Pievienot">+</button>
      </footer>
    </section>
    ${state.sheetOpen ? renderSheet() : ''}
    ${state.settingsOpen ? renderSettings() : ''}
  `;

  bindEvents(root);
}

function renderGroups() {
  const groups = groupItems(state.items);
  if (!groups.length) {
    return `<div class="empty-state"><h2>Saraksts tukss</h2><p>Pievieno pirmo preci, un ta paliks saglabata saja ierice.</p></div>`;
  }

  return groups.map((group) => {
    const total = group.items.reduce((sum, item) => sum + Number(item.priceEstimate || 0), 0);
    return `
      <article class="group">
        <header class="group-head">
          <span class="dot" style="--dot:${group.hue}"></span>
          <span>${group.label}</span>
          <small>${group.items.length}</small>
          <i></i>
          <strong>${formatMoney(total)}</strong>
        </header>
        <div class="rows">
          ${group.items.map(renderItem).join('')}
        </div>
      </article>
    `;
  }).join('');
}

function renderItem(item) {
  const category = categoryByKey(item.category);
  const bought = item.status === 'bought';
  return `
    <div class="row ${bought ? 'is-bought' : ''}" data-id="${item.id}">
      <button class="check" data-action="toggle" aria-label="${bought ? 'Atlikt atpakal saraksta' : 'Atzimet ka nopirktu'}">
        ${bought ? '✓' : ''}
      </button>
      <button class="row-main" data-action="edit">
        <span class="name">${escapeHtml(item.name)}</span>
        <span class="meta">
          ${item.qty ? `<b>${escapeHtml(item.qty)}</b>` : ''}
          ${item.note ? `<em>${escapeHtml(item.note)}</em>` : `<em>${bought ? 'groza' : category.label}</em>`}
        </span>
      </button>
      <span class="price ${item.priceGuessed ? 'guess' : ''}">${item.priceGuessed ? '≈ ' : ''}${formatMoney(item.priceEstimate)}</span>
      <button class="delete" data-action="delete" aria-label="Dzest">×</button>
    </div>
  `;
}

function renderSheet() {
  const item = state.editingId ? state.items.find((candidate) => candidate.id === state.editingId) : null;
  const selected = item?.category || 'other';
  return `
    <div class="scrim" data-action="close-sheet"></div>
    <form class="sheet" id="item-form">
      <div class="grab"></div>
      <input class="input-lg" name="name" value="${escapeAttribute(item?.name || '')}" placeholder="Ko vajag?" autocomplete="off" required autofocus>
      <div class="chips">
        ${CATEGORIES.map((category) => `
          <label class="chip ${selected === category.key ? 'selected' : ''}" style="--chip:${category.hue}">
            <input type="radio" name="category" value="${category.key}" ${selected === category.key ? 'checked' : ''}>
            ${category.label}
          </label>
        `).join('')}
      </div>
      <div class="field-grid">
        <label>Daudzums<input name="qty" value="${escapeAttribute(item?.qty || '')}" placeholder="1 gab"></label>
        <label>Cena<input name="priceEstimate" value="${item && !item.priceGuessed ? item.priceEstimate : ''}" inputmode="decimal" placeholder="auto"></label>
      </div>
      <label class="note-label">Piezime<input name="note" value="${escapeAttribute(item?.note || '')}" placeholder="piem. bez cukura"></label>
      <div class="sheet-actions">
        ${item ? '<button type="button" class="ghost danger" data-action="delete-current">Dzest</button>' : '<span></span>'}
        <button type="button" class="ghost" data-action="close-sheet">Atcelt</button>
        <button class="primary" type="submit">${item ? 'Saglabat' : 'Pievienot'}</button>
      </div>
    </form>
  `;
}

function renderSettings() {
  return `
    <div class="screen">
      <header>
        <button class="icon-btn" data-action="close-settings" aria-label="Atpakal">←</button>
        <h2>Iestatijumi</h2>
      </header>
      <section>
        <h3>Sinhronizacija</h3>
        <p class="muted">${isSupabaseConfigured()
          ? 'Supabase konfiguracija ir aizpildita. Nakama versija var slegties pie realtime datiem.'
          : 'Sobrid darbojas lokali saja ierice. Kad bus Supabase projekts, aizpildi src/app-config.js un palaid SQL no supabase/schema.sql.'}</p>
      </section>
      <section>
        <h3>Izskats</h3>
        <div class="seg">
          <button class="${state.theme === 'light' ? 'on' : ''}" data-action="theme" data-value="light">Gaiss</button>
          <button class="${state.theme === 'dark' ? 'on' : ''}" data-action="theme" data-value="dark">Tumss</button>
        </div>
        <div class="seg">
          <button class="${state.density === 'airy' ? 'on' : ''}" data-action="density" data-value="airy">Plass</button>
          <button class="${state.density === 'compact' ? 'on' : ''}" data-action="density" data-value="compact">Kompakts</button>
        </div>
      </section>
      <section>
        <h3>Gimene</h3>
        <div class="member-list">
          ${members.map((member) => `<div><span class="avatar" style="--avatar:${member.color}">${member.initials}</span><strong>${member.name}</strong><small>gatavs testam</small></div>`).join('')}
        </div>
      </section>
    </div>
  `;
}

function bindEvents(root) {
  root.querySelectorAll('[data-action]').forEach((element) => {
    element.addEventListener('click', (event) => {
      const action = element.dataset.action;
      const row = element.closest('[data-id]');
      if (action === 'new') openSheet();
      if (action === 'edit') openSheet(row.dataset.id);
      if (action === 'toggle') store.toggleItem(row.dataset.id, { memberId: appConfig.currentMember.id });
      if (action === 'delete') store.deleteItem(row.dataset.id);
      if (action === 'delete-current' && state.editingId) {
        store.deleteItem(state.editingId);
        closeSheet();
      }
      if (action === 'close-sheet') closeSheet();
      if (action === 'settings' || action === 'family') {
        state.settingsOpen = true;
        render();
      }
      if (action === 'close-settings') {
        state.settingsOpen = false;
        render();
      }
      if (action === 'theme') {
        state.theme = element.dataset.value;
        localStorage.setItem('tally-theme', state.theme);
        document.documentElement.dataset.theme = state.theme;
        render();
      }
      if (action === 'density') {
        state.density = element.dataset.value;
        localStorage.setItem('tally-density', state.density);
        document.documentElement.dataset.density = state.density;
        render();
      }
    });
  });

  const form = root.querySelector('#item-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.name.trim()) return;
      const input = {
        name: data.name,
        qty: data.qty,
        note: data.note,
        category: data.category,
        priceEstimate: parsePrice(data.priceEstimate),
      };
      if (state.editingId) store.updateItem(state.editingId, input);
      else store.addItem(input, { memberId: appConfig.currentMember.id });
      closeSheet();
    });
  }
}

function openSheet(id = null) {
  state.editingId = id;
  state.sheetOpen = true;
  render();
  requestAnimationFrame(() => document.querySelector('.input-lg')?.focus());
}

function closeSheet() {
  state.editingId = null;
  state.sheetOpen = false;
  render();
}

function parsePrice(value) {
  const trimmed = String(value || '').replace(',', '.').trim();
  return trimmed ? Number(trimmed) : undefined;
}

function isSupabaseConfigured() {
  return Boolean(appConfig.supabase.url && appConfig.supabase.anonKey && appConfig.supabase.familyId);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
