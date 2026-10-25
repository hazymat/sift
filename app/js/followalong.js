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
import { stepsOf, amountText, stepHtml, stepRefs, stepWaits, qtyText, batchName, newBatchName, nextBatchNo, sectionsOf, sectionOf } from './batchbook.js';
import { isoDate } from './days.js';
import { TINTS } from './colours.js';
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
// How many are being cooked (Batch Book's ▶ Cooking pill).
export const cooking = () => kept().tabs.length;
const wide = () => matchMedia('(min-width: 761px)').matches;
// Side by side: 2 on an iPad, 3 on an iPad Pro in landscape, 4 on a big screen (any narrower and the writing is too small to read from the stove).
const columns = () => (matchMedia('(min-width: 1800px)').matches ? 4 : matchMedia('(min-width: 1200px)').matches ? 3 : matchMedia('(min-width: 900px)').matches ? 2 : 1);
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
  const all = await space.list('attachments'), files = all.filter(a => ids.has(a.parent_id) && a.kind === 'image').sort((x, y) => x.created_at.localeCompare(y.created_at));
  const atts = new Map();
  for (const a of files) { if (!atts.has(a.parent_id)) atts.set(a.parent_id, []); atts.get(a.parent_id).push(a); }
  const title = tab.c === 'recipe_makes' ? batchName(rec, recipe?.title) : rec.title || 'Untitled';
  const colour = TINTS.find(c => c.id === recipe?.colour)?.hex || sectionOf(sectionsOf(await store.getSettings(), []), recipe?.type).colour; // its book's colour, as on its card
  return { tab, rec, recipe, space, atts, title, colour, steps: stepsOf(rec), ings: rec.ingredients || [], where: { recipe_id: recipe?.id || null, make_id: tab.c === 'recipe_makes' ? rec.id : null, owner: tab.owner || null, title } };
}

