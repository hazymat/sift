import { sortable } from '../sortable.js';
import { toast } from '../toast.js';
import { ask, askText, askYes } from '../ask.js';
import { word } from '../words.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

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
    const { versionText } = await import('../version.js');
    el.innerHTML = `
      <section class="card" id="install-card">
        <p class="muted app-version">Sift ${versionText()}</p>
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
        <p class="muted">${esc(word('ph_set_size'))}</p>
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
        <p class="muted">${esc(word('ph_set_down'))}</p>
        <div class="segmented" id="down-days">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, n) => `<button type="button" data-dow="${(n + 1) % 7}">${d}</button>`).join('')}</div>
        <h3>Nudges</h3>
        <label class="check-row"><input type="checkbox" name="show_now_marker"> Show a ▶ in the margin at the current time</label>
        <label class="check-row"><input type="checkbox" name="show_evening"> Show a section after the day ends, called <input name="evening_label" class="inline-text" placeholder="${esc(word('ph_set_evening'))}" autocomplete="off" aria-label="Name of the section after the day ends"></label>
        <label class="check-row"><input type="checkbox" name="hint_down_day"> Remind me to do less on down days</label>
        <label class="check-row"><input type="checkbox" name="hint_walk_breaks"> Build in short breaks during long stretches of work <span class="muted">(with the focus timer, coming later)</span></label>
      </section>

      <section class="card" id="words-card">
        <h2>Your words</h2>
        <p class="muted">${esc(word('ph_set_words'))}</p>
        <div class="backup-row">
          <button type="button" data-words="dict">Dictionary…</button>
          <button type="button" data-words="types">Brain Dump types…</button>
        </div>
      </section>

      <section class="card" id="notes-settings">
        <h2>Notes</h2>
        <p class="muted">${esc(word('ph_set_notes'))}</p>
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
        <p class="muted hint">${esc(word('ph_set_backup'))}</p>
      </section>

      <section class="card">
        <h2>History</h2>
        <p class="muted">${esc(word('ph_set_history'))}</p>
        <a class="seg-link" href="#/history">Open history</a>
      </section>

      <section class="card">
        <h2>Archive &amp; Bin</h2>
        <p class="muted">${esc(word('ph_set_bin'))}</p>
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
        <p class="muted">${esc(word('ph_set_exchange'))}</p>
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
        <p class="muted">${esc(word('ph_set_clear'))}</p>
        <div class="backup-row">
          <button type="button" data-erase="drafts">Clear unsaved drafts</button>
          <button type="button" data-erase="history">Clear the undo history</button>
        </div>
        <div class="backup-row">
          <button type="button" class="danger" data-erase="all">Erase all data on this device…</button>
        </div>
        <p class="muted hint">${esc(word('ph_set_erase'))}</p>
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
      // Draws can overlap (status changes while one is waiting): only the latest one writes.
      let drawing = 0;
      const draw = async () => {
        const mine = ++drawing;
        await sync.ready;
        if (mine !== drawing) return;
        const acct = sync.signedIn();
        const st = sync.status;
        if (acct) {
          box.innerHTML = `
            <p><b>Signed in</b> as ${acct.email} on <code>${acct.server.replace(/^https?:\/\//, '')}</code></p>
            <p class="muted" id="sync-line">${{ syncing: 'Syncing…', ok: `In sync · last ${ago(st.last)}`, offline: 'Offline: changes wait on this device and sync when the server can be reached', error: `Couldn't sync: ${st.error}`, idle: 'Waiting to sync…' }[st.state] || ''}${st.pending ? ` · ${st.pending} change${st.pending === 1 ? '' : 's'} to send` : ''}</p>
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
              <p class="muted hint">${esc(word('ph_sync_pw'))}</p>
            </div>
            <p class="muted hint">${esc(word('ph_sync_signed_in'))}</p>`;
          return;
        }
        const remembered = (await store.getDeviceSettings()).server_url;
        if (mine !== drawing) return;
        if (sync.signedIn()) return draw();
        box.innerHTML = `
          <p class="sync-out-reason" hidden></p>
          <p class="muted">${esc(word('ph_sync_intro'))}</p>
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
          <div class="trust-cert" hidden>
            <p class="muted">${esc(word('ph_sync_cert'))}</p>
            <div class="trust-row">
              <a class="button trust-link" target="_blank" rel="noopener">Get the certificate</a>
              <code class="trust-url"></code>
              <button type="button" data-sync="copy-cert">Copy</button>
            </div>
          </div>
          <details class="trust-help" hidden>
            <summary>Trust this server: the steps for each device</summary>
            <ul class="trust-steps">
              <li><b>iPhone / iPad:</b> open the certificate address in <b>Safari</b> (not another app; copy it and paste it into Safari's address bar) and allow the download. Then Settings → Profile Downloaded → Install. Then Settings → General → About → Certificate Trust Settings → switch it on. <b>After an iOS update, check that switch again</b>: it can be turned off, and then the app can't reach the server.</li>
              <li><b>Android:</b> download it, then Settings → Security → Encryption &amp; credentials → Install a certificate → CA certificate.</li>
              <li><b>Windows:</b> download it, double-click → Install Certificate → Local Machine → "Trusted Root Certification Authorities". Restart the browser.</li>
              <li><b>Mac:</b> download it, double-click → Keychain Access; open it, choose Trust → "Always Trust".</li>
            </ul>
            <p class="muted">${esc(word('ph_sync_cert_then'))}</p>
          </details>
          <div class="sync-recover" hidden>
            <p class="muted">${esc(word('ph_sync_recover'))}</p>
            <div class="settings-grid sync-form">
              <label class="wide">Recovery code<input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" class="no-inline"></label>
              <label>New password<input name="newpw" type="password" autocomplete="new-password" class="no-inline"></label>
            </div>
            <div class="backup-row"><button type="button" class="primary" data-sync="recover">Set new password</button></div>
          </div>`;
        const reason = box.querySelector('.sync-out-reason');
        if (st.error) { reason.textContent = st.error; reason.hidden = false; }
        const serverInput = box.querySelector('[name="server"]');
        const check = () => {
          const server = serverInput.value.trim();
          const create = box.querySelector('[data-sync="create"]');
          const note = box.querySelector('#sync-msg');
          const help = box.querySelector('.trust-help');
          create.hidden = true;
          const cert = box.querySelector('.trust-cert');
          help.hidden = true;
          help.open = false;
          cert.hidden = true;
          note.textContent = '';
          if (!/^https?:\/\/.+/i.test(server)) return;
          // The certificate's address, from what was typed, shown as soon as there is one.
          try {
            const url = `http://${new URL(server).hostname}/sift-ca.crt`;
            cert.querySelector('.trust-link').href = url;
            cert.querySelector('.trust-url').textContent = url;
            cert.hidden = false;
            help.hidden = false;
          } catch { /* not a web address yet */ }
          sync.serverInfo(server).then(info => {
            create.hidden = info.registration !== 'open';
            note.textContent = info.registration === 'open' ? 'This server has no account yet: create yours.' : '';
          }).catch(() => {
            note.textContent = "Can't reach the server from here (on the right network, and its certificate trusted?)";
            help.open = true;
          });
        };
        serverInput.addEventListener('change', check);
        serverInput.addEventListener('input', () => { clearTimeout(serverInput._t); serverInput._t = setTimeout(check, 600); });
        box.querySelector('[data-sync="copy-cert"]').addEventListener('click', async () => {
          const url = box.querySelector('.trust-url').textContent;
          try { await navigator.clipboard.writeText(url); toast('Copied: paste it into Safari'); } catch { toast(url); }
        });
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
            if (!await askYes('Sign out of sync on this device?', { text: 'Everything stays on this device; it just stops syncing.', ok: 'Sign out' })) return;
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
          msg(e instanceof TypeError ? "Can't reach the server from here (on the right network?)" : e.message);
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
        if (!await askYes(`Clear ${keys.length} unsaved draft${keys.length === 1 ? '' : 's'}?`, { text: 'Text typed into "add" boxes but not added.', ok: 'Clear', danger: true })) return;
        keys.forEach(k => localStorage.removeItem(k));
        toast('Drafts cleared');
      } else if (kind === 'history') {
        if (!await askYes('Clear the undo history?', { text: "Your data stays; you just can't undo past changes any more.", ok: 'Clear', danger: true })) return;
        await store.clearHistory();
        toast('Undo history cleared');
      } else if (kind === 'all') {
        const typed = await askText('⚠️ Erase all data on this device', { text: 'This deletes every task, plan, note, contact, box, list and setting stored here. It cannot be undone.\n\nIf you use Sync: this only clears THIS device and signs it out of Sync. Your server and other devices keep their copies (sign in again to get it all back), but anything not yet synced is lost.\n\nBack up first if you might want it.', label: 'Type DELETE (in capitals) to erase everything', ok: 'Erase everything' });
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

    // Your words: the Dictionary and the Brain Dump types, each in a sheet.
    el.querySelector('#words-card').addEventListener('click', async ev => {
      const b = ev.target.closest('[data-words]');
      if (!b) return;
      const w = await import('../words.js');
      await w.applyWords();
      const dlg = document.createElement('dialog');
      dlg.className = 'sheet words-sheet';
      document.body.append(dlg);
      dlg.addEventListener('close', () => dlg.remove());
      if (b.dataset.words === 'dict') {
        // Every word, grouped, with a hint and "Reset to default".
        // Each word or phrase: the text itself (edit it in place) and its reset
        // button, with a small grey line under it saying what it is and where it shows. Changed ones are marked.
        const row = x => `
          <div class="dict-row${w.isCustom(x.key) ? ' custom' : ''}" data-key="${esc(x.key)}" data-find="${esc(`${x.default} ${w.word(x.key)} ${x.hint} ${x.group}`.toLowerCase())}">
            <input data-word="${esc(x.key)}" value="${esc(w.word(x.key))}" aria-label="${esc(x.default)}" title="Default: ${esc(x.default)}" autocomplete="off">
            <button type="button" class="icon-btn small dict-reset" data-reset="${esc(x.key)}" aria-label="Reset to default" title="Reset to default: ${esc(x.default)}" ${w.isCustom(x.key) ? '' : 'disabled'}><svg class="icon" aria-hidden="true"><use href="#i-reset"/></svg></button>
            <p class="dict-hint"><svg class="icon" aria-hidden="true"><use href="#i-info"/></svg><span>${esc(x.hint)}</span></p>
          </div>`;
        const groups = [...new Set(w.WORDS.map(x => x.group))];
        dlg.innerHTML = `<div class="sheet-handle"></div><h2>Dictionary</h2>
          <p class="muted">${esc(word('ph_set_dictionary'))}</p>
          <input type="search" class="search dict-search" placeholder="Find a word or phrase…" autocomplete="off">
          ${groups.map(g => `<section class="dict-group"><h3 class="milestone">${esc(g)}</h3>${w.WORDS.filter(x => x.group === g).map(row).join('')}</section>`).join('')}`;
        const mark = key => {
          const r = dlg.querySelector(`.dict-row[data-key="${key}"]`);
          r.classList.toggle('custom', w.isCustom(key));
          r.querySelector('[data-reset]').disabled = !w.isCustom(key);
        };
        dlg.addEventListener('input', e2 => {
          if (!e2.target.matches('.dict-search')) return;
          const words = e2.target.value.toLowerCase().split(/\s+/).filter(Boolean);
          for (const r of dlg.querySelectorAll('.dict-row')) r.hidden = !words.every(x => r.dataset.find.includes(x));
          for (const g of dlg.querySelectorAll('.dict-group')) g.hidden = ![...g.querySelectorAll('.dict-row')].some(r => !r.hidden);
        });
        dlg.addEventListener('change', async e2 => {
          const key = e2.target.dataset?.word;
          if (!key) return;
          await w.setWord(key, e2.target.value);
          if (!e2.target.value.trim()) e2.target.value = w.word(key); // emptied: the default comes back
          mark(key);
          toast('✓ Saved');
        });
        dlg.addEventListener('click', async e2 => {
          const r = e2.target.closest('[data-reset]');
          if (!r) return;
          await w.setWord(r.dataset.reset, '');
          dlg.querySelector(`[data-word="${r.dataset.reset}"]`).value = w.word(r.dataset.reset);
          mark(r.dataset.reset);
          toast('✓ Back to the default');
        });
      } else {
        // Brain Dump types: add, rename, move, remove. They are labels for filtering only.
        let list = w.dumpTypes().map(t => ({ ...t }));
        const save = async () => { await w.setDumpTypes(list); draw(); };
        const draw = () => {
          dlg.innerHTML = `<div class="sheet-handle"></div><h2>Brain Dump types</h2>
            <p class="muted">${esc(word('ph_set_types'))}</p>
            <ul class="types-list">${list.map((t, n) => `
              <li data-n="${n}">
                <input data-type-label value="${esc(t.label)}" aria-label="Type name" autocomplete="off">
                <button type="button" class="icon-btn small" data-type="up" ${n ? '' : 'disabled'} aria-label="Move up">↑</button>
                <button type="button" class="icon-btn small" data-type="down" ${n < list.length - 1 ? '' : 'disabled'} aria-label="Move down">↓</button>
                <button type="button" class="icon-btn small" data-type="remove" ${list.length > 1 ? '' : 'disabled'} aria-label="Remove">×</button>
              </li>`).join('')}
            </ul>
            <form class="types-add"><input name="new" placeholder="${esc(word('ph_set_new_type'))}" autocomplete="off"><button type="submit">Add</button></form>
            <div class="backup-row"><button type="button" data-type="defaults">Put back the defaults</button></div>`;
        };
        draw();
        dlg.addEventListener('change', async e2 => {
          if (!e2.target.matches('[data-type-label]')) return;
          const n = Number(e2.target.closest('li').dataset.n);
          const label = e2.target.value.trim();
          if (!label) { e2.target.value = list[n].label; return; }
          list[n].label = label;
          await save();
          toast('✓ Saved');
        });
        dlg.addEventListener('click', async e2 => {
          const act = e2.target.closest('[data-type]')?.dataset.type;
          if (!act) return;
          if (act === 'defaults') { list = w.DEFAULT_TYPES.map(t => ({ ...t })); await save(); toast('✓ Back to the defaults'); return; }
          const n = Number(e2.target.closest('li').dataset.n);
          if (act === 'up' && n > 0) [list[n - 1], list[n]] = [list[n], list[n - 1]];
          if (act === 'down' && n < list.length - 1) [list[n + 1], list[n]] = [list[n], list[n + 1]];
          if (act === 'remove' && list.length > 1) list.splice(n, 1);
          await save();
        });
        dlg.addEventListener('submit', async e2 => {
          e2.preventDefault();
          const label = e2.target.elements.new.value.trim();
          if (!label) return;
          const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'type';
          const id = list.some(t => t.id === slug) ? `${slug}_${Math.random().toString(36).slice(2, 6)}` : slug;
          list.push({ id, label });
          await save();
          dlg.querySelector('.types-add input')?.focus();
        });
      }
      dlg.showModal();
    });

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
        const r = await ask({ title: 'Lock this backup', text: "You'll need the passphrase to restore it. It can't be recovered.", ok: 'Make the backup', fields: [{ name: 'a', label: 'Passphrase', type: 'password' }, { name: 'b', label: 'Type it again', type: 'password' }] });
        if (!r?.a) return;
        if (r.a !== r.b) { toast("Passphrases didn't match"); return; }
        passphrase = r.a;
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
          const pass = await askText('This backup is locked', { label: 'Passphrase', type: 'password', ok: 'Open it' });
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
    const install = await import('../install.js');
    let persisted = await navigator.storage?.persisted?.();
    if (!persisted) { try { persisted = await navigator.storage?.persist?.(); } catch { /* not supported */ } } // ask again
    // Only an iPhone/iPad is at real risk (7 days); elsewhere the browser rarely clears a site's data.
    const protection = persisted ? 'Yes'
      : install.isIOS() ? '⚠️ No. Add Sift to your Home Screen (see the top of this page) to protect your data.'
      : "Not guaranteed. Your browser could clear this site's data if the computer ran very low on space (it rarely does). Sync or a backup covers you; installing Sift as an app (browser menu → Install) also helps.";
    storage.innerHTML = `
      <dt>Used</dt><dd>${formatBytes(est?.usage)}</dd>
      <dt>Available</dt><dd>${formatBytes(est?.quota)}</dd>
      <dt>Protected from clean-up</dt><dd>${protection}</dd>
      <dt>Unsynced changes</dt><dd>${await store.outboxSize()}</dd>
    `;
  },
};
