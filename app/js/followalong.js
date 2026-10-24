// Follow along (Batch Book): recipes and batches to cook from, read only, full screen. ▶ Follow along by the Steps heading.
// Each thing being cooked is a tab along the top (+ Recipe adds another; ✕ on a tab puts it away), so two or more can
// be cooked at once: tap a tab (or swipe sideways on a phone) to switch, each keeping its place. Side by side (wide
// screens, two or more tabs) shows two or three at once, each with its own steps and its ingredients folded at the top.
// One at a time on a wide screen: the ingredients (and the scale) on the left third, the ones the step puts in
// highlighted; the steps on the right as a rolling drum that snaps to each step: the one in the middle big with its
// photo, the ones either side smaller, narrower and fainter the further they are. Phones: one column, the
// ingredients folded away at the top. Timers (timers.js) sit in the top bar; a step that mentions a wait has a
// one-tap timer. The tabs, each one's step and scale, and Side by side are remembered on this device until ✕,
// ✓ Finished cooking (clears them all) or 3 days without being opened; the screen is kept awake while it's open.

import { keys } from './keys.js';
import * as store from './store.js';
import * as att from './attachments.js';
import { stepsOf, amountText, stepHtml, stepRefs, stepWaits, qtyText, batchName } from './batchbook.js';
import * as timers from './timers.js';
import { toast } from './toast.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const KEPT = 'sift_follow_tabs';
const SCALES = [1 / 3, 0.5, 1, 2, 3, 4];
const FORGET = 3 * 24 * 3600e3; // tabs nobody has opened for 3 days are put away by themselves (a broth can start the day before)
const kept = () => {
  let k = null;
  try { k = JSON.parse(localStorage.getItem(KEPT) || 'null'); } catch {}
  k = Object.assign({ tabs: [], at: 0, side: false, touched: 0 }, k);
  if (Date.now() - k.touched > FORGET) k.tabs = [];
  return k;
};
const keep = k => { k.touched = Date.now(); try { localStorage.setItem(KEPT, JSON.stringify(k)); } catch {} };
// How many are being cooked (Batch Book's 🍳 Cooking pill).
export const cooking = () => kept().tabs.length;
const wide = () => matchMedia('(min-width: 761px)').matches;
const columns = () => (matchMedia('(min-width: 1400px)').matches ? 3 : matchMedia('(min-width: 900px)').matches ? 2 : 1);
export const isOpen = () => !!document.querySelector('.fa-screen');
let closeOpen = null;

