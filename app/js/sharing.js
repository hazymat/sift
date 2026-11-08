// Sharing with other people on your server (sync.js does the work): the sheet
// that shares something and shows who has it, invitations, and the note that
// says when someone else's things are on screen.
//
// What others share lives in a space of its own on this device (store.js), so
// it never mixes with your own: each area shows it apart ("Shared with me").

import * as sync from './sync.js';
import * as store from './store.js';
import { toast } from './toast.js';
import { ask, askYes } from './ask.js';
import { flash } from './flash.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const personName = sync.personName;
const KIND_WORDS = { list: 'a list', note: 'a note', recipe: 'a recipe', project: 'a project', days: 'their diary', book: 'a book' };
// A Batch Book book ({ kind: 'book', id: its name, or '*' for every book }), in words: "their "Brewing" book", "their whole Batch Book".
export const bookWords = (info, whose = 'their') => (info.id === '*' ? `${whose} whole Batch Book` : `${whose} "${info.name || 'No book'}" book`);
// What someone shares with you, in words: "their day plan (28 Sep to 4 Oct)", "a list, "Shopping"", "their whole Batch Book".
const theirThing = (info, comma = false) => (info.kind === 'days' ? `their day plan (${scopeText(info)})` : info.kind === 'book' ? bookWords(info) : `${KIND_WORDS[info.kind]}, ${scopeText(info)}${comma ? ',' : ''}`);
// The Batch Book (a book, or a recipe) is read-only for the people it's shared with.
const readOnly = info => info.kind === 'book' || info.kind === 'recipe';
const sameScope = (a, b) => a.kind === b.kind && (a.kind === 'days' ? a.from === b.from && a.to === b.to : a.id === b.id);
const fmtDate = d => new Date(`${d}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

// What a share holds, in words: "Shopping List", "Sat 28 Sep", "28 Sep to 4 Oct", "all days".
export function scopeText(info) {
  if (info.kind !== 'days') return `"${info.name || 'Untitled'}"`;
  if (!info.from && !info.to) return 'all days';
  return info.from === info.to ? fmtDate(info.from) : `${fmtDate(info.from)} to ${fmtDate(info.to)}`;
}

// Your name as people you share with see it: from Settings → Sync, and asked
// before you share or accept while none is set. → true to go ahead (saved, or
// skipped: they see the start of your email), false when closed.
export async function askName({ before = false } = {}) {
  let names = await sync.myProfile();
  let error = '';
  const fallback = sync.emailName(sync.signedIn()?.email);
  for (;;) {
    const answer = await ask({
      title: before ? 'First, your name' : 'Your name',
      text: `This is how people you share with see you, on shared things and invitations, so they know it's you. All optional: without a name they see "${fallback}", from your email.`,
      fields: [{ name: 'first_name', label: 'First name', value: names.first_name }, { name: 'last_name', label: 'Last name', value: names.last_name }, { name: 'user_name', label: 'Username (no one else on your server can have it)', value: names.username }],
      ok: before ? 'Save and carry on' : 'Save', skip: before ? `Carry on as ${fallback}` : '', error,
    });
    if (answer === null) return false;
    if (answer === 'skip') return true;
    const picked = { first_name: answer.first_name, last_name: answer.last_name, username: answer.user_name }; // not "username": password managers fill that in
    try { await sync.saveProfile(picked); toast(`People you share with see you as ${personName(sync.signedIn()?.email)}`); return true; } catch (e) { error = e.message; names = picked; }
  }
}
const nameFirst = async () => { await sync.myProfile(); return sync.hasName() || !sync.namesWork() || askName({ before: true }); };

