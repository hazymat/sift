import { sortable } from '../sortable.js';
import { toast } from '../toast.js';

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
      <section class="card">
        <h2>Appearance</h2>
        <div class="segmented" id="theme" role="group" aria-label="Theme">
          ${app.THEMES.map(t => `<button type="button" data-value="${t.id}" aria-pressed="${t.id === app.currentTheme()}">${t.label}</button>`).join('')}
        </div>
        <p class="muted" id="theme-note"></p>
      </section>

      <section class="card" id="planner-settings">
        <h2>Day Planner</h2>
        <div class="settings-grid">
          <label>Paper<select name="paper_style"></select></label>
          <label>Day starts<input type="time" name="day_start"></label>
          <label>Day ends<input type="time" name="day_end"></label>
          <label>Each line<select name="slot_min">${[15, 20, 30, 45, 60].map(m => `<option value="${m}">${m} min</option>`).join('')}</select></label>
        </div>
        <h3>Down days</h3>
        <p class="muted">Days to go easy. The planner nudges you to do less.</p>
        <div class="segmented" id="down-days">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, n) => `<button type="button" data-dow="${(n + 1) % 7}">${d}</button>`).join('')}</div>
        <h3>Nudges</h3>
        <label class="check-row"><input type="checkbox" name="hint_down_day"> Remind me to do less on down days</label>
        <label class="check-row"><input type="checkbox" name="hint_walk_breaks"> Build in walking breaks during laptop work <span class="muted">(with the focus timer, coming later)</span></label>
      </section>

      <section class="card">
        <h2>Navigation</h2>
        <p class="muted">Drag to reorder. The top ${app.MAX_PINNED} go in the bottom bar on your phone; the rest live under More.</p>
        <ul class="pin-list" id="nav-order"></ul>
      </section>

      <section class="card" id="backup-card">
        <h2>Backup</h2>
        <p class="muted" id="backup-status">Until sync is set up, this device holds the only copy of your data.</p>
        <div class="backup-row">
          <button type="button" class="primary" data-act="backup">Back up now</button>
          <label class="check-row"><input type="checkbox" id="backup-lock"> Lock with a passphrase</label>
        </div>
        <div class="backup-row">
          <label class="file-btn">Restore from a backup…<input type="file" id="restore-file" accept=".sift,application/json,application/gzip,application/octet-stream" hidden></label>
        </div>
        <p class="muted hint">Backups are a single .sift file. On iPhone, save it to Files or iCloud Drive. Restoring merges: nothing on this device is lost, and the newest edit of each field wins.</p>
      </section>

      <section class="card">
        <h2>Archive &amp; Bin</h2>
        <p class="muted">Archived things are hidden but still searchable. Deleted things stay in the bin for 30 days.</p>
        <div class="segmented"><a class="seg-link" href="#/bin/archive/all">Archive <span id="count-archive" class="muted"></span></a><a class="seg-link" href="#/bin/bin/all">Bin <span id="count-bin" class="muted"></span></a></div>
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

    // Day Planner settings
    const { daySettings } = await import('../days.js');
    const ps = el.querySelector('#planner-settings');
    const drawPlanner = async () => {
      const d = await daySettings();
      const { PAPERS } = await import('../days.js');
      ps.querySelector('[name="paper_style"]').innerHTML = PAPERS.map(p => `<option value="${p.id}">${p.label}</option>`).join('');
      ps.querySelector('[name="paper_style"]').value = d.paper_style;
      ps.querySelector('[name="day_start"]').value = d.day_start;
      ps.querySelector('[name="day_end"]').value = d.day_end;
      ps.querySelector('[name="slot_min"]').value = String(d.slot_min);
      ps.querySelector('[name="hint_down_day"]').checked = d.hint_down_day;
      ps.querySelector('[name="hint_walk_breaks"]').checked = d.hint_walk_breaks;
      for (const b of ps.querySelectorAll('[data-dow]')) b.setAttribute('aria-pressed', d.down_days.includes(Number(b.dataset.dow)));
    };
    ps.addEventListener('change', async ev => {
      const t = ev.target;
      const value = t.type === 'checkbox' ? t.checked : t.name === 'slot_min' ? Number(t.value) : t.value;
      if (t.name && value !== '') { await store.updateSettings({ [t.name]: value }); toast('✓ Saved'); }
    });
    ps.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-dow]');
      if (!b) return;
      const d = await daySettings();
      const n = Number(b.dataset.dow);
      const down = d.down_days.includes(n) ? d.down_days.filter(x => x !== n) : [...d.down_days, n];
      await store.updateSettings({ down_days: down });
      drawPlanner();
      toast('✓ Saved');
    });
    drawPlanner();

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
        ...app.AREAS.filter(a => !a.hidden && !pinned.includes(a.id)).map(row),
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

    import('../bin.js').then(async bin => {
      const c = await bin.counts();
      el.querySelector('#count-archive').textContent = c.archive;
      el.querySelector('#count-bin').textContent = c.bin;
    });

    // Backup
    const backup = await import('../backup.js');
    const backupStatus = async () => {
      const last = await backup.lastBackup();
      const overdue = await backup.backupOverdue();
      const p = el.querySelector('#backup-status');
      p.classList.toggle('warn', overdue);
      p.textContent = last
        ? `Last backup: ${new Date(last).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.${overdue ? ' ⚠️ Over two weeks ago.' : ''}`
        : overdue ? '⚠️ Never backed up, and this device holds the only copy of your data.' : 'Until sync is set up, this device holds the only copy of your data.';
    };
    backupStatus();
    el.querySelector('#backup-card').addEventListener('click', async ev => {
      if (!ev.target.closest('[data-act="backup"]')) return;
      let passphrase = null;
      if (el.querySelector('#backup-lock').checked) {
        passphrase = prompt('Passphrase for this backup (you will need it to restore; it cannot be recovered):');
        if (!passphrase) return;
        if (prompt('Type the passphrase again:') !== passphrase) { toast("Passphrases didn't match"); return; }
      }
      toast('Making a backup…');
      const made = await backup.makeBackup({ passphrase });
      const how = await backup.saveBackupFile(made);
      if (how === 'cancelled') return;
      await backup.noteBackup();
      backupStatus();
      const n = Object.entries(made.counts).filter(([k]) => k !== 'settings').reduce((a, [, v]) => a + v, 0);
      toast(`✓ Backed up ${n} record${n === 1 ? '' : 's'}${passphrase ? ' (locked)' : ''}`);
    });
    el.querySelector('#restore-file').addEventListener('change', async ev => {
      const file = ev.target.files[0];
      ev.target.value = '';
      if (!file) return;
      let data;
      try {
        try { data = await backup.readBackup(file); }
        catch (err) {
          if (!(err instanceof backup.NeedsPassphrase)) throw err;
          const pass = prompt('This backup is locked. Passphrase:');
          if (!pass) return;
          data = await backup.readBackup(file, pass);
        }
        const result = await backup.restoreBackup(data);
        toast(`✓ Restored from ${new Date(data.created_at).toLocaleDateString()}: ${result.added} added, ${result.updated} updated`);
        setTimeout(() => location.reload(), 1800);
      } catch (err) {
        toast(`Couldn't restore: ${err.message}`);
      }
    });

    const storage = el.querySelector('#storage');
    const est = await navigator.storage?.estimate?.();
    const persisted = await navigator.storage?.persisted?.();
    storage.innerHTML = `
      <dt>Used</dt><dd>${formatBytes(est?.usage)}</dd>
      <dt>Available</dt><dd>${formatBytes(est?.quota)}</dd>
      <dt>Protected from clean-up</dt><dd>${persisted ? 'Yes' : '⚠️ No. Install Sift to your Home Screen to protect your data.'}</dd>
      <dt>Unsynced changes</dt><dd>${await store.outboxSize()}</dd>
    `;
  },
};