// A name for a step's timer: the word before its wait ("then simmer for 15 minutes" → "Simmer, step 4"), else its first.
function waitName(text, n) {
  const plain = (text || '').replace(/\{([^{}|]+?)(?:\|([^{}]*))?\}/g, (w, body, own) => own ?? body);
  const before = plain.match(/([A-Za-z]+)\s+(?:(?:for|about|another|a further|around|roughly)\s+)*(?:\d|½)/);
  const stop = w => !w || /^(for|about|and|then|the|a|an|to|of|or|at|in|another|further|around|roughly|after|within|until|over|under|up|every|each|least|more|than|it|them|this)$/i.test(w);
  const first = plain.trim().match(/^[A-Za-z]+/)?.[0];
  const word = !stop(before?.[1]) ? before[1] : !stop(first) ? first : '';
  return word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}, step ${n}` : `Step ${n}`;
}

// A tab's recipe or batch, read from whoever's space it is in (someone else's shared recipe is in theirs).
async function loadTab(tab) {
  const space = tab.owner ? store.spaceOf(tab.owner) : store.local;
  const rec = await space.get(tab.c, tab.id).catch(() => null);
  if (!rec || rec.deleted_at) return null;
  const recipe = tab.c === 'recipe_makes' ? await space.get('recipes', rec.recipe_id).catch(() => null) : rec;
  const ids = new Set(stepsOf(rec).map(st => st.id));
  const files = (await space.list('attachments')).filter(a => ids.has(a.parent_id) && a.kind === 'image').sort((x, y) => x.created_at.localeCompare(y.created_at));
  const atts = new Map();
  for (const a of files) { if (!atts.has(a.parent_id)) atts.set(a.parent_id, []); atts.get(a.parent_id).push(a); }
  const title = tab.c === 'recipe_makes' ? batchName(rec, recipe?.title) : rec.title || 'Untitled';
  return { tab, rec, atts, title, steps: stepsOf(rec), ings: rec.ingredients || [], where: { recipe_id: recipe?.id || null, make_id: tab.c === 'recipe_makes' ? rec.id : null, owner: tab.owner || null, title } };
}

// openFollow({ c: 'recipes' | 'recipe_makes', id, owner, times }): opens Follow along on that one (added as a tab).
export async function openFollow(open) {
  if (!document.getElementById('fa-css')) document.head.append(Object.assign(document.createElement('style'), { id: 'fa-css', textContent: CSS }));
  const k = kept();
  if (open) {
    let n = k.tabs.findIndex(t => t.c === open.c && t.id === open.id);
    if (n < 0) { k.tabs.push({ c: open.c, id: open.id, owner: open.owner || null, times: open.times || 1, at: 0 }); n = k.tabs.length - 1; }
    else if (open.times && open.c === 'recipes') k.tabs[n].times = open.times;
    k.at = n;
  }
  const pots = (await Promise.all(k.tabs.map(loadTab))).filter(Boolean);
  k.tabs = pots.map(p => p.tab);
  k.at = Math.max(0, Math.min(k.at, pots.length - 1));
  keep(k);
  if (!pots.length) return;
  closeOpen?.(); // one open at a time, and the one before lets go of everything it was listening to
  document.querySelector('.fa-screen')?.remove();
  const el = document.createElement('div');
  el.className = 'fa-screen';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Follow along');
  document.body.append(el);
  document.body.classList.add('follow-open');
  const urls = [];
  let shown = []; // the drawn pots: { pot, box, roll, goTo, cur }
  const save = () => { k.tabs = pots.map(p => p.tab); keep(k); };
  const sideBySide = () => k.side && pots.length > 1 && columns() > 1;

  const scaleHtml = p => (p.tab.c === 'recipes' && p.ings.some(i => i.qty != null) ? `<span class="segmented fa-scale" aria-label="Scale">${SCALES.map(s => `<button type="button" data-scale="${s}" aria-pressed="${p.tab.times === s}">×${qtyText(s)}</button>`).join('')}</span>` : '');
  const ingsHtml = (p, cur) => {
    const used = p.steps[cur] ? stepRefs(p.steps[cur].text, p.ings) : new Set();
    return `<ul class="fa-ing-list">${p.ings.map(i => `<li${used.has(i.id) ? ' class="fa-used"' : ''}><b>${esc(amountText(i, p.tab.times))}</b><span>${esc(i.item)}${i.note ? ` <span class="muted">(${esc(i.note)})</span>` : ''}</span></li>`).join('')}</ul>`;
  };
  const photo = (p, st) => { const a = (p.atts.get(st.id) || []).find(x => x.thumb); return a ? `<button type="button" class="fa-photo" data-photo="${a.id}" aria-label="Look at the photo"><img src="${a.thumb}" alt="" data-full="${a.id}"></button>` : ''; };
  // A step ticked off: a big green ✓ on its left; its pill (bottom right, on the step in the middle) ticks it and moves on.
  const isDone = (p, st) => (p.tab.done || []).includes(st.id);
  const doneBtn = (p, n, done) => (done ? '<button type="button" class="fa-done-btn fa-undone" data-done="0">↺ Not done</button>'
    : `<button type="button" class="fa-done-btn" data-done="1">✓ Done${n < p.steps.length - 1 ? ', next' : ''}${keys('Enter')}</button>`);
  const stepOf = (p, st, n) => {
    // A Start button for each different time the step mentions; with more than one, each timer's name says its time.
    const waits = stepWaits(st.text), name = waitName(st.text, n + 1);
    const starts = waits.map(secs => `<button type="button" class="fa-wait" data-wait="${secs}" data-name="${esc(waits.length > 1 ? `${name}, ${timers.lengthText(secs)}` : name)}">⏰ Start ${timers.lengthText(secs)} timer</button>`).join('');
    const done = isDone(p, st);
    return `<section class="fa-step${done ? ' fa-done' : ''}" data-n="${n}">${done ? '<span class="fa-tick" aria-label="Done">✓</span>' : ''}<div class="fa-num">Step ${n + 1}<span class="fa-of"> of ${p.steps.length}</span></div>
      <div class="fa-text">${stepHtml(st.text, p.ings, p.tab.times, esc) || '<span class="muted">Empty step</span>'}</div>
      <div class="fa-extra">${photo(p, st)}${starts}${doneBtn(p, n, done)}</div></section>`;
  };
  // One pot: its ingredients (folded unless it's the only one on a wide screen) and its drum of steps.
  const potHtml = (p, n, { alone }) => `<div class="fa-pot${alone ? ' fa-alone' : ''}" data-pot="${n}">
      ${alone ? '' : `<div class="fa-pot-head"><b>${esc(p.title)}</b>${scaleHtml(p)}</div>`}
      <aside class="fa-ings"><details class="fa-fold"${alone && wide() ? ' open' : ''}><summary><span>🧺 Ingredients</span><span class="muted fa-count">${p.ings.length}</span>${alone ? scaleHtml(p) : ''}</summary>${alone ? `<div class="fa-fold-scale">${scaleHtml(p)}</div>` : ''}<div class="fa-ing-body"></div></details></aside>
      <div class="fa-drum" tabindex="-1">${p.steps.length ? p.steps.map((st, s) => stepOf(p, st, s)).join('') : '<p class="muted fa-none">No steps yet.</p>'}</div>
      ${alone ? `<div class="fa-dots" aria-hidden="true">${p.steps.map((_, s) => `<i data-dot="${s}"></i>`).join('')}</div>` : ''}
    </div>`;

  // The drum: each step scaled and faded by how far it is from the middle, and drawn in towards it.
  function drum(p, box) {
    const d = box.querySelector('.fa-drum');
    const items = () => [...d.querySelectorAll('.fa-step')];
    const me = { pot: p, box, cur: Math.min(p.tab.at || 0, Math.max(0, p.steps.length - 1)) };
    let frame = 0;
    me.roll = () => {
      frame = 0;
      const mid = d.scrollTop + d.clientHeight / 2;
      const unit = Math.max(150, d.clientHeight / 4);
      const list = items();
      if (!list.length) return;
      const ds = list.map(s => (s.offsetTop + s.offsetHeight / 2 - mid) / unit); // layout places, not the drawn (scaled) ones
      let near = 0;
      ds.forEach((x, n) => { if (Math.abs(x) < Math.abs(ds[near])) near = n; });
      const scale = x => Math.max(0.42, 1 - Math.min(Math.abs(x), 3) * 0.2);
      const squash = x => 1 - Math.min(Math.abs(x), 3) * 0.05;
      // drawn in: the space each smaller step leaves between it and the middle is closed up
      const pull = new Array(list.length).fill(0);
      for (const dir of [-1, 1]) {
        let gap = 0;
        for (let n = near + dir; n >= 0 && n < list.length; n += dir) {
          if (n - dir !== near) gap += (1 - scale(ds[n - dir]) * squash(ds[n - dir])) * list[n - dir].offsetHeight;
          pull[n] = -dir * gap;
        }
      }
      list.forEach((s, n) => {
        const x = ds[n];
        s.style.transformOrigin = x < 0 ? 'center bottom' : 'center top';
        s.style.transform = n === near ? '' : `translateY(${pull[n]}px) scale(${scale(x)}, ${scale(x) * squash(x)})`;
        s.style.opacity = n === near ? '' : String(Math.max(0.16, 0.75 - (Math.abs(x) - 0.5) * 0.28));
        s.classList.toggle('fa-cur', n === near);
      });
      if (near !== me.cur || !box.querySelector('.fa-ing-list')) { me.cur = near; p.tab.at = near; save(); box.querySelector('.fa-ing-body').innerHTML = ingsHtml(p, near); }
      box.querySelectorAll('[data-dot]').forEach(x => { x.classList.toggle('on', +x.dataset.dot === me.cur); x.classList.toggle('done', isDone(p, p.steps[+x.dataset.dot])); });
    };
    me.later = () => { if (!frame) frame = requestAnimationFrame(me.roll); };
    // Tick a step off (and move on to the next), or untick it.
    me.mark = (n, done) => {
      const st = p.steps[n];
      if (!st) return;
      p.tab.done = (p.tab.done || []).filter(id => id !== st.id).concat(done ? [st.id] : []);
      save();
      const old = items()[n], fresh = document.createElement('div');
      fresh.innerHTML = stepOf(p, st, n);
      const step = fresh.firstElementChild;
      step.className = old.className.replace(/\s*fa-done/, '') + (done ? ' fa-done' : '');
      step.style.cssText = old.style.cssText;
      old.replaceWith(step);
      if (done && n < p.steps.length - 1) me.goTo(n + 1); else me.roll();
    };
    me.goTo = (n, smooth = true) => {
      const s = items()[Math.max(0, Math.min(p.steps.length - 1, n))];
      if (s) d.scrollTo({ top: s.offsetTop + s.offsetHeight / 2 - d.clientHeight / 2, behavior: smooth ? 'smooth' : 'auto' });
    };
    me.rescale = () => { items().forEach((s, n) => { s.querySelector('.fa-text').innerHTML = stepHtml(p.steps[n].text, p.ings, p.tab.times, esc) || ''; }); box.querySelector('.fa-ing-body').innerHTML = ingsHtml(p, me.cur); box.querySelectorAll('[data-scale]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.scale === p.tab.times))); me.later(); };
    d.addEventListener('scroll', me.later, { passive: true });
    box.querySelector('.fa-ing-body').innerHTML = ingsHtml(p, me.cur);
    requestAnimationFrame(() => { me.goTo(me.cur, false); me.roll(); });
    return me;
  }

  // Full-size photos once they're read (the thumbnails show first).
  const fullPhotos = () => el.querySelectorAll('img[data-full]').forEach(async img => {
    const a = pots.flatMap(p => [...p.atts.values()].flat()).find(x => x.id === img.dataset.full);
    img.removeAttribute('data-full');
    const blob = a && await att.blobOf(a).catch(() => null);
    if (blob) { const url = URL.createObjectURL(blob); urls.push(url); img.src = url; }
  });

  const tabsHtml = () => `<div class="fa-tabs" role="tablist">${pots.map((p, n) => `<span class="fa-tab${n === k.at ? ' on' : ''}" role="tab" aria-selected="${n === k.at}"><button type="button" class="fa-tab-go" data-tab="${n}">${esc(p.title)}</button>${pots.length > 1 ? `<button type="button" class="fa-tab-x" data-tab-x="${n}" title="Put this one away" aria-label="Put ${esc(p.title)} away">✕</button>` : ''}</span>`).join('')}
    <button type="button" class="fa-tab-add" data-fa="add" title="Cook another recipe at the same time">+ Recipe</button>
    ${pots.length > 1 && columns() > 1 ? `<button type="button" class="fa-side" data-fa="side" aria-pressed="${!!k.side}" title="Show two or three at once">◫ Side by side</button>` : ''}</div>`;
  let ro = null;
  function draw() {
    ro?.disconnect();
    const side = sideBySide();
    const cols = side ? Math.min(columns(), pots.length) : 1;
    // Side by side: the chosen one and the ones after it (round the end).
    const which = Array.from({ length: cols }, (_, n) => (k.at + n) % pots.length);
    el.innerHTML = `<div class="fa-top"><button type="button" class="back" data-fa="close">‹ Back${keys('Esc')}</button>
        <h1>${pots.length > 1 ? 'Follow along' : esc(pots[k.at].title)}</h1>        <div class="fa-timers" aria-label="Timers"></div><button type="button" class="fa-add" data-fa="timer" title="A countdown or a stopwatch" aria-label="New timer">⏰ +<span class="fa-word"> Timer</span></button>
        <button type="button" class="fa-finish" data-fa="finish" title="Clear ${pots.length > 1 ? 'these recipes' : 'this recipe'} from Follow along" aria-label="Finished cooking">✓<span class="fa-word"> Finished cooking</span></button></div>
      <div class="fa-timers fa-phone-timers" aria-label="Timers"></div>
      ${tabsHtml()}
      <div class="fa-grid${side ? ' fa-side-by-side' : ''}" style="--cols:${cols}">${which.map(n => potHtml(pots[n], n, { alone: !side })).join('')}</div>`;
    shown = which.map(n => drum(pots[n], el.querySelector(`[data-pot="${n}"]`)));
    ro = new ResizeObserver(() => shown.forEach(s => s.later()));
    el.querySelectorAll('.fa-drum').forEach(d => ro.observe(d));
    drawTimers(timers.list());
    fullPhotos();
    el.querySelector('.fa-tab.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  const focused = () => shown.find(s => +s.box.dataset.pot === k.at) || shown[0];
  const switchTo = n => { k.at = (n + pots.length) % pots.length; save(); draw(); };

  const drawTimers = list => el.querySelectorAll('.fa-timers').forEach(box => { box.innerHTML = list.map(t => timers.pillHtml(t, Date.now(), { recipe: pots.length > 1 })).join(''); });
  const unwatch = timers.watch(drawTimers);
  let lastCols = columns();
  const onResize = () => { if (columns() !== lastCols) { lastCols = columns(); if (pots.length > 1) draw(); } };
  addEventListener('resize', onResize);
  draw();

  // + Recipe: another recipe, or a batch on the go, to cook alongside.
  async function addPot() {
    const [recipes, makes] = await Promise.all([store.local.list('recipes', { filter: r => !r.archived_at }), store.local.list('recipe_makes', { filter: m => !m.archived_at && m.status !== 'done' })]);
    const titleOf = id => recipes.find(r => r.id === id)?.title;
    const open = new Set(pots.map(p => p.tab.id));
    const rows = [...makes.filter(m => !open.has(m.id)).map(m => ({ c: 'recipe_makes', id: m.id, label: `🧪 ${batchName(m, titleOf(m.recipe_id))}` })), ...recipes.filter(r => !open.has(r.id)).sort((a, b) => (a.title || '').localeCompare(b.title || '')).map(r => ({ c: 'recipes', id: r.id, label: r.title || 'Untitled' }))];
    const dlg = document.createElement('dialog');
    dlg.className = 'sheet fa-pick';
    dlg.innerHTML = `<div class="sheet-handle"></div><h2>Cook another at the same time</h2><input type="search" class="fa-pick-q" placeholder="Search recipes…" aria-label="Search recipes">
      <div class="fa-pick-list">${rows.map((r, n) => `<button type="button" data-pick="${n}">${esc(r.label)}</button>`).join('') || '<p class="muted">Nothing else to add.</p>'}</div>`;
    document.body.append(dlg);
    const q = dlg.querySelector('.fa-pick-q');
    q.addEventListener('input', () => { const w = q.value.trim().toLowerCase(); dlg.querySelectorAll('[data-pick]').forEach(b => { b.hidden = !!w && !b.textContent.toLowerCase().includes(w); }); });
    let chosen = null;
    dlg.addEventListener('click', ev => { const b = ev.target.closest('[data-pick]'); if (b) { chosen = rows[+b.dataset.pick]; dlg.close(); } });
    dlg.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target === q) { const b = [...dlg.querySelectorAll('[data-pick]')].find(x => !x.hidden); if (b) { ev.preventDefault(); b.click(); } } });
    await new Promise(resolve => { dlg.addEventListener('close', () => { dlg.remove(); resolve(); }); dlg.showModal(); q.focus(); });
    if (!chosen) return;
    const p = await loadTab({ c: chosen.c, id: chosen.id, owner: null, times: 1, at: 0 });
    if (!p) return;
    pots.push(p);
    k.at = pots.length - 1;
    save();
    draw();
  }

  // ✓ Finished cooking: every tab put away (and, if asked, the timers that belong to them stopped).
  // Finished cooking: these recipes and their timers go, with Undo in the message (no asking first).
  async function finish() {
    const ids = new Set(pots.map(p => p.tab.id));
    const going = timers.list().filter(t => ids.has(t.make_id) || ids.has(t.recipe_id));
    const was = JSON.parse(JSON.stringify(k));
    for (const t of going) await store.local.remove('timers', t.id);
    pots.length = 0;
    k.at = 0;
    save();
    close();
    toast(going.length ? `Finished cooking: ${going.length === 1 ? '1 timer' : `${going.length} timers`} stopped` : 'Finished cooking', { action: 'Undo', onAction: async () => {
      for (const t of going) await store.local.restore('timers', t.id);
      keep(was);
      openFollow(null);
    } });
  }

  // The screen stays on while cooking.
  let lock = null;
  const wake = async () => { try { if (!document.hidden && !lock) { lock = await navigator.wakeLock?.request('screen'); lock?.addEventListener('release', () => { lock = null; }); } } catch { lock = null; } };
  const onVis = () => { if (!document.hidden) wake(); };
  document.addEventListener('visibilitychange', onVis);
  wake();

  // A phone: a sideways swipe on the steps changes tab.
  let touch = null;
  el.addEventListener('touchstart', ev => { touch = ev.touches.length === 1 && !ev.target.closest('.fa-tabs, .fa-timers, .fa-scale') ? { x: ev.touches[0].clientX, y: ev.touches[0].clientY } : null; }, { passive: true });
  el.addEventListener('touchend', ev => {
    if (!touch || pots.length < 2 || sideBySide()) return;
    const t = ev.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) switchTo(k.at + (dx < 0 ? 1 : -1));
  }, { passive: true });

  function close() {
    if (closeOpen === close) closeOpen = null;
    ro?.disconnect();
    unwatch();
    removeEventListener('keydown', onKey, true);
    removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    lock?.release?.().catch(() => {});
    urls.forEach(u => URL.revokeObjectURL(u));
    el.remove();
    document.body.classList.remove('follow-open');
    dispatchEvent(new CustomEvent('sift-follow-closed'));
  }
  function onKey(ev) {
    if (document.querySelector('dialog[open]') || ev.target.closest?.('input, textarea, select')) return;
    const move = { ArrowDown: 1, ArrowUp: -1, PageDown: 1, PageUp: -1, ' ': ev.shiftKey ? -1 : 1, j: 1, k: -1 }[ev.key];
    const f = focused();
    if (ev.key === 'Escape') { if (document.querySelector('.pill-menu')) return; ev.preventDefault(); ev.stopPropagation(); close(); }
    else if (move && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { ev.preventDefault(); ev.stopPropagation(); f?.goTo(f.cur + move); }
    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { ev.preventDefault(); ev.stopPropagation(); if (pots.length > 1) switchTo(k.at + (ev.key === 'ArrowRight' ? 1 : -1)); } // the tabs, not the area's behind
    else if (ev.key === 'Enter' && f && !ev.target.closest?.('button, summary, a')) { ev.preventDefault(); f.mark(f.cur, !f.pot.steps[f.cur] || !isDone(f.pot, f.pot.steps[f.cur])); }
    else if (ev.key === 'Home' || ev.key === 'End') { ev.preventDefault(); f?.goTo(ev.key === 'Home' ? 0 : f.pot.steps.length - 1); }
  }
  addEventListener('keydown', onKey, true);
  closeOpen = close;
  el.addEventListener('click', ev => {
    if (timers.onClick(ev, { open: t => { const n = pots.findIndex(p => p.tab.id === (t.make_id || t.recipe_id)); if (n >= 0) switchTo(n); } })) return;
    const b = ev.target.closest('button, .fa-step, summary');
    if (!b) return;
    const box = b.closest('[data-pot]');
    const s = box ? shown.find(x => x.box === box) : focused();
    if (b.matches('summary') && box?.classList.contains('fa-alone') && wide()) ev.preventDefault(); // always open beside the steps
    if (box && +box.dataset.pot !== k.at && sideBySide()) { k.at = +box.dataset.pot; save(); el.querySelectorAll('.fa-tab').forEach((t, n) => t.classList.toggle('on', n === k.at)); }
    if (b.dataset.fa === 'close') return close();
    if (b.dataset.fa === 'timer') return timers.newTimerSheet(focused()?.pot.where || {});
    if (b.dataset.fa === 'add') return addPot();
    if (b.dataset.fa === 'finish') return finish();
    if (b.dataset.fa === 'side') { k.side = !k.side; save(); return draw(); }
    if (b.dataset.tab) return switchTo(+b.dataset.tab);
    if (b.dataset.tabX) { pots.splice(+b.dataset.tabX, 1); if (k.at >= pots.length || +b.dataset.tabX < k.at) k.at = Math.max(0, k.at - 1); save(); return draw(); }
    if (b.dataset.scale) { ev.preventDefault(); const p = s?.pot || pots[k.at]; p.tab.times = +b.dataset.scale; save(); (shown.find(x => x.pot === p) || s)?.rescale(); return; }
    if (b.dataset.wait) {
      // One timer per step: a second tap shows the one already going instead of starting another.
      const where = s.pot.where, going = timers.list().find(t => t.name === b.dataset.name && t.recipe_id === where.recipe_id && (t.make_id || null) === (where.make_id || null));
      if (!going) return timers.start(Object.assign({}, where, { name: b.dataset.name, secs: +b.dataset.wait }));
      el.querySelectorAll(`[data-timer="${going.id}"]`).forEach(pill => { pill.classList.remove('tm-flash'); void pill.offsetWidth; pill.classList.add('tm-flash'); });
      return toast(`${going.name} is already going: tap its time for more`);
    }
    if (b.dataset.done) { const n = +b.closest('.fa-step').dataset.n; return s?.mark(n, b.dataset.done === '1'); }
    if (b.dataset.photo) { const list = s.pot.atts.get(s.pot.steps[+b.closest('.fa-step').dataset.n].id) || []; return att.view(list, Math.max(0, list.findIndex(a => a.id === b.dataset.photo))); }
    if (b.matches('.fa-step') && !b.classList.contains('fa-cur')) s?.goTo(+b.dataset.n);
  });
  return { close };
}

const CSS = `
body.follow-open { overflow: hidden; }
.fa-screen { position: fixed; inset: 0; z-index: 900; background: var(--bg); background-image: var(--bg-image, none); color: var(--text); display: flex; flex-direction: column; padding: calc(10px + var(--safe-top)) clamp(10px, 2vw, 22px) calc(10px + var(--safe-bottom)); }
.fa-top, .fa-tabs, .fa-phone-timers { position: relative; z-index: 3; } /* above the steps: iPad Safari can let a rolled step (scaled, on its own layer) take taps outside the drum until the window is resized */
.fa-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; min-width: 0; flex-wrap: wrap; }
.fa-top .back { padding: 6px 14px 6px 10px; flex: none; }
.fa-top h1 { font-size: 1.3rem; margin: 0; font-weight: 600; flex: 1; min-width: 6em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fa-fold-scale { display: none; }
.fa-timers { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-height: 132px; overflow-y: auto; padding: 4px; scrollbar-width: thin; }
.fa-phone-timers { display: none; }
.fa-add, .fa-finish { flex: none; }
.fa-tabs { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; overflow-x: auto; scrollbar-width: none; flex: none; }
.fa-tabs::-webkit-scrollbar { display: none; }
.fa-tab { display: inline-flex; align-items: center; flex: none; border-radius: 18px; background: var(--glass); border: 1px solid var(--glass-border); }
.fa-tab.on { background: var(--active-bg); border-color: var(--active-border); }
.fa-tab button { background: none; box-shadow: none; border: 0; }
.fa-tab-go { font-weight: 600; max-width: 16em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fa-tab-x { padding: 6px 10px 6px 2px; color: var(--muted); }
.fa-tab-add, .fa-side { flex: none; }
.fa-side[aria-pressed="true"] { background: var(--active-bg); border-color: var(--active-border); }
.fa-tabs:has(.fa-tab:only-of-type) .fa-tab { display: none; }
.fa-tabs:has(.fa-tab:only-of-type) { justify-content: flex-end; margin: -6px 0 4px; }
.fa-grid { flex: 1; min-height: 0; display: flex; position: relative; z-index: 1; }
.fa-pot { flex: 1; min-width: 0; min-height: 0; display: grid; grid-template-columns: minmax(240px, 1fr) 2fr; gap: 18px; position: relative; }
.fa-side-by-side { display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: 14px; }
.fa-side-by-side .fa-pot { display: flex; flex-direction: column; gap: 8px; background: color-mix(in srgb, var(--text) 3%, transparent); border: 1px solid var(--glass-border); border-radius: 22px; padding: 10px; }
.fa-pot-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 2px 6px; }
.fa-pot-head b { font-size: 1.05rem; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fa-ings { min-height: 0; overflow: auto; background: var(--glass); border: 1px solid var(--glass-border); border-radius: 22px; padding: 14px 18px; }
.fa-fold summary { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; list-style: none; font-weight: 600; margin-bottom: 8px; cursor: default; }
.fa-fold summary::-webkit-details-marker { display: none; }
.fa-alone .fa-fold summary .fa-scale { flex-basis: 100%; }
.fa-scale { flex-wrap: nowrap; }
.fa-scale button { padding: 4px 9px; font-size: .85rem; }
.fa-count { display: none; font-weight: 400; }
.fa-ing-list { list-style: none; margin: 0; padding: 0; font-size: 1.08rem; }
.fa-ing-list li { display: flex; gap: 10px; padding: 8px 10px; margin: 0 -10px; border-bottom: 1px solid color-mix(in srgb, var(--text) 8%, transparent); border-radius: 10px; transition: background .25s; }
.fa-ing-list b { color: #f6c46f; font-weight: 650; white-space: nowrap; }
.fa-ing-list li.fa-used { background: rgba(246, 196, 111, .2); border-color: transparent; }
.fa-drum { position: relative; contain: paint; min-height: 0; overflow-y: auto; scroll-snap-type: y mandatory; scrollbar-width: none; overscroll-behavior: contain; padding: 0 30px 0 4px; outline: none;
  -webkit-mask-image: linear-gradient(transparent, #000 9%, #000 91%, transparent); mask-image: linear-gradient(transparent, #000 9%, #000 91%, transparent); }
.fa-drum::-webkit-scrollbar { display: none; }
.fa-drum::before, .fa-drum::after { content: ""; display: block; height: 42%; }
.fa-step { scroll-snap-align: center; margin: 0 auto 14px; padding: 18px 24px; border-radius: 26px; border: 1px solid transparent; transition: background .25s, border-color .25s; will-change: transform; cursor: pointer; }
.fa-step.fa-cur { background: color-mix(in srgb, var(--text) 7%, transparent); border-color: var(--glass-border); cursor: default; }
.fa-num { font-size: .8rem; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
.fa-cur .fa-num { color: var(--accent); }
.fa-of { display: none; }
.fa-cur .fa-of { display: inline; }
.fa-text { font-size: clamp(1.5rem, 2.6vw, 2.1rem); line-height: 1.3; font-weight: 500; margin-top: 6px; overflow-wrap: anywhere; }
.fa-side-by-side .fa-text { font-size: clamp(1.2rem, 1.9vw, 1.7rem); }
.fa-text .bb-ref { color: #f6c46f; background: none; padding: 0; font-weight: 650; white-space: normal; }
.fa-extra { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-top: 14px; }
.fa-photo { padding: 0; border-radius: 18px; overflow: hidden; background: none; flex: none; max-width: 100%; }
.fa-photo img { display: block; width: min(380px, 100%); max-height: 34vh; object-fit: cover; }
.fa-wait { font-size: 1rem; }
.fa-step { position: relative; }
.fa-done-btn { margin-left: auto; font-size: 1rem; font-weight: 600; padding: 8px 18px; background: rgba(52, 168, 83, .9); border-color: rgba(120, 220, 140, .9); color: #fff; }
.fa-done-btn.fa-undone { background: var(--glass); border-color: var(--glass-border); color: var(--muted); font-weight: 500; }
.fa-done-btn kbd { opacity: .7; }
.fa-step:not(.fa-cur) .fa-done-btn { visibility: hidden; }
.fa-step.fa-done { padding-left: 84px; }
.fa-tick { position: absolute; left: 18px; top: 18px; width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; background: rgb(52, 168, 83); color: #fff; font-size: 1.9rem; font-weight: 800; box-shadow: 0 4px 14px rgba(52, 168, 83, .45); animation: fa-tick .35s cubic-bezier(.2, 1.6, .4, 1); }
.fa-done .fa-text { opacity: .62; }
@keyframes fa-tick { from { transform: scale(.3); opacity: 0; } }
.fa-dots i.done { background: rgb(52, 168, 83); }
.fa-dots { position: absolute; right: 2px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 7px; pointer-events: none; }
.fa-dots i { width: 7px; height: 7px; border-radius: 4px; background: color-mix(in srgb, var(--text) 30%, transparent); transition: height .2s, background .2s; }
.fa-dots i.on { height: 20px; background: var(--accent); }
.fa-none { text-align: center; margin-top: 30vh; }
.fa-side-by-side .fa-ings { flex: none; max-height: 40%; padding: 8px 14px; }
.fa-side-by-side .fa-fold summary { margin: 0; cursor: pointer; }
.fa-side-by-side .fa-fold[open] summary { margin-bottom: 6px; }
.fa-side-by-side .fa-count { display: inline; }
.fa-side-by-side .fa-drum { flex: 1; padding: 0 2px; }
.fa-side-by-side .fa-step { padding: 12px 14px; }
.fa-pick-q { width: 100%; margin: 6px 0 10px; }
.fa-pick-list { display: flex; flex-direction: column; gap: 6px; max-height: 55vh; overflow: auto; }
.fa-pick-list button { text-align: left; padding: 10px 14px; }
@media (max-width: 760px) {
  .fa-fold-scale { display: block; margin-bottom: 6px; }
  .fa-top { flex-wrap: nowrap; gap: 6px; }
  .fa-top h1 { font-size: 1.1rem; min-width: 0; }
  .fa-word { display: none; }
  .fa-top .fa-timers { display: none; }
  .fa-phone-timers { display: flex; justify-content: flex-start; flex-wrap: nowrap; gap: 6px; overflow-x: auto; scrollbar-width: none; margin-bottom: 8px; }
  .fa-phone-timers:empty { display: none; }
  .fa-alone .fa-fold summary .fa-scale { display: none; }
  .fa-pot { display: flex; flex-direction: column; gap: 8px; }
  .fa-ings { flex: none; max-height: 45vh; padding: 10px 16px; }
  .fa-fold summary { margin: 0; cursor: pointer; }
  .fa-fold[open] summary { margin-bottom: 6px; }
  .fa-count { display: inline; }
  .fa-fold summary::after { content: "▾"; margin-left: auto; color: var(--muted); }
  .fa-fold[open] summary::after { content: "▴"; }
  .fa-drum { flex: 1; padding: 0 2px; }
  .fa-step { padding: 14px 16px; }
  .fa-step.fa-done { padding-left: 62px; }
  .fa-tick { left: 12px; top: 14px; width: 40px; height: 40px; font-size: 1.5rem; }
  .fa-text { font-size: 1.75rem; }
  .fa-photo img { width: 100%; max-height: 28vh; }
  .fa-dots { display: none; }
}
@media (prefers-reduced-motion: reduce) { .fa-step { transition: none; } }
`;