// Your own share of this thing (null if it isn't shared).
export const myShare = info => sync.sharesNow().find(sh => sh.mine && sameScope(sh.info, info)) || null;
// Who else has it: "Anna", "Anna and Bob".
export function sharedWithText(info) {
  const names = (myShare(info)?.members || []).filter(m => m.user_id !== sync.myUserId()).map(m => personName(m.email));
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] || '';
}
// Your answers to invitations (settings.share_answers, synced): { share id: 'later' | 'declined' }. Later (Not now): still
// waiting, off the bottom bar. Declined (Decline, or Undo after Accept): left as it is on the server (so it can be accepted
// again any time from Shared with me), and nothing of it shows here. None: waiting on the bottom bar, or accepted.
let answers = {};
export const answerOf = id => answers[id] || '';
const loadAnswers = async () => { answers = (await store.getSettings()).share_answers || {}; };
async function answer(id, value) {
  answers = Object.assign({}, answers);
  if (value) answers[id] = value; else delete answers[id];
  await store.updateSettings({ share_answers: answers });
  sync.nudgeShares();
}
// Shares from other people that you accepted (and didn't decline since), of these kinds.
export const fromOthers = kinds => sync.sharesNow().filter(sh => !sh.mine && sh.accepted && answers[sh.id] !== 'declined' && kinds.includes(sh.info?.kind));
// People sharing these kinds with you: [{ owner_id, name, shares }].
export function people(kinds) {
  const out = new Map();
  for (const sh of fromOthers(kinds)) {
    if (!out.has(sh.owner_id)) out.set(sh.owner_id, { owner_id: sh.owner_id, name: personName(sh.owner_email), shares: [] });
    out.get(sh.owner_id).shares.push(sh);
  }
  return [...out.values()];
}

// Invitations waiting for you, of these kinds: Accept or Decline.
// Invitations are answered on the bottom bar or in Shared with me (views/shared.js), no longer in each area.
export const invitesHtml = () => '';

// ---------- invitations: the bottom bar, Accept / Decline / Not now, Undo and Take me there ----------
const shareOf = id => sync.sharesNow().find(x => x.id === id);
// "Anna wants to share their "Cooking" book with you, to read and copy from."
export const inviteText = sh => `<b>${esc(personName(sh.owner_email))}</b> wants to share ${esc(theirThing(sh.info))} with you${readOnly(sh.info) ? ', to read and copy from' : ''}.`;
// What a share is, from either side, in words: "Anna's "Cooking" book", "your list, "Shopping"".
export const whatText = sh => (sh.mine ? (sh.info.kind === 'book' ? bookWords(sh.info, 'your') : sh.info.kind === 'days' ? `your day plan (${scopeText(sh.info)})` : `your ${sh.info.kind}, ${scopeText(sh.info)}`)
  : sh.info.kind === 'book' ? bookWords(sh.info, `${personName(sh.owner_email)}'s`) : sh.info.kind === 'days' ? `${personName(sh.owner_email)}'s day plan (${scopeText(sh.info)})` : `${personName(sh.owner_email)}'s ${sh.info.kind}, ${scopeText(sh.info)}`);
export const AREA_WORDS = { list: 'Lists', note: 'Brain Dump', recipe: 'Batch Book', book: 'Batch Book', project: 'Tasks', days: 'Day Planner' };
export const waitingNow = () => sync.sharesNow().filter(sh => !sh.mine && !sh.accepted && answers[sh.id] !== 'declined');

// Accept (from the bar, or again in Shared with me): Undo, and Take me there (it's shown, pulsing).
export async function acceptInvite(id) {
  const sh = shareOf(id), was = answerOf(id);
  if (!sh) return;
  if (!sh.accepted && !await nameFirst()) return;
  if (!sh.accepted) await sync.acceptShare(id);
  await answer(id, null);
  toast(`Accepted ${whatText(sh)}`, { action: 'Undo', onAction: async () => { await answer(id, 'declined'); toast('Not accepted: accept it any time in Shared with me'); }, more: { label: 'Take me there', onAction: () => takeMeThere(id) }, ms: 12000 });
  return was;
}
export async function declineInvite(id) {
  const sh = shareOf(id), was = answerOf(id);
  if (!sh) return;
  await answer(id, 'declined');
  toast(`Declined ${whatText(sh)}: you can still accept it in Shared with me`, { action: 'Undo', onAction: () => answer(id, was || null), ms: 8000 });
}
export async function laterInvite(id) {
  await answer(id, 'later');
  toast('Kept for later: it waits in Shared with me', { action: 'Undo', onAction: () => answer(id, null), more: { label: 'Shared with me', onAction: () => { location.hash = '#/shared'; } }, ms: 8000 });
}

