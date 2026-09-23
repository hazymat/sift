import { sortable } from '../sortable.js';

const icon = id => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;

function formatBytes(n) {
  if (n == null) return 'unknown';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}

export default {
  async mount(el, { store, app }) {
    el.innerHTML = `
      <h1>Settings</h1>

      <section class="card">
        <h2>Appearance</h2>
        <div class="segmented" id="theme" role="group" aria-label="Theme">
          ${app.THEMES.map(t => `<button type="button" data-value="${t.id}" aria-pressed="${t.id === app.currentTheme()}">${t.label}</button>`).join('')}
        </div>
        <p class="muted" id="theme-note"></p>
      </section>

      <section class="card">
        <h2>Navigation</h2>
        <p class="muted">Drag to reorder. The top ${app.MAX_PINNED} go in the bottom bar on your phone; the rest live under More.</p>
        <ul class="pin-list" id="nav-order"></ul>
      </section>

      <section class="card">
        <h2>Storage</h2>
        <dl class="facts" id="storage"></dl>
      </section>

      <section class="card">
        <h2>Sync</h2>
        <p class="muted">Everything is stored on this device only. Sync between devices is coming later.</p>
      </section>

      <section class="card">
        <h2>This device</h2>
        <dl class="facts">
          <dt>Device id</dt><dd><code>${store.getDeviceId()}</code></dd>
          <dt>Installed</dt><dd>${matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'Yes' : 'No, running in the browser'}</dd>
        </dl>
      </section>
    `;

    const themeNote = () => {
      el.querySelector('#theme-note').textContent =
        app.currentTheme() === 'auto' ? 'Light by day, Blue at night, following your device.' : '';
    };
    themeNote();
    el.querySelector('#theme').addEventListener('click', async e => {
      const id = e.target.closest('button')?.dataset.value;
      if (!id) return;
      for (const b of el.querySelectorAll('#theme button')) b.setAttribute('aria-pressed', b.dataset.value === id);
      await app.setTheme(id);
      themeNote();
    });

    // One list: pinned areas, a "More" divider, then everything else.
    // Dragging an area across the divider pins or unpins it.
    const list = el.querySelector('#nav-order');
    const row = a => a.pinnable === false
      ? `<li data-id="${a.id}" class="fixed">${icon(a.icon)}<span>${a.label}</span></li>`
      : `<li data-id="${a.id}">${icon(a.icon)}<span>${a.label}</span>
          <button type="button" class="drag-handle" aria-label="Reorder ${a.label}">${icon('i-grip')}</button></li>`;

    const renderPins = () => {
      const pinned = app.pinnedAreas();
      list.innerHTML = [
        ...pinned.map(id => row(app.AREAS.find(a => a.id === id))),
        '<li class="divider">More</li>',
        ...app.AREAS.filter(a => !pinned.includes(a.id)).map(row),
      ].join('');
    };

    const divider = () => list.querySelector('.divider');
    const above = () => [...list.children].slice(0, [...list.children].indexOf(divider()));

    // Keep the rules while dragging: at most MAX_PINNED and at least one
    // pinned, and unpinnable areas always below the divider.
    const enforce = moved => {
      for (const li of above()) if (li.classList.contains('fixed')) divider().after(li);
      const pinned = above();
      if (pinned.length > app.MAX_PINNED) {
        const bump = pinned.at(-1) === moved ? pinned.at(-2) : pinned.at(-1);
        divider().after(bump);
      }
      if (!above().length) divider().before(moved.classList.contains('fixed') ? divider().nextElementSibling : moved);
    };

    sortable(list, {
      onMove: enforce,
      async onEnd() {
        const focused = document.activeElement?.closest('li')?.dataset.id;
        await app.setPinned(above().map(li => li.dataset.id));
        renderPins();
        if (focused) list.querySelector(`[data-id="${focused}"] .drag-handle`)?.focus();
      },
    });

    renderPins();

    const storage = el.querySelector('#storage');
    const est = await navigator.storage?.estimate?.();
    const persisted = await navigator.storage?.persisted?.();
    storage.innerHTML = `
      <dt>Used</dt><dd>${formatBytes(est?.usage)}</dd>
      <dt>Available</dt><dd>${formatBytes(est?.quota)}</dd>
      <dt>Protected from clean-up</dt><dd>${persisted ? 'Yes' : 'No. Install Sift to your Home Screen to protect your data.'}</dd>
      <dt>Unsynced changes</dt><dd>${await store.outboxSize()}</dd>
    `;
  },
};
