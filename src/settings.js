// settings.js — settings screen + family setup screen.

import { el, icons } from './ui-helpers.js';

const THEME_KEY = 'tally-v2-theme';

export function getTheme() {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === 'light' || theme === 'dark' ? theme : 'auto';
  } catch {
    return 'auto';
  }
}
export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* private mode */ }
}

export function openSettings({ sync, onClose }) {
  const screen = el('div', { class: 'screen', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Iestatījumi', 'data-screen-label': 'Iestatījumi' });

  const themeSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Motīvs' });
  const themes = [['auto', 'Automātiski'], ['light', 'Gaišs'], ['dark', 'Tumšs']];
  function renderThemeSeg() {
    themeSeg.replaceChildren(...themes.map(([value, label]) =>
      el('button', { type: 'button', class: getTheme() === value ? 'on' : '', onclick: () => { setTheme(value); renderThemeSeg(); } }, label),
    ));
  }
  renderThemeSeg();

  const familySection = el('section', {});
  renderFamilySection();

  async function renderFamilySection() {
    const family = sync.getFamily();
    if (!sync.isRemote()) {
      familySection.replaceChildren(
        el('h3', {}, 'Ģimenes sinhronizācija'),
        el('p', { class: 'muted' }, 'Šobrīd saraksts tiek glabāts tikai šajā ierīcē. Lai to koplietotu ar ģimeni, norādi Supabase adresi un atslēgu failā ', el('code', {}, 'src/app-config.js'), ' — instrukcija ir README failā.'),
      );
      return;
    }
    if (!family) {
      familySection.replaceChildren(
        el('h3', {}, 'Ģimene'),
        el('p', { class: 'muted' }, 'Ierīce vēl nav pievienota ģimenei.'),
      );
      return;
    }
    familySection.replaceChildren(
      el('h3', {}, 'Ģimene'),
      el('p', { class: 'muted' }, `${family.name}. Lai pievienotu jaunu ierīci, atver lietotni tajā un ievadi šo ielūguma kodu:`),
      el('div', { class: 'invite-code' }, family.invite_code),
      el('div', { class: 'member-list', 'aria-busy': 'true' }, el('p', { class: 'muted' }, 'Ielādē dalībniekus…')),
    );
    try {
      const members = await sync.remote.listMembers();
      const list = familySection.querySelector('.member-list');
      list.removeAttribute('aria-busy');
      list.replaceChildren(...members.map((member) =>
        el('div', { class: 'member' },
          el('span', { class: 'avatar', style: `--avatar:${member.color || 'var(--accent)'}` }, member.initials || member.display_name.slice(0, 2).toUpperCase()),
          el('span', {}, member.display_name),
          member.id === sync.getMember()?.id ? el('small', {}, 'šī ierīce') : null,
        ),
      ));
    } catch {
      familySection.querySelector('.member-list')?.replaceChildren(el('p', { class: 'muted' }, 'Neizdevās ielādēt dalībniekus.'));
    }
  }

  screen.append(
    el('header', {},
      el('button', { class: 'icon-btn', 'aria-label': 'Atpakaļ', html: icons.back, onclick: close }),
      el('h2', {}, 'Iestatījumi'),
    ),
    el('section', {}, el('h3', {}, 'Izskats'), themeSeg),
    familySection,
    el('section', {},
      el('h3', {}, 'Par cenām'),
      el('p', { class: 'muted' }, 'Tally nekad neizdomā cenas. Cena parādās tikai tad, ja kāds no ģimenes to ir ierakstījis. Cenas ar “~” ir aptuvenas — no ģimenes cenu vēstures; novecojušas cenas izskatās blāvākas.'),
    ),
  );

  function onKey(event) {
    if (event.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKey);
  document.body.append(screen);
  screen.querySelector('button')?.focus();

  function close() {
    document.removeEventListener('keydown', onKey);
    screen.remove();
    onClose?.();
  }
  return { close };
}

// First-run family setup when Supabase is configured but device has no membership.
export function openSetup({ sync, onDone }) {
  const screen = el('div', { class: 'screen', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Ģimenes iestatīšana', 'data-screen-label': 'Iestatīšana' });
  let mode = 'join'; // most devices join an existing family

  const error = el('p', { class: 'form-error', hidden: true });
  const nameInput = el('input', { type: 'text', maxlength: '30', placeholder: 'piem., Anna', autocomplete: 'name' });
  const familyInput = el('input', { type: 'text', maxlength: '40', placeholder: 'piem., Mūsmājas' });
  const codeInput = el('input', { type: 'text', maxlength: '8', placeholder: 'piem., K4T7PX', autocapitalize: 'characters', autocomplete: 'off', style: 'text-transform:uppercase;font-family:var(--mono);letter-spacing:.14em' });

  const familyField = el('label', { class: 'field' }, 'Ģimenes nosaukums', familyInput);
  const codeField = el('label', { class: 'field' }, 'Ielūguma kods', codeInput);

  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Veids' });
  function renderSeg() {
    seg.replaceChildren(
      el('button', { type: 'button', class: mode === 'join' ? 'on' : '', onclick: () => { mode = 'join'; update(); } }, 'Pievienoties ģimenei'),
      el('button', { type: 'button', class: mode === 'create' ? 'on' : '', onclick: () => { mode = 'create'; update(); } }, 'Izveidot jaunu'),
    );
  }
  function update() {
    renderSeg();
    familyField.hidden = mode !== 'create';
    codeField.hidden = mode !== 'join';
    error.hidden = true;
  }

  const submit = el('button', { class: 'btn primary', type: 'submit' }, 'Turpināt');
  let busy = false;

  const form = el('form', { class: 'setup-form', novalidate: true, onsubmit: async (event) => {
    event.preventDefault();
    if (busy) return;
    error.hidden = true;
    const displayName = nameInput.value.trim();
    if (!displayName) return showError('Ievadi savu vārdu.');
    if (mode === 'create' && !familyInput.value.trim()) return showError('Ievadi ģimenes nosaukumu.');
    if (mode === 'join' && codeInput.value.trim().length < 4) return showError('Ievadi ielūguma kodu.');
    busy = true;
    submit.disabled = true;
    submit.textContent = 'Savienojas…';
    try {
      const palette = ['#2541e0', '#b94b4b', '#3d7a45', '#9a5bb8', '#2f8f9d', '#d28a18'];
      await sync.completeSetup(mode, {
        displayName,
        familyName: familyInput.value.trim(),
        inviteCode: codeInput.value.trim(),
        color: palette[Math.floor(Math.random() * palette.length)],
        initials: displayName.slice(0, 2).toUpperCase(),
      });
      screen.remove();
      onDone();
    } catch (rpcError) {
      showError(rpcError.message || 'Neizdevās savienoties. Mēģini vēlreiz.');
      busy = false;
      submit.disabled = false;
      submit.textContent = 'Turpināt';
    }
  } },
    seg,
    el('label', { class: 'field' }, 'Tavs vārds', nameInput),
    familyField,
    codeField,
    error,
    submit,
  );

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
  }

  screen.append(
    el('header', {}, el('h2', {}, 'Ģimenes saraksts')),
    el('section', {},
      el('p', { class: 'muted' }, 'Šī ierīce vēl nav pievienota nevienai ģimenei. Pievienojies ar ielūguma kodu no cita ģimenes telefona vai izveido jaunu ģimeni.'),
      form,
    ),
  );
  update();
  document.body.append(screen);
  nameInput.focus();
}