// The bar at the bottom: the first invitation still waiting (not Not now), until it's answered. No timeout.
function drawBar() {
  const waiting = waitingNow().filter(sh => !answers[sh.id]);
  let bar = document.getElementById('share-banner');
  if (!waiting.length) { bar?.remove(); return; }
  if (!bar) { bar = Object.assign(document.createElement('div'), { id: 'share-banner', className: 'banner share-banner' }); bar.setAttribute('role', 'status'); document.body.append(bar); }
  const sh = waiting[0];
  bar.innerHTML = `<span class="share-banner-words">👥 ${inviteText(sh)}${waiting.length > 1 ? ` <span class="muted">${waiting.length - 1} more waiting</span>` : ''}</span>
    <span class="share-banner-acts"><button type="button" class="primary" data-invite-accept="${esc(sh.id)}">Accept</button><button type="button" data-invite-decline="${esc(sh.id)}">Decline</button><button type="button" data-invite-later="${esc(sh.id)}">Not now</button></span>`;
}

// Take me there: the area it's in, opened on it, and the thing pulses once it's drawn (flash.js).
// An area that needs more than an address (whose notes, whose day, which book) takes it with takeWant.
const WANT = 'sift:share-want';
export const peekWant = kind => { try { return JSON.parse(sessionStorage.getItem(WANT) || 'null')?.kind === kind; } catch { return false; } };
export function takeWant(kind) {
  try { const want = JSON.parse(sessionStorage.getItem(WANT) || 'null'); if (want?.kind === kind) { sessionStorage.removeItem(WANT); return want; } } catch { /* nothing wanted */ }
  return null;
}
function placeOf(sh) {
  const info = sh.info, owner = sh.mine ? null : sh.owner_id, from = owner ? `/from/${owner}` : '';
  const day = info.from || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return {
    list: { hash: `#/lists/${info.id}${from}`, at: '#main .list-page, #main .checklist' },
    project: { hash: `#/tasks/list/${info.id}${from}`, at: '#main .task-list, #main .tasks-head' },
    recipe: { hash: `#/recipes/${info.id}${from}`, at: '#main .bb-title-row' },
    book: { hash: '#/recipes', want: { kind: 'book', owner, book: info.id }, at: '#main .bb-sections [aria-pressed="true"]' },
    note: { hash: '#/dump', want: { kind: 'note', owner }, at: `#main li.thought[data-id="${CSS.escape(info.id)}"]` },
    days: { hash: `#/planner/${day}`, want: { kind: 'days', owner }, at: '#main .paper' },
  }[info.kind];
}
export function takeMeThere(id) {
  const sh = shareOf(id), place = sh && placeOf(sh);
  if (!place) return;
  try { if (place.want) sessionStorage.setItem(WANT, JSON.stringify(place.want)); } catch { /* the area still opens */ }
  if (location.hash !== place.hash) location.hash = place.hash;
  dispatchEvent(new CustomEvent('sift-share-want')); // an area already open (same area, another page) picks it up now
  const until = Date.now() + 8000; // what was just accepted may still be arriving
  const look = setInterval(() => {
    const el = document.querySelector(place.at);
    if (el || Date.now() > until) { clearInterval(look); if (el) setTimeout(() => flash(el), 150); }
  }, 200);
}

// The 👥 on something shared with you, in its title (as the sharer has 👥 Share): opens aboutShare.
export const theirIconHtml = (sh, className = 'share-btn-people') => (sh ? `<button type="button" class="${className} theirs" data-share-about="${esc(sh.id)}" title="Shared with you by ${esc(personName(sh.owner_email))}">👥<span class="share-words"> ${esc(personName(sh.owner_email))}'s</span></button>` : '');

