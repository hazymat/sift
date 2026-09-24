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
      <section class="card" id="install-card">
        <h2>Home Screen and your data</h2>
        <div id="install-body"></div>
      </section>

      <section class="card">
        <h2>Appearance</h2>
        <div class="segmented" id="theme" role="group" aria-label="Theme">
          ${app.THEMES.map(t => `<button type="button" data-value="${t.id}" aria-pressed="${t.id === app.currentTheme()}">${t.label}</button>`).join('')}
        </div>
        <p class="muted" id="theme-note"></p>
        <h3>Text size</h3>
        <div class="segmented" id="text-size" role="group" aria-label="Text size">
          ${[[87.5, 'Smaller'], [100, 'Normal'], [112.5, 'Larger'], [125, 'Largest']].map(([v, l]) => `<button type="button" data-size="${v}">${l}</button>`).join('')}
        </div>
        <p class="muted">For this device only. Smaller fits more on the page.</p>
      </section>

      <section class="card" id="planner-settings">
        <h2>Day Planner</h2>
        <div class="settings-grid">
          <label>Paper<select name="paper_style"></select></label>
          <label>Day starts<input type="time" name="day_start"></label>
          <label>Day ends<input type="time" name="day_end"></label>
          <label>Each line<select name="slot_min">${[15, 20, 30, 45, 60].map(m => `<option value="${m}">${m} min</option>`).join('')}</select></label>
          <label>Longest duration<select name="duration_max_min">${[120, 180, 240, 300, 360, 480].map(m => `<option value="${m}">${m / 60} hours</option>`).join('')}</select></label>
        </div>
        <h3>Down days</h3>
        <p class="muted">Days to go easy. The planner nudges you to do less.</p>
        <div class="segmented" id="down-days">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, n) => `<button type="button" data-dow="${(n + 1) % 7}">${d}</button>`).join('')}</div>
        <h3>Nudges</h3>
        <label class="check-row"><input type="checkbox" name="show_now_marker"> Show a ▶ in the margin at the current time</label>
        <label class="check-row"><input type="checkbox" name="show_evening"> Show a section after the day ends, called <input name="evening_label" class="inline-text" placeholder="Evening plans" autocomplete="off" aria-label="Name of the section after the day ends"></label>
        <label class="check-row"><input type="checkbox" name="hint_down_day"> Remind me to do less on down days</label>
        <label class="check-row"><input type="checkbox" name="hint_walk_breaks"> Build in walking breaks during laptop work <span class="muted">(with the focus timer, coming later)</span></label>
      </section>

      <section class="card" id="energy-settings">
        <h2>Energy levels</h2>
        <p class="muted">Energy is here to help you stay mindful of how your choices for the day fit how you feel. Pick a level for the day in the Day Planner, mark tasks with the level they need, and Sift can suggest tasks that match. Say what each level means for you; it shows when you hover over (or hold) the ⚡.</p>
        <div class="settings-grid">
          <label class="wide">⚡ Low<input name="energy_low" autocomplete="off"></label>
          <label class="wide">⚡⚡ Medium<input name="energy_medium" autocomplete="off"></label>
          <label class="wide">⚡⚡⚡ High<input name="energy_high" autocomplete="off"></label>
        </div>
        <div class="backup-row"><button type="button" data-energy-reset>Put back the suggestions</button></div>
      </section>

      <section class="card" id="notes-settings">
        <h2>Notes</h2>
        <p class="muted">In any note, 📞 links a contact, 📝 links anything, ⚠️ links something important. Or just keep the emoji.</p>
        <label class="check-row"><input type="checkbox" name="spot_details"> Turn phone numbers and emails typed into notes into contacts (with Undo)</label>
        <div class="settings-grid">
          <label>Phone numbers without a country code are from<select name="phone_country"></select></label>
        </div>
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
        <h2>History</h2>
        <p class="muted">Every change on this device, newest first. Undo any of them individually, in any order.</p>
        <a class="seg-link" href="#/history">Open history</a>
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

      <section class="card" id="sync-card">
        <h2>Sync</h2>
        <div id="sync-body"></div>
      </section>

      <section class="card" id="exchange-card">
        <h2>Data exchange</h2>
        <p class="muted">Days from the Day Planner as plain text: each day's tasks (done and not done) with their notes, and the day's notes.</p>
        <div class="settings-grid">
          <label>From<input type="date" name="ex_from"></label>
          <label>To<input type="date" name="ex_to"></label>
        </div>
        <label class="check-row"><input type="checkbox" name="ex_links" checked> Include linked items (contacts, tasks…) as a numbered list at the end</label>
        <div class="backup-row">
          <button type="button" data-ex="copy">Copy to clipboard</button>
          <button type="button" data-ex="download">Download .txt</button>
        </div>
        <pre class="ex-preview" hidden></pre>
      </section>

      <section class="card">
        <h2>This device</h2>
        <dl class="facts">
          <dt>Device id</dt><dd><code>${store.getDeviceId()}</code></dd>
          <dt>Installed</dt><dd>${matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'Yes' : 'No, running in the browser'}</dd>
        </dl>
      </section>

      <section class="card danger-zone" id="erase-card">
        <h2>Clear and erase</h2>
        <p class="muted">These can't be undone. Back up first if you might want anything back.</p>
        <div class="backup-row">
          <button type="button" data-erase="drafts">Clear unsaved drafts</button>
          <button type="button" data-erase="history">Clear the undo history</button>
        </div>
        <div class="backup-row">
          <button type="button" class="danger" data-erase="all">Erase all data on this device…</button>
        </div>
        <p class="muted hint">Erasing removes every task, plan, note, contact, box and setting stored here. The app itself stays installed.</p>
      </section>
    `;

    // Home Screen: on an iPhone, an app not on the Home Screen can lose its data after 7 days.
    {
      const install = await import('../install.js');
      const box = el.querySelector('#install-body');
      const draw = async () => { box.innerHTML = await install.cardHtml(); };
      box.addEventListener('click', async ev => {
        const b = ev.target.closest('[data-install]');
        if (!b) return;
        if (b.dataset.install === 'how') box.querySelector('.install-steps').hidden = !box.querySelector('.install-steps').hidden;
        if (b.dataset.install === 'prompt') { await install.promptInstall(); draw(); }
      });
      await draw();
    }

    // Sync: sign in (or create the account on a fresh server), then it runs
    // by itself. Everything is encrypted on this device before it leaves.
    {
      const sync = await import('../sync.js');
      const box = el.querySelector('#sync-body');
      const ago = iso => {
        if (!iso) return 'not yet';
        const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
        return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(iso).toLocaleString();
      };
      const draw = async () => {
        const acct = sync.signedIn();
        const st = sync.status;
        if (acct) {
          box.innerHTML = `
            <p><b>Signed in</b> as ${acct.email} on <code>${acct.server.replace(/^https?:\/\//, '')}</code></p>
            <p class="muted" id="sync-line">${{ syncing: 'Syncing…', ok: `In sync · last ${ago(st.last)}`, offline: 'Offline: changes wait on this device and sync when the server is reachable (e.g. on the VPN)', error: `Couldn't sync: ${st.error}`, idle: 'Waiting to sync…' }[st.state] || ''}${st.pending ? ` · ${st.pending} change${st.pending === 1 ? '' : 's'} to send` : ''}</p>
            <div class="backup-row">
              <button type="button" class="primary" data-sync="now">Sync now</button>
              <button type="button" data-sync="devices">Devices</button>
              <button type="button" data-sync="pwform">Change password</button>
              <button type="button" data-sync="out">Sign out on this device</button>
            </div>
            <ul class="sync-devices" hidden></ul>
            <div class="sync-pw" hidden>
              <div class="settings-grid sync-form">
                <label>Current password<input name="oldpw" type="password" autocomplete="current-password" class="no-inline"></label>
                <label>New password<input name="newpw" type="password" autocomplete="new-password" class="no-inline"></label>
              </div>
              <div class="backup-row">
                <button type="button" class="primary" data-sync="pw">Change password</button>
                <span class="muted" id="sync-msg"></span>
              </div>
              <p class="muted hint">Your other devices are signed out and sign in again with the new password. Your data doesn't change.</p>
            </div>
            <p class="muted hint">Your data is encrypted on this device before it's sent; the server can't read it. Signing out keeps everything on this device.</p>`;
          return;
        }
        const remembered = (await store.getDeviceSettings()).server_url;
        box.innerHTML = `
          <p class="muted">Sync keeps your phone and laptop in step through your own server. Everything is encrypted here first; the server only stores scrambled copies.</p>
          <div class="settings-grid sync-form">
            <label class="wide">Server<input name="server" value="${remembered || ''}" placeholder="https://your-server" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" class="no-inline"></label>
            <label>Email<input name="email" type="email" autocomplete="username" class="no-inline"></label>
            <label>Password<input name="password" type="password" autocomplete="current-password" class="no-inline"></label>
          </div>
          <div class="backup-row">
            <button type="button" class="primary" data-sync="in">Sign in</button>
            <button type="button" data-sync="create" hidden>Create account</button>
            <button type="button" data-sync="forgot">Forgot password?</button>
            <span class="muted" id="sync-msg"></span>
          </div>
          <details class="trust-help" hidden>
            <summary>Trust this server (home servers with their own certificate)</summary>
            <p class="muted">A server at home makes its own security certificate, so each device has to trust it once. Open <a class="trust-link" target="_blank" rel="noopener">the certificate</a> on the device, then follow the steps for it. (A server with a proper web address doesn't need this.)</p>
            <ul class="trust-steps">
              <li><b>iPhone / iPad:</b> open the link in <b>Safari</b> (not another app) and allow the download. Then Settings → Profile Downloaded → Install. Then Settings → General → About → Certificate Trust Settings → switch it on.</li>
              <li><b>Android:</b> download it, then Settings → Security → Encryption &amp; credentials → Install a certificate → CA certificate.</li>
              <li><b>Windows:</b> download it, double-click → Install Certificate → Local Machine → "Trusted Root Certification Authorities". Restart the browser.</li>
              <li><b>Mac:</b> download it, double-click → Keychain Access; open it, choose Trust → "Always Trust".</li>
            </ul>
            <p class="muted">Then reload this page and check the address again.</p>
          </details>
          <div class="sync-recover" hidden>
            <p class="muted">Enter your email above, the recovery code you saved when you made the account, and a new password. Your other devices are signed out.</p>
            <div class="settings-grid sync-form">
              <label class="wide">Recovery code<input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" class="no-inline"></label>
              <label>New password<input name="newpw" type="password" autocomplete="new-password" class="no-inline"></label>
            </div>
            <div class="backup-row"><button type="button" class="primary" data-sync="recover">Set new password</button></div>
          </div>`;
        const serverInput = box.querySelector('[name="server"]');
        const check = () => {
          const server = serverInput.value.trim();
          const create = box.querySelector('[data-sync="create"]');
          const note = box.querySelector('#sync-msg');
          const help = box.querySelector('.trust-help');
          create.hidden = true;
          help.hidden = true;
          note.textContent = '';
          if (!/^https?:\/\/.+/i.test(server)) return;
          sync.serverInfo(server).then(info => {
            create.hidden = info.registration !== 'open';
            note.textContent = info.registration === 'open' ? 'This server has no account yet: create yours.' : '';
          }).catch(() => {
            note.textContent = "Can't reach the server from here (VPN on, and its certificate trusted?)";
            try {
              const host = new URL(server).hostname;
              help.querySelector('.trust-link').href = `http://${host}/sift-ca.crt`;
              help.hidden = false;
            } catch { /* not a web address yet */ }
          });
        };
        serverInput.addEventListener('change', check);
        check();
      };
      sync.onStatus(() => { if (el.isConnected) draw(); });
      box.addEventListener('click', async ev => {
        const b = ev.target.closest('[data-sync]');
        if (!b) return;
        const what = b.dataset.sync;
        const val = n => box.querySelector(`[name="${n}"]`)?.value.trim();
        const msg = t => { const m = box.querySelector('#sync-msg'); if (m) m.textContent = t; };
        try {
          if (what === 'now') return sync.syncNow();
          if (what === 'out') {
            if (!confirm('Sign out of sync on this device? Everything stays on this device; it just stops syncing.')) return;
            await sync.signOut();
            return draw();
          }
          if (what === 'devices') {
            const ul = box.querySelector('.sync-devices');
            ul.hidden = !ul.hidden;
            if (!ul.hidden) ul.innerHTML = (await sync.devices()).map(d => `<li>${d.name}${d.this ? ' <span class="muted">(this one)</span>' : ''} <span class="muted">· last seen ${ago(d.last_seen)}</span></li>`).join('');
            return;
          }
          if (what === 'pwform') { const f = box.querySelector('.sync-pw'); f.hidden = !f.hidden; return; }
          if (what === 'pw') {
            const oldpw = box.querySelector('[name="oldpw"]').value;
            const newpw = box.querySelector('[name="newpw"]').value;
            if (!oldpw || !newpw) return msg('Enter your current and new password');
            if (newpw.length < 10) return msg('Use at least 10 characters');
            b.disabled = true;
            msg('Changing…');
            await sync.changePassword(oldpw, newpw);
            toast('Password changed');
            return draw();
          }
          if (what === 'forgot') { const f = box.querySelector('.sync-recover'); f.hidden = !f.hidden; return; }
          const server = val('server');
          const email = val('email');
          if (what === 'recover') {
            const newpw = box.querySelector('[name="newpw"]').value;
            if (!server || !email || !val('code') || !newpw) return msg('Enter the server, your email, the recovery code and a new password');
            if (newpw.length < 10) return msg('Use at least 10 characters');
            b.disabled = true;
            msg('Setting your new password…');
            await sync.recover(server, email, val('code'), newpw);
            await sync.start();
            toast('New password set');
            return draw();
          }
          const password = box.querySelector('[name="password"]').value;
          if (!email || !password) return msg('Enter your email and password');
          if (what === 'create') {
            if (password.length < 10) return msg('Use at least 10 characters');
            b.disabled = true;
            msg('Creating your account and keys…');
            const code = await sync.register(server, email, password);
            box.innerHTML = `
              <p><b>Account created.</b> This is your <b>recovery code</b>. If you ever forget your password, it is the only way to get your data back. Nobody (not even the server) can reset it for you.</p>
              <pre class="recovery-code">${code}</pre>
              <div class="backup-row">
                <button type="button" data-copy-code>Copy</button>
                <label class="check-row"><input type="checkbox" id="code-saved"> I've saved it somewhere safe</label>
                <button type="button" class="primary" id="code-done" disabled>Start syncing</button>
              </div>`;
            box.querySelector('[data-copy-code]').onclick = () => navigator.clipboard.writeText(code).then(() => toast('Copied'));
            box.querySelector('#code-saved').onchange = e => { box.querySelector('#code-done').disabled = !e.target.checked; };
            box.querySelector('#code-done').onclick = async () => { await sync.start(); draw(); };
            return;
          }
          b.disabled = true;
          msg('Signing in…');
          await sync.signIn(server, email, password);
          await sync.start();
          draw();
        } catch (e) {
          b.disabled = false;
          msg(e instanceof TypeError ? "Can't reach the server from here (VPN on?)" : e.message);
        }
      });
      draw();
    }

    // Data exchange: days as plain text
    {
      const card = el.querySelector('#exchange-card');
      const { isoDate, addDays } = await import('../days.js');
      card.querySelector('[name="ex_from"]').value = addDays(isoDate(), -6);
      card.querySelector('[name="ex_to"]').value = isoDate();
      card.addEventListener('click', async ev => {
        const b = ev.target.closest('[data-ex]');
        if (!b) return;
        const from = card.querySelector('[name="ex_from"]').value;
        const to = card.querySelector('[name="ex_to"]').value;
        if (!from || !to) return toast('Pick the days first');
        const { daysAsText } = await import('../exporttext.js');
        const text = await daysAsText(from, to, { links: card.querySelector('[name="ex_links"]').checked });
        const pre = card.querySelector('.ex-preview');
        pre.textContent = text;
        pre.hidden = false;
        if (b.dataset.ex === 'copy') {
          try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { toast("Couldn't copy: the browser blocked the clipboard. The text is shown below."); }
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
          a.download = `sift-days-${from}${to !== from ? `-to-${to}` : ''}.txt`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }
      });
    }

    // Clear and erase
    el.querySelector('#erase-card').addEventListener('click', async ev => {
      const b = ev.target.closest('[data-erase]');
      if (!b) return;
      const kind = b.dataset.erase;
      const siftKeys = prefix => { try { return Object.keys(localStorage).filter(k => k.startsWith(prefix)); } catch { return []; } };
      if (kind === 'drafts') {
        const keys = siftKeys('sift:draft:');
        if (!keys.length) return toast('No unsaved drafts');
        if (!confirm(`Clear ${keys.length} unsaved draft${keys.length === 1 ? '' : 's'} (text typed into "add" boxes but not added)?`)) return;
        keys.forEach(k => localStorage.removeItem(k));
        toast('Drafts cleared');
      } else if (kind === 'history') {
        if (!confirm('Clear the undo history? Your data stays; you just can\'t undo past changes any more.')) return;
        await store.clearHistory();
        toast('Undo history cleared');
      } else if (kind === 'all') {
        const typed = prompt('⚠️ ERASE ALL DATA ON THIS DEVICE ⚠️\n\nThis deletes every task, plan, note, contact, box, list and setting stored here. It cannot be undone.\n\nIf you use Sync: this only clears THIS device and signs it out of Sync. Your server and other devices keep their copies (sign in again to get it all back), but anything not yet synced is lost.\n\nBack up first if you might want it.\n\nType DELETE (in capitals) to erase everything:');
        if (typed === null) return;
        if (typed.trim() !== 'DELETE') return toast('Not erased: you have to type DELETE exactly');
        await store.eraseAll();
        [...siftKeys('sift:'), ...siftKeys('sift-')].forEach(k => localStorage.removeItem(k));
        location.hash = '#/';
        location.reload();
      }
    });

    // Notes: spotting numbers and emails
    const ns = el.querySelector('#notes-settings');
    {
      const { COUNTRIES, spotSettings } = await import('../refs.js');
      const cur = await spotSettings();
      const sel = ns.querySelector('[name="phone_country"]');
      sel.innerHTML = [...COUNTRIES].sort((a, b) => a[1].localeCompare(b[1])).map(([cc, name]) => `<option value="${cc}">${name} (+${cc})</option>`).join('');
      sel.value = cur.phone_country;
      ns.querySelector('[name="spot_details"]').checked = cur.spot_details;
      ns.addEventListener('change', async ev => {
        const t = ev.target;
        await store.updateSettings({ [t.name]: t.type === 'checkbox' ? t.checked : t.value });
        toast('✓ Saved');
      });
    }

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
      ps.querySelector('[name="duration_max_min"]').value = String(d.duration_max_min);
      ps.querySelector('[name="hint_down_day"]').checked = d.hint_down_day;
      ps.querySelector('[name="show_now_marker"]').checked = d.show_now_marker;
      ps.querySelector('[name="show_evening"]').checked = d.show_evening;
      ps.querySelector('[name="evening_label"]').value = d.evening_label;
      ps.querySelector('[name="hint_walk_breaks"]').checked = d.hint_walk_breaks;
      for (const b of ps.querySelectorAll('[data-dow]')) b.setAttribute('aria-pressed', d.down_days.includes(Number(b.dataset.dow)));
    };
    ps.addEventListener('change', async ev => {
      const t = ev.target;
      if (t.name === 'evening_label') {
        // Cleared = back to the default name.
        await store.updateSettings({ evening_label: t.value.trim() || null });
        if (!t.value.trim()) drawPlanner();
        toast('✓ Saved');
        return;
      }
      const value = t.type === 'checkbox' ? t.checked : ['slot_min', 'duration_max_min'].includes(t.name) ? Number(t.value) : t.value;
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

    // Energy levels: what each one means to you.
    {
      const card = el.querySelector('#energy-settings');
      const days = await import('../days.js');
      const draw = async () => {
        await days.applyEnergyMeanings();
        for (const e of days.ENERGY) card.querySelector(`[name="energy_${e.id}"]`).value = e.hint;
      };
      card.addEventListener('change', async ev => {
        const t = ev.target;
        if (!t.name?.startsWith('energy_')) return;
        const id = t.name.slice(7);
        const text = t.value.trim();
        await store.updateSettings({ [t.name]: !text || text === days.ENERGY_DEFAULTS[id] ? null : text });
        await draw();
        toast('✓ Saved');
      });
      card.addEventListener('click', async ev => {
        if (!ev.target.closest('[data-energy-reset]')) return;
        await store.updateSettings({ energy_low: null, energy_medium: null, energy_high: null });
        await draw();
        toast('✓ Back to the suggestions');
      });
      await draw();
    }

    // Text size: kept on this device, applied before first paint (index.html).
    const sizeBox = el.querySelector('#text-size');
    const paintSize = () => {
      let cur = '100';
      try { cur = localStorage.getItem('sift-text-size') || '100'; } catch { /* default */ }
      for (const b of sizeBox.querySelectorAll('button')) b.setAttribute('aria-pressed', String(Number(b.dataset.size) === Number(cur)));
    };
    paintSize();
    sizeBox.addEventListener('click', ev => {
      const b = ev.target.closest('[data-size]');
      if (!b) return;
      try { b.dataset.size === '100' ? localStorage.removeItem('sift-text-size') : localStorage.setItem('sift-text-size', b.dataset.size); } catch { /* not kept */ }
      document.documentElement.style.fontSize = b.dataset.size === '100' ? '' : `${b.dataset.size}%`;
      paintSize();
      toast('✓ Text size changed');
    });

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
      const n = Object.entries(made.counts).filter(([k]) => k !== 'settings' && k !== 'files').reduce((a, [, v]) => a + v, 0);
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