// openFollow({ c: 'recipes' | 'recipe_makes', id, owner, times }): opens Follow along on that one (added as a tab).
export async function openFollow(open) {
  if (!document.getElementById('fa-css')) document.head.append(Object.assign(document.createElement('style'), { id: 'fa-css', textContent: CSS }));
  const k = kept();
  if (open) {
    let n = k.tabs.findIndex(t => t.c === open.c && t.id === open.id);
    if (n < 0) { k.tabs.push({ c: open.c, id: open.id, owner: open.owner || null, times: open.times || 1, at: 0, started: Date.now() }); n = k.tabs.length - 1; }
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
  // Its own page: everything else is hidden while it's open (nothing underneath to scroll or to catch taps), and the page comes back where it was.
  const backTo = scrollY;
  document.body.classList.add('follow-open');
  try { sessionStorage.setItem('sift_follow_open', '1'); } catch {}
  scrollTo(0, 0);
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
    return `<section class="fa-step${done ? ' fa-done' : ''}" data-n="${n}"><div class="fa-num">${done ? '<span class="fa-tick" aria-label="Done">✓</span>' : ''}Step ${n + 1}<span class="fa-of"> of ${p.steps.length}</span></div>
      <div class="fa-text">${stepHtml(st.text, p.ings, p.tab.times, esc) || '<span class="muted">Empty step</span>'}</div>
      <div class="fa-extra">${photo(p, st)}${starts}${doneBtn(p, n, done)}</div></section>`;
  };
  // The last step ticked: under it, how long it took (to save on the recipe), a photo (on the recipe or the batch),
  // Save as a batch (a recipe), then ✓ Finish (puts it away, with its timers).
  const tookMin = p => Math.max(1, Math.round(((p.tab.finished || Date.now()) - (p.tab.clock || p.tab.started || Date.now())) / 60000));
  // ⏱ Start the clock (above the first step) notes when the cook began; then its title shows "Started 18:42 · 25 min".
  const clockText = p => `Started ${new Date(p.tab.clock).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} · ${timeText(Math.max(0, Math.floor(((p.tab.finished || Date.now()) - p.tab.clock) / 60000)))}`;
  const clockHtml = p => (p.tab.clock ? `<span class="fa-clock" data-clock="${p.tab.id}">⏱ ${clockText(p)}</span>` : '');
  const timeText = mins => [Math.floor(mins / 60) ? `${Math.floor(mins / 60)} h` : '', mins % 60 ? `${mins % 60} min` : ''].filter(Boolean).join(' ') || '0 min';
  // Nothing is saved until ✓ Finish: the card only gathers what to keep (time on the recipe, photos, a new batch).
  const saveTime = p => p.tab.save_time !== false && !!p.recipe;
  const batchTarget = p => p.tab.c === 'recipe_makes' || !!p.tab.new_batch;
  const photosOnBatch = p => batchTarget(p) && p.tab.photo_to !== 'recipe';
  const willDo = p => {
    const n = (p.files || []).length, list = [];
    if (saveTime(p)) list.push('save the time on the recipe');
    if (p.tab.new_batch) list.push('keep it as a batch');
    if (n) list.push(`add ${n === 1 ? 'the photo' : `${n} photos`} to the ${photosOnBatch(p) ? 'batch' : 'recipe'}`);
    return list.length ? `Finish will ${list.join(', ').replace(/, ([^,]*)$/, ' and $1')}.` : 'Finish puts it away.';
  };
  const toggle = (key, on, label) => `<button type="button" class="fa-switch" role="switch" aria-checked="${on}" data-end-toggle="${key}" aria-label="${label}"><i></i></button>`;
  const endHtml = p => {
    if (!p.steps.length || !isDone(p, p.steps[p.steps.length - 1])) return '';
    const mins = p.tab.took ?? tookMin(p), said = p.recipe?.fields?.Time, files = p.files || [];
    const row = (label, value, action) => `<div class="fa-end-row"><dt>${label}</dt><dd>${value}</dd><div class="fa-end-act">${action}</div></div>`;
    const time = p.editTime
      ? `<span class="fa-end-time"><input type="number" inputmode="numeric" min="0" data-took="h" value="${Math.floor(mins / 60)}" aria-label="Hours"> h <input type="number" inputmode="numeric" min="0" max="59" data-took="m" value="${mins % 60}" aria-label="Minutes"> min</span><button type="button" class="fa-end-ok" data-end="time-ok">Done</button>`
      : `<b class="fa-end-big">${timeText(mins)}</b><button type="button" class="fa-end-edit" data-end="edit-time" title="Change it" aria-label="Change the time">✎</button>`;
    return `<section class="fa-end" data-end-of="${p.tab.id}">
      <header><span class="fa-end-badge">✓</span><div><h3>All done</h3><small>${esc(p.title)}${p.tab.c === 'recipes' && p.tab.times !== 1 ? ` · ×${qtyText(p.tab.times || 1)}` : ''}</small></div></header>
      <dl>
        ${row('Time taken', `${time}<small>${p.recipe ? `Save it on the recipe${said ? ` (it says ${esc(said)} now)` : ''}` : ''}</small>`, p.recipe ? toggle('save_time', saveTime(p), 'Save the time on the recipe') : '')}
        ${p.tab.c === 'recipes' ? row('New batch', '<span>Keep this cook as a batch</span><small>Marked done, with its time and photos</small>', toggle('new_batch', !!p.tab.new_batch, 'Keep this cook as a batch')) : ''}
        ${row('Photos', `${files.length ? `<span class="fa-end-pics">${files.map((f, n) => `<button type="button" class="fa-end-pic" data-end-drop="${n}" title="Take this one out" aria-label="Take this photo out"><img src="${f.url}" alt=""><i>✕</i></button>`).join('')}</span>` : '<span class="muted">None yet</span>'}${batchTarget(p) ? `<span class="segmented fa-end-to" aria-label="Photos go on">${[['recipe', '📖 On the recipe'], ['batch', '🧪 On the batch']].map(([v, l]) => `<button type="button" data-end-to="${v}" aria-pressed="${(v === 'batch') === photosOnBatch(p)}">${l}</button>`).join('')}</span>` : ''}`, '<button type="button" data-end="photo">📷 Add</button>')}
      </dl>
      <footer><small>${willDo(p)}</small><button type="button" class="fa-end-finish" data-end="finish">✓ Finish</button></footer>
    </section>`;
  };
  // One pot: its ingredients (folded unless it's the only one on a wide screen) and its drum of steps.
  const potHtml = (p, n, { alone }) => `<div class="fa-pot${alone ? ' fa-alone' : ''}" data-pot="${n}" data-slot="${n}" style="--pot:${p.colour}">
      ${alone && pots.length < 2 ? '' : `<div class="fa-pot-head"><div class="fa-pot-line"><b${alone ? '' : ` data-drag="${n}" title="Drag sideways to another place"`}>${esc(p.title)}</b>${clockHtml(p)}</div>${alone ? '' : scaleHtml(p)}</div>`}
      <aside class="fa-ings"><details class="fa-fold"${alone && wide() ? ' open' : ''}><summary><span>🧺 Ingredients</span><span class="muted fa-count">${p.ings.length}</span>${alone ? scaleHtml(p) : ''}</summary>${alone ? `<div class="fa-fold-scale">${scaleHtml(p)}</div>` : ''}<div class="fa-ing-body"></div></details></aside>
      <div class="fa-drum" tabindex="-1"><div class="fa-drum-top">${!p.steps.length ? '' : p.tab.clock ? clockHtml(p) : '<button type="button" class="fa-start-clock" data-fa="clock" title="Notes the time now, so you know how long it took">⏱ Start the clock</button>'}</div>${p.steps.length ? p.steps.map((st, s) => stepOf(p, st, s)).join('') + endHtml(p) : '<p class="muted fa-none">No steps yet.</p>'}</div>
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
      if (done && !p.tab.started) p.tab.started = Date.now(); // opened before cooks were timed
      if (n === p.steps.length - 1) { if (done) p.tab.finished = Date.now(); else delete p.tab.finished; delete p.tab.took; }
      save();
      const old = items()[n], fresh = document.createElement('div');
      fresh.innerHTML = stepOf(p, st, n);
      const step = fresh.firstElementChild;
      step.className = old.className.replace(/\s*fa-done/, '') + (done ? ' fa-done' : '');
      step.style.cssText = old.style.cssText;
      old.replaceWith(step);
      if (done && n < p.steps.length - 1) me.goTo(n + 1);
      else me.roll();
      // The last one: the All done card comes (or goes) under the steps, and is rolled to.
      if (n === p.steps.length - 1) {
        d.querySelector('.fa-end')?.remove();
        if (done) { delete p.editTime; d.insertAdjacentHTML('beforeend', endHtml(p)); requestAnimationFrame(() => { const end = d.querySelector('.fa-end'); if (end) d.scrollTo({ top: end.offsetTop + end.offsetHeight / 2 - d.clientHeight / 2, behavior: 'smooth' }); }); }
      }
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

  const tabsHtml = () => `<div class="fa-tabs" role="tablist">${pots.map((p, n) => `<span class="fa-tab${n === k.at ? ' on' : ''}${sideBySide() && n < showing() ? ' fa-shown' : ''}" role="tab" aria-selected="${n === k.at}" data-slot="${n}" data-tab="${n}"${pots.length > 1 ? ` data-drag="${n}"` : ''}><button type="button" class="fa-tab-go" data-tab="${n}">${esc(p.title)}</button>${pots.length > 1 ? `<button type="button" class="fa-tab-x" data-tab-x="${n}" title="Put this one away" aria-label="Put ${esc(p.title)} away">✕</button>` : ''}</span>`).join('')}
    <button type="button" class="fa-tab-add" data-fa="add" title="Cook another recipe at the same time">+ Recipe</button>
    ${pots.length > 1 && columns() > 1 ? `<button type="button" class="fa-side" data-fa="side" aria-pressed="${!!k.side}" title="Show several at once: the first tabs, in their order (drag a tab sideways to change it)">◫ Side by side</button>` : ''}</div>`;
  let ro = null;
  function draw() {
    ro?.disconnect();
    const side = sideBySide();
    const cols = side ? Math.min(columns(), pots.length) : 1;
    // Side by side: the first tabs, in their order (the one being cooked from is always among them).
    if (side && k.at >= cols) { move(k.at, cols - 1); k.at = cols - 1; save(); }
    const which = side ? Array.from({ length: cols }, (_, n) => n) : [k.at];
    el.innerHTML = `<div class="fa-top"><button type="button" class="back" data-fa="close">‹ Back${keys('Esc')}</button>
        <h1${pots.length > 1 ? '' : ` class="fa-title" style="--pot:${pots[k.at].colour}"`}>${pots.length > 1 ? 'Follow along' : esc(pots[k.at].title)}</h1>${pots.length > 1 ? '' : clockHtml(pots[k.at])}        <div class="fa-timers" aria-label="Timers"></div><button type="button" class="fa-add" data-fa="timer" title="A countdown or a stopwatch" aria-label="New timer">⏰ +<span class="fa-word"> Timer</span></button>
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
  const showing = () => Math.min(columns(), pots.length);
  // A tab not showing, tapped side by side: it takes the place of the one being cooked from.
  const switchTo = n => {
    n = (n + pots.length) % pots.length;
    if (sideBySide() && n >= showing()) { const into = Math.min(k.at, showing() - 1); [pots[into], pots[n]] = [pots[n], pots[into]]; n = into; }
    k.at = n; save(); draw();
  };
  const move = (from, to) => { const p = pots.splice(from, 1)[0]; pots.splice(to, 0, p); };
  // Dragging a whole tab (or, side by side, a recipe's title) sideways changes the order: the others make way round a dotted gap.
  // Mouse: after a few pixels. Touch: after holding still a moment, so a quick swipe still scrolls the tabs.
  let lift = null, dragged = 0;
  el.addEventListener('pointerdown', ev => {
    const item0 = ev.target.closest('[data-drag]');
    if (!item0 || ev.button > 0 || ev.target.closest('.fa-tab-x')) return;
    const item = item0.closest('[data-slot]'), kind = item.classList.contains('fa-tab') ? '.fa-tab' : '.fa-pot', from = +item0.dataset.drag, x0 = ev.clientX, y0 = ev.clientY, touchy = ev.pointerType === 'touch';
    let gap = null, grabX = 0, hold = touchy ? setTimeout(() => start(x0), 300) : 0;
    const start = x => {
      const box = item.getBoundingClientRect();
      gap = document.createElement(kind === '.fa-tab' ? 'span' : 'div');
      gap.className = 'fa-gap'; gap.style.cssText = `width:${box.width}px;height:${box.height}px`;
      item.before(gap);
      grabX = x - box.left;
      Object.assign(item.style, { position: 'fixed', left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`, margin: '0' });
      item.classList.add('fa-lifted'); lift = item;
    };
    const moved = e => {
      if (!gap) {
        if (touchy) { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 8) { clearTimeout(hold); done(); } return; }
        if (Math.abs(e.clientX - x0) < 6) return;
        start(x0);
      }
      item.style.left = `${e.clientX - grabX}px`; // side to side only
      const others = [...el.querySelectorAll(`${kind}[data-slot]`)].filter(x => x !== item);
      const next = others.find(x => { const r = x.getBoundingClientRect(); return e.clientX < r.left + r.width / 2; });
      if (next) { if (gap.nextElementSibling !== next) next.before(gap); } else if (others.length && others.at(-1).nextElementSibling !== gap) others.at(-1).after(gap);
    };
    const done = () => {
      clearTimeout(hold);
      removeEventListener('pointermove', moved); removeEventListener('pointerup', up); removeEventListener('pointercancel', done);
      if (!gap) return;
      const to = [...el.querySelectorAll(`${kind}[data-slot], .fa-gap`)].filter(x => x !== item).indexOf(gap);
      gap.remove(); item.removeAttribute('style'); item.classList.remove('fa-lifted'); lift = null; dragged = Date.now();
      return to;
    };
    const up = () => { const to = done(); if (to == null || to < 0 || to === from) return; move(from, to); k.at = to; save(); draw(); };
    addEventListener('pointermove', moved); addEventListener('pointerup', up); addEventListener('pointercancel', done);
  });
  el.addEventListener('touchmove', ev => { if (lift) ev.preventDefault(); }, { passive: false }); // a held tab drags instead of scrolling
  el.addEventListener('click', ev => { if (Date.now() - dragged < 400) { ev.stopPropagation(); ev.preventDefault(); } }, true); // the drop isn't a tap
  el.addEventListener('contextmenu', ev => { if (ev.target.closest('[data-drag]')) ev.preventDefault(); });

  const clockTick = setInterval(() => el.querySelectorAll('[data-clock]').forEach(c => { const p = pots.find(x => x.tab.id === c.dataset.clock); if (p?.tab.clock) c.textContent = `⏱ ${clockText(p)}`; }), 15000);
  const drawTimers = list => el.querySelectorAll('.fa-timers').forEach(box => { box.innerHTML = list.map(t => timers.pillHtml(t, Date.now(), { recipe: pots.length > 1 })).join(''); });
  const unwatch = timers.watch(drawTimers);
  // A recipe or batch being cooked from that changes (here or on another device) is read again and drawn, at the same step.
  let fresher = 0;
  const unsub = store.subscribe(ev => {
    if (ev.collection && !['recipes', 'recipe_makes', 'attachments'].includes(ev.collection)) return;
    clearTimeout(fresher);
    fresher = setTimeout(async () => {
      if (!el.isConnected || document.querySelector('dialog[open]')) return;
      const again = await Promise.all(pots.map(p => loadTab(p.tab)));
      if (!el.isConnected || again.some(x => !x)) return;
      again.forEach((x, n) => { x.files = pots[n].files; x.editTime = pots[n].editTime; }); // photos chosen for the end, not saved yet
      pots.splice(0, pots.length, again[0]); for (let n = 1; n < again.length; n++) pots.push(again[n]);
      draw();
    }, 500);
  });
  let lastCols = columns();
  const onResize = () => { if (columns() !== lastCols) { lastCols = columns(); if (pots.length > 1) draw(); } };
  addEventListener('resize', onResize);
  draw();

  // + Recipe: another recipe, or a batch on the go, to cook alongside.
  async function addPot() {
    const [recipes, makes] = await Promise.all([store.local.list('recipes', { filter: r => !r.archived_at }), store.local.list('recipe_makes', { filter: m => !m.archived_at })]);
    const titleOf = id => recipes.find(r => r.id === id)?.title;
    const open = new Set(pots.map(p => p.tab.id));
    // Recipes first; batches (there can be hundreds) folded in their own panel, newest first, opened by a search that finds one.
    const recipeRows = recipes.filter(r => !open.has(r.id)).sort((a, b) => (a.title || '').localeCompare(b.title || '')).map(r => ({ c: 'recipes', id: r.id, label: r.title || 'Untitled' }));
    const batchRows = makes.filter(m => !open.has(m.id)).sort((a, b) => (b.date || b.created_at || '').localeCompare(a.date || a.created_at || '')).map(m => ({ c: 'recipe_makes', id: m.id, label: `🧪 ${batchName(m, titleOf(m.recipe_id))}` }));
    const rows = recipeRows.concat(batchRows);
    const pick = (r, n) => `<button type="button" data-pick="${n}">${esc(r.label)}</button>`;
    const dlg = document.createElement('dialog');
    dlg.className = 'sheet fa-pick';
    dlg.innerHTML = `<div class="sheet-handle"></div><h2>Cook another at the same time</h2><input type="search" class="fa-pick-q" placeholder="Search recipes and batches…" aria-label="Search recipes and batches">
      <div class="fa-pick-list">${recipeRows.map(pick).join('')}
        ${batchRows.length ? `<details class="fa-pick-batches"><summary>🧪 Batches <span class="muted">${batchRows.length}</span></summary><div class="fa-pick-list">${batchRows.map((r, n) => pick(r, recipeRows.length + n)).join('')}</div></details>` : ''}
        ${rows.length ? '' : '<p class="muted">Nothing else to add.</p>'}</div>`;
    document.body.append(dlg);
    const q = dlg.querySelector('.fa-pick-q'), fold = dlg.querySelector('.fa-pick-batches');
    q.addEventListener('input', () => {
      const w = q.value.trim().toLowerCase();
      dlg.querySelectorAll('[data-pick]').forEach(b => { b.hidden = !!w && !b.textContent.toLowerCase().includes(w); });
      if (fold) { const hits = [...fold.querySelectorAll('[data-pick]')].filter(b => !b.hidden).length; fold.hidden = !!w && !hits; if (w) fold.open = hits > 0; }
    });
    let chosen = null;
    dlg.addEventListener('click', ev => { const b = ev.target.closest('[data-pick]'); if (b) { chosen = rows[+b.dataset.pick]; dlg.close(); } });
    dlg.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target === q) { const b = [...dlg.querySelectorAll('[data-pick]')].find(x => !x.hidden); if (b) { ev.preventDefault(); b.click(); } } });
    await new Promise(resolve => { dlg.addEventListener('close', () => { dlg.remove(); resolve(); }); dlg.showModal(); q.focus(); });
    if (!chosen) return;
    const p = await loadTab({ c: chosen.c, id: chosen.id, owner: null, times: 1, at: 0, started: Date.now() });
    if (!p) return;
    pots.push(p);
    k.at = pots.length - 1;
    save();
    draw();
  }

  // ---------- the end of one ----------
  const endOf = p => shown.find(x => x.pot === p)?.box.querySelector('.fa-end');
  const redrawEnd = p => { const box = endOf(p); if (box) box.outerHTML = endHtml(p); shown.find(x => x.pot === p)?.later(); };
  const tookFrom = (p, box) => { const h = box?.querySelector('[data-took="h"]'), m = box?.querySelector('[data-took="m"]'); if (h) { p.tab.took = Math.max(0, Math.round((+h.value || 0) * 60 + (+m.value || 0))); save(); } return p.tab.took ?? tookMin(p); };
  async function endAction(p, b) {
    const box = endOf(p), act = b.dataset.end;
    if (p.editTime && act !== 'edit-time') { tookFrom(p, box); if (act !== 'finish') delete p.editTime; }
    if (b.dataset.endTo) { p.tab.photo_to = b.dataset.endTo; save(); return redrawEnd(p); }
    if (b.dataset.endToggle) { const key = b.dataset.endToggle; p.tab[key] = b.getAttribute('aria-checked') !== 'true'; save(); return redrawEnd(p); }
    if (b.dataset.endDrop) { const f = p.files.splice(+b.dataset.endDrop, 1)[0]; URL.revokeObjectURL(f.url); return redrawEnd(p); }
    if (act === 'edit-time') { p.editTime = true; redrawEnd(p); return endOf(p)?.querySelector('[data-took="h"]')?.focus(); }
    if (act === 'time-ok') return redrawEnd(p);
    if (act === 'photo') {
      const pick = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', multiple: true });
      pick.addEventListener('change', () => { p.files = (p.files || []).concat([...pick.files].map(file => ({ file, url: URL.createObjectURL(file) }))); redrawEnd(p); });
      return pick.click();
    }
    if (act === 'finish') return commit(p);
  }
  // ✓ Finish: what the card says is saved, then it's put away (with its timers). Undo takes all of it back.
  async function commit(p) {
    delete p.editTime;
    store.useSpace(p.tab.owner ? p.space : null);
    const done = [], undo = [], text = timeText(tookFrom(p, endOf(p))), r = p.recipe;
    if (saveTime(p)) {
      const old = r.fields;
      await store.update('recipes', r.id, { fields: Object.assign({}, old, { Time: text }) });
      undo.push(() => store.update('recipes', r.id, { fields: old }));
      if (p.tab.c === 'recipe_makes') { const oldM = p.rec.fields; await store.update('recipe_makes', p.rec.id, { fields: Object.assign({}, oldM, { Time: text }) }); undo.push(() => store.update('recipe_makes', p.rec.id, { fields: oldM })); }
      done.push(`time saved (${text})`);
    }
    let batch = p.tab.c === 'recipe_makes' ? p.rec.id : null;
    if (p.tab.c === 'recipes' && p.tab.new_batch) {
      // As Make this does, kept as a record of this cook: at its scale, with the time it took, marked done.
      const times = p.tab.times || 1, day = isoDate(new Date());
      const [makes, recipes, files] = await Promise.all([store.list('recipe_makes'), store.list('recipes'), store.list('attachments')]);
      const steps = stepsOf(r).map(x => ({ id: store.uuidv7(), text: x.text, from: x.id }));
      const m = await store.create('recipe_makes', {
        recipe_id: r.id, name: newBatchName(r.title, day), batch_no: nextBatchNo(makes, recipes, r.type), date: day, status: 'done',
        description: r.description || '', state: '', back_sweetened: false, fields: Object.assign({}, r.fields, { Time: text }),
        ingredients: (r.ingredients || []).map(i => Object.assign({}, i, { qty: i.qty == null ? null : i.qty * times })), steps, stock: {}, list_id: null,
      });
      for (const x of steps) for (const a of files.filter(f => f.parent_id === x.from && !f.deleted_at)) await store.create('attachments', { parent_collection: 'recipe_makes', parent_id: x.id, blob_id: a.blob_id, name: a.name, mime: a.mime, kind: a.kind, size: a.size, thumb: a.thumb });
      batch = m.id;
      undo.push(() => store.remove('recipe_makes', m.id));
      done.push('batch kept');
    }
    if ((p.files || []).length) {
      const onBatch = batch && p.tab.photo_to !== 'recipe';
      const made = await att.addFiles(onBatch ? { collection: 'recipe_makes', id: batch } : { collection: 'recipes', id: r.id }, p.files.map(f => f.file));
      undo.push(async () => { for (const a of made) await store.remove('attachments', a.id); });
      if (made.length) done.push(`${made.length === 1 ? 'photo' : `${made.length} photos`} added`);
      p.files.forEach(f => URL.revokeObjectURL(f.url)); p.files = [];
    }
    const takeBack = async () => { store.useSpace(p.tab.owner ? p.space : null); for (const fn of undo.reverse()) await fn(); };
    const said = `Finished ${p.title}${done.length ? `: ${done.join(', ')}` : ''}`;
    if (pots.length < 2) return finish({ said, takeBack });
    // Just this one (and its timers) goes.
    const at = pots.indexOf(p), was = k.at, going = timers.list().filter(t => t.make_id === p.tab.id || (t.recipe_id === p.tab.id && !t.make_id));
    for (const t of going) await store.local.remove('timers', t.id);
    pots.splice(at, 1);
    if (k.at >= pots.length || at < k.at) k.at = Math.max(0, k.at - 1);
    save(); draw();
    toast(said, { action: 'Undo', onAction: async () => { await takeBack(); for (const t of going) await store.local.restore('timers', t.id); if (!el.isConnected) return; pots.splice(Math.min(at, pots.length), 0, p); k.at = was; save(); draw(); } });
  }

  // Finished cooking: these recipes and their timers go, with Undo in the message (no asking first).
  async function finish({ said = '', takeBack = null } = {}) {
    const ids = new Set(pots.map(p => p.tab.id));
    const going = timers.list().filter(t => ids.has(t.make_id) || ids.has(t.recipe_id));
    const was = JSON.parse(JSON.stringify(k));
    for (const t of going) await store.local.remove('timers', t.id);
    pots.length = 0;
    k.at = 0;
    save();
    close();
    toast(said || (going.length ? `Finished cooking: ${going.length === 1 ? '1 timer' : `${going.length} timers`} stopped` : 'Finished cooking'), { action: 'Undo', onAction: async () => {
      await takeBack?.();
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
    unsub();
    clearTimeout(fresher);
    clearInterval(clockTick);
    removeEventListener('keydown', onKey, true);
    removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    lock?.release?.().catch(() => {});
    urls.forEach(u => URL.revokeObjectURL(u));
    el.remove();
    document.body.classList.remove('follow-open');
    try { sessionStorage.removeItem('sift_follow_open'); } catch {}
    scrollTo(0, backTo);
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
    if (timers.onClick(ev, { open: t => { const n = pots.findIndex(p => p.tab.id === (t.make_id || t.recipe_id)); if (n >= 0) switchTo(n); }, places: pots.map(p => p.where) })) return;
    const b = ev.target.closest('button, .fa-step, summary, .fa-tab');
    if (!b) return;
    const box = b.closest('[data-pot]');
    const s = box ? shown.find(x => x.box === box) : focused();
    if (b.matches('summary') && box?.classList.contains('fa-alone') && wide()) ev.preventDefault(); // always open beside the steps
    if (box && +box.dataset.pot !== k.at && sideBySide()) { k.at = +box.dataset.pot; save(); el.querySelectorAll('.fa-tab').forEach((t, n) => t.classList.toggle('on', n === k.at)); }
    if (b.dataset.fa === 'close') return close();
    if (b.dataset.fa === 'timer') return timers.newTimerSheet(focused()?.pot.where || {});
    if (b.dataset.fa === 'add') return addPot();
    if (b.dataset.fa === 'finish') return finish();
    if (b.dataset.fa === 'clock') { const p = s?.pot || pots[k.at]; p.tab.clock = Date.now(); delete p.tab.took; save(); return draw(); }
    if (b.dataset.fa === 'side') { k.side = !k.side; save(); return draw(); }
    if (b.dataset.tab) return switchTo(+b.dataset.tab);
    if (b.dataset.tabX) {
      // Put away, with Undo in the message: it comes back in the same place.
      const at = +b.dataset.tabX, was = k.at, gone = pots.splice(at, 1)[0];
      if (k.at >= pots.length || at < k.at) k.at = Math.max(0, k.at - 1);
      save(); draw();
      return toast(`${gone.title} put away`, { action: 'Undo', onAction: () => { if (!el.isConnected) return; pots.splice(Math.min(at, pots.length), 0, gone); k.at = was; save(); draw(); } });
    }
    if (b.dataset.scale) { ev.preventDefault(); const p = s?.pot || pots[k.at]; p.tab.times = +b.dataset.scale; save(); (shown.find(x => x.pot === p) || s)?.rescale(); return; }
    if (b.dataset.wait) {
      // One timer per step: a second tap shows the one already going instead of starting another.
      const where = s.pot.where, going = timers.list().find(t => t.name === b.dataset.name && t.recipe_id === where.recipe_id && (t.make_id || null) === (where.make_id || null));
      if (!going) return timers.start(Object.assign({}, where, { name: b.dataset.name, secs: +b.dataset.wait }));
      el.querySelectorAll(`[data-timer="${going.id}"]`).forEach(pill => { pill.classList.remove('tm-flash'); void pill.offsetWidth; pill.classList.add('tm-flash'); });
      return toast(`${going.name} is already going: tap its time for more`);
    }
    if (b.dataset.end || b.dataset.endTo || b.dataset.endToggle || b.dataset.endDrop) return endAction(s?.pot || pots[k.at], b);
    if (b.dataset.done) { const n = +b.closest('.fa-step').dataset.n; return s?.mark(n, b.dataset.done === '1'); }
    if (b.dataset.photo) { const list = s.pot.atts.get(s.pot.steps[+b.closest('.fa-step').dataset.n].id) || []; return att.view(list, Math.max(0, list.findIndex(a => a.id === b.dataset.photo))); }
    if (b.matches('.fa-step') && !b.classList.contains('fa-cur')) s?.goTo(+b.dataset.n);
  });
  return { close };
}

const CSS = `
html:has(body.follow-open), body.follow-open { overflow: hidden; }
body.follow-open #update-banner { z-index: 950; bottom: calc(16px + var(--safe-bottom)); } /* a new version shows here too; Reload comes back to Follow along */
body.follow-open > :is(.appbar, #main, #tabbar, #timer-dock, .select-bar:not(.tm-bar)) { display: none !important; }
.fa-screen { position: relative; height: 100dvh; z-index: 900; background: var(--bg); background-image: var(--bg-image, none); color: var(--text); display: flex; flex-direction: column; padding: calc(10px + var(--safe-top)) clamp(10px, 2vw, 22px) calc(10px + var(--safe-bottom)); }
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
.fa-tab.fa-shown:not(.on) { border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
.fa-tab, .fa-pot-head b[data-drag] { cursor: pointer; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
.fa-pot-head b[data-drag] { cursor: grab; }
@media (hover: hover) { .fa-tab:not(.on):hover { background: var(--glass-hover); } }
.fa-lifted { z-index: 20; background: var(--bg) !important; backdrop-filter: blur(12px); outline: 2px solid var(--active-border); box-shadow: var(--shadow); cursor: grabbing; transition: none !important; }
.fa-gap { flex: none; box-sizing: border-box; border: 2px dashed var(--active-border); border-radius: 18px; opacity: .8; }
.fa-tab button, .fa-tab button:hover:not(:disabled), .fa-tab button:active { background: none; box-shadow: none; border: 0; -webkit-tap-highlight-color: transparent; }
.fa-tab-go { padding-left: 14px; font-weight: 600; max-width: 16em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fa-tab-x { padding: 6px 10px 6px 2px; color: var(--muted); }
.fa-tab-add, .fa-side { flex: none; }
.fa-side[aria-pressed="true"], .fa-side[aria-pressed="true"]:hover { background: var(--active-bg); border-color: var(--active-border); } /* on at once, even under a finger (a touch screen keeps :hover on what was tapped) */
@media (hover: none) { .fa-side[aria-pressed="false"]:hover { background: var(--glass); } }
.fa-side[aria-pressed="true"] { background: var(--active-bg); border-color: var(--active-border); }
.fa-tabs:has(.fa-tab:only-of-type) .fa-tab { display: none; }
.fa-tabs:has(.fa-tab:only-of-type) { justify-content: flex-end; margin: -6px 0 4px; }
.fa-grid { flex: 1; min-height: 0; display: flex; position: relative; z-index: 1; }
.fa-pot { flex: 1; min-width: 0; min-height: 0; display: grid; grid-template-columns: minmax(240px, 1fr) 2fr; gap: 18px; position: relative; }
.fa-side-by-side { display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: 14px; }
.fa-side-by-side .fa-pot { display: flex; flex-direction: column; gap: 8px; background: color-mix(in srgb, var(--text) 3%, transparent); border: 1px solid var(--glass-border); border-radius: 22px; padding: 10px; }
.fa-pot-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 2px 6px 8px; margin-bottom: 8px; border-bottom: 3px solid var(--pot, var(--accent)); }
.fa-pot-head b { font-size: clamp(1.3rem, 2vw, 1.75rem); font-weight: 650; flex: 1 1 100%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fa-alone > .fa-pot-head { grid-column: 1 / -1; }
.fa-alone:has(> .fa-pot-head) { grid-template-rows: auto minmax(0, 1fr); }
.fa-top h1.fa-title { font-size: clamp(1.4rem, 2.4vw, 1.9rem); padding-bottom: 4px; border-bottom: 3px solid var(--pot, var(--accent)); flex: 0 1 auto; margin-right: auto; }
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
.fa-drum::after { content: ""; display: block; height: 42%; }
.fa-drum-top { height: 42%; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 22px; box-sizing: border-box; }
.fa-start-clock { min-height: 44px; padding: 0 20px; font-weight: 600; border-radius: 22px; }
.fa-clock { flex: none; margin-left: auto; color: var(--muted); font-size: .9rem; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.fa-drum-top .fa-clock { margin: 0; } /* the clock where the button was: phones, one recipe (the top bar has no room) */
@media (min-width: 761px) { .fa-drum-top .fa-clock { display: none; } }
@media (max-width: 760px) { .fa-top > .fa-clock { display: none; } }
.fa-pot:has(.fa-pot-head .fa-clock) .fa-drum-top .fa-clock { display: none; }
.fa-pot-line { flex: 1 1 100%; display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.fa-pot-line b { flex: 1 1 auto; }
.fa-step { scroll-snap-align: center; margin: 0 auto 14px; padding: 18px 24px; border-radius: 26px; border: 1px solid transparent; transition: background .25s, border-color .25s; will-change: transform; cursor: pointer; }
.fa-step.fa-cur { background: color-mix(in srgb, var(--text) 7%, transparent); border-color: var(--glass-border); cursor: default; }
.fa-num { display: flex; align-items: center; font-size: .8rem; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
.fa-cur .fa-num { color: var(--accent); }
.fa-of { display: none; }
.fa-cur .fa-of { display: inline; margin-left: .4em; }
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
.fa-tick { display: inline-grid; place-items: center; width: 22px; height: 22px; flex: none; margin-right: 8px; border-radius: 50%; background: rgb(52, 168, 83); color: #fff; font-size: .85rem; font-weight: 800; letter-spacing: 0; box-shadow: 0 2px 8px rgba(52, 168, 83, .45); animation: fa-tick .35s cubic-bezier(.2, 1.6, .4, 1); }
.fa-done .fa-text { opacity: .62; }
.fa-end { scroll-snap-align: center; max-width: 560px; margin: 26px auto 14px; padding: 18px 20px 16px; border-radius: 24px; background: color-mix(in srgb, rgb(52, 168, 83) 10%, var(--glass-strong)); border: 1px solid color-mix(in srgb, rgb(52, 168, 83) 40%, transparent); box-shadow: var(--shadow); font-size: 1rem; text-align: left; animation: fa-end-in .3s ease-out; }
.fa-end header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.fa-end-badge { display: grid; place-items: center; width: 40px; height: 40px; flex: none; border-radius: 50%; background: rgb(52, 168, 83); color: #fff; font-weight: 800; font-size: 1.2rem; box-shadow: 0 3px 12px rgba(52, 168, 83, .45); }
.fa-end h3 { margin: 0; font-size: 1.35rem; line-height: 1.15; color: var(--text); }
.fa-end header small { color: var(--muted); font-size: .88rem; }
.fa-end dl { margin: 0; }
.fa-end-row { display: grid; grid-template-columns: 7.5em minmax(0, 1fr) auto; align-items: center; gap: 4px 12px; min-height: 56px; padding: 8px 0; border-top: 1px solid var(--glass-border); }
.fa-end dt { color: var(--muted); font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; font-weight: 600; }
.fa-end dd { margin: 0; display: flex; align-items: center; flex-wrap: wrap; gap: 2px 8px; min-width: 0; }
.fa-end dd small { flex-basis: 100%; color: var(--muted); font-size: .82rem; }
.fa-end-big { font-size: 1.25rem; font-variant-numeric: tabular-nums; }
.fa-end-edit { width: 34px; height: 34px; padding: 0; border-radius: 50%; display: grid; place-items: center; background: none; box-shadow: none; border-color: transparent; color: var(--muted); }
.fa-end-time { display: inline-flex; align-items: center; gap: 6px; }
.fa-end-time input { width: 3.4em; min-height: 40px; text-align: center; font-size: 1.05rem; padding: 4px; }
.fa-end-act { justify-self: end; }
.fa-end-act > button:not(.fa-switch) { min-width: 96px; min-height: 40px; }
.fa-end-pics { display: flex; gap: 6px; flex-wrap: wrap; }
.fa-end-pics img { width: 46px; height: 46px; object-fit: cover; display: block; }
.fa-end footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding-top: 12px; border-top: 1px solid var(--glass-border); }
.fa-end footer small { flex: 1; color: var(--muted); font-size: .85rem; }
.fa-switch { position: relative; width: 52px; height: 32px; padding: 0; border-radius: 16px; flex: none; background: color-mix(in srgb, var(--text) 18%, transparent); border: 1px solid var(--glass-border); box-shadow: none; transition: background .2s; }
.fa-switch i { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, .3); transition: transform .2s; }
.fa-switch[aria-checked="true"], .fa-switch[aria-checked="true"]:hover { background: rgb(52, 168, 83); border-color: transparent; }
.fa-switch[aria-checked="true"] i { transform: translateX(20px); }
.fa-end-pic { position: relative; padding: 0; width: 46px; height: 46px; border-radius: 10px; overflow: hidden; border: 0; box-shadow: none; }
.fa-end-pic i { position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; border-radius: 50%; background: rgba(0, 0, 0, .6); color: #fff; font-style: normal; font-size: .6rem; display: grid; place-items: center; }
.fa-end-to { flex-basis: 100%; margin-top: 4px; width: max-content; max-width: 100%; display: inline-flex; flex-wrap: nowrap; }
.fa-end-to button { white-space: nowrap; padding: 4px 10px; font-size: .85rem; min-height: 34px; }
.fa-end-ok { min-height: 40px; }
.fa-end-finish { min-height: 46px; padding: 0 26px; font-weight: 700; background: rgba(52, 168, 83, .85); color: #fff; border-color: transparent; }
.fa-end-finish:hover:not(:disabled) { background: rgb(52, 168, 83); }
@media (max-width: 520px) { .fa-end-row { grid-template-columns: minmax(0, 1fr) auto; } .fa-end dt { grid-column: 1 / -1; } .fa-end-act > button:not(.fa-switch) { min-width: 0; } }
@keyframes fa-end-in { from { opacity: 0; transform: translateY(8px); } }
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
.fa-pick-batches > summary { padding: 10px 14px; font-weight: 600; cursor: pointer; border-radius: 14px; background: var(--glass); }
.fa-pick-batches > .fa-pick-list { max-height: none; overflow: visible; margin-top: 6px; }
.fa-pick-batches[hidden] { display: none; }
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
  .fa-text { font-size: 1.75rem; }
  .fa-photo img { width: 100%; max-height: 28vh; }
  .fa-dots { display: none; }
}
@media (prefers-reduced-motion: reduce) { .fa-step { transition: none; } }
`;