// About something shared with you: who shared it and when, who else has it, and Leave.
export function aboutShare(id) {
  const sh = sync.sharesNow().find(x => x.id === id);
  if (!sh) return;
  const me = sh.members?.find(m => m.user_id === sync.myUserId());
  const when = d => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const others = (sh.members || []).filter(m => m.user_id !== sync.myUserId() && m.user_id !== sh.owner_id && m.accepted);
  const what = theirThing(sh.info);
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet ask-sheet share-sheet';
  dlg.innerHTML = `
    <div class="sheet-handle"></div>
    <form method="dialog">
      <h2>👥 Shared with you</h2>
      <p><b>${esc(personName(sh.owner_email))}</b> <span class="muted">${esc(sh.owner_email || '')}</span> shared ${esc(what)} with you${me?.added_at ? ` on ${esc(when(me.added_at))}` : ''}.</p>
      <p class="muted">${readOnly(sh.info) ? 'You can read it, follow along and print it; only they can change it. To change a recipe or make a batch, use ⧉ Copy to my Batch Book on it: the copy is yours.' : 'You can both see and change it.'}${others.length ? ` Also shared with ${esc(others.map(m => personName(m.email)).join(', '))}.` : ''}</p>
      <div class="sheet-actions">
        <button type="button" class="danger" data-share-leave="${esc(sh.id)}">Leave</button>
        <span class="spacer"></span>
        <button type="submit" class="primary">Done</button>
      </div>
    </form>`;
  document.body.append(dlg);
  dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}

// People you've shared things with before, or who share with you (not you, not
// already on this one), for the email box: [{ email, name }] by name.
function pastPeople(info) {
  const me = sync.myUserId(), already = new Set((myShare(info)?.members || []).map(m => m.user_id)), found = new Map();
  for (const sh of sync.sharesNow()) for (const m of sh.members || []) if (m.email && m.user_id !== me && !already.has(m.user_id)) found.set(m.user_id, m.email);
  return [...found.values()].map(email => ({ email, name: personName(email) })).sort((a, b) => a.name.localeCompare(b.name));
}
// One or two: chips under the email box. More: a list under it while it's in use, narrowed as you type.
const FEW = 2;
const pastLabel = (p, all) => (all.some(o => o !== p && o.name === p.name) ? `${p.name} (${p.email})` : p.name);

// Share something: who has it, add someone by their sign-in email, take
// someone out, or stop sharing. `info` is { kind, id, name } or { kind: 'days', from, to }.
export function shareSheet(info, what) {
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet ask-sheet share-sheet';
  document.body.append(dlg);
  let error = '', past = [], menu = null, active = -1, escTaken = false;
  const draw = () => {
    menu = null;
    const sh = myShare(info);
    const others = (sh?.members || []).filter(m => m.user_id !== sync.myUserId());
    const on = !!sync.signedIn();
    past = pastPeople(info);
    dlg.innerHTML = `
      <div class="sheet-handle"></div>
      <form method="dialog">
        <h2>Share ${esc(what)}</h2>
        ${on ? `<p class="muted">With someone who has an account on your sync server. They get an invitation; once they accept, ${readOnly(info) ? `they see ${info.kind === 'book' ? 'its recipes and batches as you change them, and recipes you add to it later' : 'it and its batches as you change them'}. Only you can change ${info.kind === 'book' ? 'them' : 'it'}: they can copy a recipe into their own Batch Book to change it.` : `you both see and change the same ${info.kind === 'days' ? 'days' : info.kind}.`}</p>`
          : '<p class="muted">Sharing goes through your sync server: sign in under Settings → Sync first.</p>'}
        ${others.length ? `<ul class="share-people">${others.map(m => `<li><span><b>${esc(personName(m.email))}</b> <span class="muted">${esc(m.email)} · ${m.accepted ? 'sharing' : 'invited'}</span></span><button type="button" data-remove="${esc(m.user_id)}">Remove</button></li>`).join('')}</ul>` : ''}
        ${on ? `<label class="ask-field share-to"><span>Their sign-in email</span><input name="email" type="email" autocomplete="off" autocapitalize="off" placeholder="name@example.com"${past.length > FEW ? ' role="combobox" aria-autocomplete="list" aria-expanded="false"' : ''}></label>` : ''}
        ${on && past.length && past.length <= FEW ? `<div class="share-past"><span class="muted">Shared with before:</span>${past.map(p => `<button type="button" class="chip" data-past="${esc(p.email)}" title="${esc(p.email)}">👤 ${esc(pastLabel(p, past))}</button>`).join('')}</div>` : ''}
        ${error ? `<p class="share-error">${esc(error)}</p>` : ''}
        <div class="sheet-actions">
          ${sh ? '<button type="button" class="danger" data-stop>Stop sharing</button>' : ''}
          <span class="spacer"></span>
          <button type="button" data-close>Done</button>
          ${on ? '<button type="submit" class="primary">Share</button>' : ''}
        </div>
      </form>`;
  };
  draw();
  const off = sync.onShares(() => { if (dlg.open) draw(); });
  const busy = async (fn) => {
    error = '';
    try { await fn(); } catch (e) { error = e.message; }
    draw();
    dlg.querySelector('input[name="email"]')?.focus();
  };
  // The list of past people under the email box (more than FEW): ↑ ↓ move, Enter picks, Esc closes it.
  const box = () => dlg.querySelector('input[name="email"]');
  const closeMenu = () => { menu?.remove(); menu = null; active = -1; box()?.setAttribute('aria-expanded', 'false'); };
  const openMenu = () => {
    const input = box();
    if (!input || past.length <= FEW) return;
    const typed = input.value.trim().toLowerCase();
    const matches = past.filter(p => !typed || (p.name.toLowerCase().includes(typed) || p.email.toLowerCase().includes(typed)) && p.email.toLowerCase() !== typed);
    if (!matches.length) return closeMenu();
    if (!menu) { menu = document.createElement('div'); menu.className = 'dd-menu share-suggest'; menu.setAttribute('role', 'listbox'); input.closest('label').append(menu); }
    active = Math.min(active, matches.length - 1);
    menu.innerHTML = matches.map((p, i) => `<div class="dd-opt${i === active ? ' active' : ''}" role="option" data-past="${esc(p.email)}"><b>${esc(p.name)}</b> <span class="muted">${esc(p.email)}</span></div>`).join('');
    input.setAttribute('aria-expanded', 'true');
  };
  const pick = email => {
    box().value = email;
    closeMenu();
    dlg.querySelector('button[type="submit"]')?.focus();
  };
  dlg.addEventListener('focusin', ev => { if (ev.target.name === 'email') openMenu(); });
  dlg.addEventListener('focusout', ev => { if (ev.target.name === 'email') setTimeout(() => { if (document.activeElement !== box()) closeMenu(); }, 0); });
  dlg.addEventListener('input', ev => { if (ev.target.name === 'email') { active = -1; openMenu(); } });
  dlg.addEventListener('mousedown', ev => { if (ev.target.closest('.share-suggest')) ev.preventDefault(); }); // keep the box focused
  dlg.addEventListener('keydown', ev => {
    if (ev.target.name !== 'email') return;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      if (!menu) { openMenu(); if (!menu) return; }
      const rows = menu.querySelectorAll('.dd-opt');
      active = ev.key === 'ArrowDown' ? (active + 1) % rows.length : (active <= 0 ? rows.length : active) - 1;
      rows.forEach((row, i) => row.classList.toggle('active', i === active));
      rows[active].scrollIntoView({ block: 'nearest' });
      ev.preventDefault();
    } else if (ev.key === 'Enter' && menu && active >= 0) { ev.preventDefault(); pick(menu.querySelectorAll('.dd-opt')[active].dataset.past); }
    else if (ev.key === 'Escape' && menu) { ev.preventDefault(); ev.stopPropagation(); closeMenu(); escTaken = true; }
  });
  dlg.addEventListener('cancel', ev => { if (escTaken) ev.preventDefault(); escTaken = false; });
  dlg.addEventListener('submit', ev => {
    ev.preventDefault();
    const email = dlg.querySelector('input[name="email"]').value.trim();
    if (!email) return;
    busy(async () => { if (await nameFirst()) toast(`Invitation sent to ${await sync.shareWith(info, email)}`); });
  });
  dlg.addEventListener('click', async ev => {
    if (ev.target === dlg) return dlg.close();
    if (ev.target.closest('[data-close]')) return dlg.close();
    const person = ev.target.closest('[data-past]');
    if (person) return pick(person.dataset.past);
    const rm = ev.target.closest('[data-remove]');
    if (rm) return busy(() => sync.leaveShare(myShare(info).id, rm.dataset.remove));
    if (ev.target.closest('[data-stop]')) {
      if (!await askYes(`Stop sharing ${what}?`, { text: 'It stays yours. Everyone you shared it with loses it.', ok: 'Stop sharing', danger: true })) return;
      busy(async () => { await sync.stopSharing(myShare(info).id); toast('Not shared any more'); });
    }
  });
  dlg.addEventListener('close', () => { off(); dlg.remove(); });
  dlg.showModal();
  dlg.querySelector('input[name="email"]')?.focus();
}

// Accept / Decline / Not now / Take me there / Leave anywhere in the app; the bottom bar while an invitation waits.
export function installSharing() {
  loadAnswers().then(drawBar);
  store.subscribe(change => { if (change?.collection === 'settings') loadAnswers().then(drawBar); }); // answered on another device
  document.addEventListener('click', async ev => {
    const inv = ev.target.closest('[data-invite-accept], [data-invite-decline], [data-invite-later], [data-share-there]');
    if (inv) {
      inv.disabled = true;
      try {
        if (inv.dataset.inviteAccept) await acceptInvite(inv.dataset.inviteAccept);
        else if (inv.dataset.inviteDecline) await declineInvite(inv.dataset.inviteDecline);
        else if (inv.dataset.inviteLater) await laterInvite(inv.dataset.inviteLater);
        else takeMeThere(inv.dataset.shareThere);
      } catch (e) { toast(e.message); }
      inv.disabled = false;
      return;
    }
    const about = ev.target.closest('[data-share-about]');
    if (about) { aboutShare(about.dataset.shareAbout); return; }
    const b = ev.target.closest('[data-share-accept], [data-share-decline], [data-share-leave]');
    if (!b) return;
    b.disabled = true;
    try {
      if (b.dataset.shareAccept && !await nameFirst()) { b.disabled = false; return; }
      if (b.dataset.shareAccept) { await sync.acceptShare(b.dataset.shareAccept); toast('Accepted: it will appear under Shared with me'); }
      if (b.dataset.shareDecline) { await sync.leaveShare(b.dataset.shareDecline); toast('Declined'); }
      if (b.dataset.shareLeave) {
        const sh = sync.sharesNow().find(x => x.id === b.dataset.shareLeave);
        if (!await askYes(`Leave ${sh ? (sh.info.kind === 'book' ? bookWords(sh.info, `${personName(sh.owner_email)}'s`) : `${personName(sh.owner_email)}'s ${sh.info.kind === 'days' ? 'day plan' : sh.info.kind}`) : 'this'}?`, { text: 'It goes from your devices. They can share it with you again.', ok: 'Leave', danger: true })) { b.disabled = false; return; }
        store.useSpace(null);
        b.closest('dialog')?.close();
        await sync.leaveShare(b.dataset.shareLeave);
        toast('Left');
      }
    } catch (e) { toast(e.message); b.disabled = false; }
  });
  sync.onShares(() => drawBar());
}
