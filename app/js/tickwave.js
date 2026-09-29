// Ticking something off, the happy way (Tasks and Projects, the Day Planner's tasks and
// schedule, Lists). The tick box springs and sends out a ring, then 100ms after the tick
// a wave runs along the row, left to right: each letter of its name and each pill hops
// as the wave passes, a band of blue light travels with it, and a line is drawn through
// the name behind it. The tick box stays where it is, so it can be aimed at again to
// untick. Then, if the row is leaving, fadeFold() fades it and folds it shut (the same
// everywhere); a row that stays is drawn again crossed out by its view.
//
//   const wave = tickWave(row, { title, parts, lane, tick, delay })
//     row: the ticked row (positioned: the copy and the light go inside it); tick: its tick box (default: the first .tick)
//     title: the name's field; parts: pills that bob too; lane: what the light crosses (default: the row)
//     delay: ms before it starts (several ticked at once: 200ms more for each one after the first)
//   await wave.done   the wave has passed
//   wave.clear()      back as it was (the name's own text shown again)
//   await fadeFold(rows)   the rows fade to a ghost, then fold shut (the view removes or redraws them after)
//
// A name is a field, whose letters can't move one by one: while the wave
// passes, a copy of its words lies exactly over it and the field's own text is
// hidden. The copy (with its line through) stays until clear() or the row goes.

const TRAVEL = 900; // ms for the wave to cross the row
const BOB = 640; // ms each letter takes to hop as it passes: up, a springy overshoot down, settling
const BOB_KEYS = [{ transform: 'none' }, { transform: 'translateY(-8px) scale(1.1)', offset: 0.2 }, { transform: 'translateY(2.5px) scale(.97)', offset: 0.44 }, { transform: 'translateY(-1.2px)', offset: 0.64 }, { transform: 'translateY(.4px)', offset: 0.82 }, { transform: 'none' }];
const POP_KEYS = [{ transform: 'scale(1)' }, { transform: 'scale(1.45)', offset: 0.25 }, { transform: 'scale(.86)', offset: 0.5 }, { transform: 'scale(1.08)', offset: 0.72 }, { transform: 'scale(1)' }];
const ROOM = 11; // px above and below the copy for the letters to hop into
export const FADE_MS = 900, FOLD_MS = 320;
const sleep = ms => new Promise(done => setTimeout(done, ms));

// Where el is inside row (row's padding box, as absolute positioning measures it).
function placeIn(row, el) {
  const rowBox = row.getBoundingClientRect(), box = el.getBoundingClientRect();
  return { left: box.left - rowBox.left - row.clientLeft, top: box.top - rowBox.top - row.clientTop, width: box.width, height: box.height };
}

// The name's words, as letters that can move, laid over its field.
function copyOver(field, row) {
  const style = getComputedStyle(field), at = placeIn(row, field), isInput = field.tagName === 'INPUT';
  const copy = document.createElement('div');
  copy.className = 'tw-copy';
  copy.setAttribute('aria-hidden', 'true');
  Object.assign(copy.style, {
    left: `${at.left}px`, top: `${at.top - ROOM}px`, width: `${at.width}px`, height: `${at.height + 2 * ROOM}px`,
    boxSizing: 'border-box', borderStyle: 'solid', borderColor: 'transparent', borderWidth: style.borderWidth,
    paddingTop: `${parseFloat(style.paddingTop) + ROOM}px`, paddingBottom: `${parseFloat(style.paddingBottom) + ROOM}px`, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight,
    font: style.font, letterSpacing: style.letterSpacing, wordSpacing: style.wordSpacing, lineHeight: style.lineHeight, textAlign: style.textAlign,
    color: style.color, whiteSpace: isInput ? 'pre' : 'pre-wrap', overflowWrap: style.overflowWrap,
    display: isInput ? 'flex' : 'block', alignItems: 'center', // an input's text sits in the middle of it
    WebkitMaskImage: style.webkitMaskImage, maskImage: style.maskImage,
  });
  const line = document.createElement('span');
  line.className = 'tw-line';
  // A word with the space after it (so the line drawn through runs on across the gap).
  for (const piece of field.value.match(/\S+\s*|\s+/g) || []) {
    const word = document.createElement('span');
    word.className = 'tw-word';
    for (const ch of piece) word.append(Object.assign(document.createElement('span'), { className: 'tw-ch', textContent: ch }));
    word.append(Object.assign(document.createElement('span'), { className: 'tw-strike' }));
    line.append(word);
  }
  copy.append(line);
  // The field's own dimming, if any, but not as an inline style: the view's fade (tickAway) has to reach the copy too.
  if (style.opacity !== '1') copy.style.setProperty('--tw-dim', style.opacity);
  return copy;
}

export function tickWave(row, { title = null, parts = [], lane = row, tick = row.querySelector('.tick'), delay = 100 } = {}) {
  const made = [];
  let restore = () => {};
  let cleared = false;
  const clear = () => { cleared = true; made.forEach(el => el.remove()); restore(); };
  // The tick box springs, and a ring of light goes out from it.
  if (tick?.getClientRects().length) setTimeout(() => {
    if (cleared || !row.isConnected) return;
    tick.animate(POP_KEYS, { duration: 560, delay: Math.max(0, delay - 100), easing: 'ease-out' });
    const at = placeIn(row, tick), ring = document.createElement('span');
    ring.className = 'tw-ring';
    ring.setAttribute('aria-hidden', 'true');
    Object.assign(ring.style, { left: `${at.left + at.width / 2 - 14}px`, top: `${at.top + at.height / 2 - 14}px` });
    row.append(ring);
    made.push(ring);
    ring.animate([{ transform: 'scale(.4)', opacity: .9 }, { transform: 'scale(2.1)', opacity: 0 }], { duration: 650, delay: Math.max(0, delay - 100) + 60, easing: 'cubic-bezier(.2, .7, .3, 1)', fill: 'forwards' }).finished.then(() => ring.remove(), () => {});
  }, 0);
  const done = new Promise(passed => setTimeout(() => {
    if (cleared || !row.isConnected) return passed();
    const laneAt = placeIn(row, lane);
    const laneBox = lane.getBoundingClientRect();
    const when = el => Math.max(0, ((el.getBoundingClientRect().left - laneBox.left) / laneBox.width) * TRAVEL);
    const bobbing = [...parts].filter(el => el.getClientRects().length);
    let words = [];
    if (title?.getClientRects().length && title.value.trim()) {
      const copy = copyOver(title, row);
      row.append(copy);
      made.push(copy);
      const was = { color: title.style.color, fill: title.style.webkitTextFillColor };
      title.style.color = 'transparent';
      title.style.webkitTextFillColor = 'transparent';
      restore = () => { title.style.color = was.color; title.style.webkitTextFillColor = was.fill; };
      bobbing.push(...copy.querySelectorAll('.tw-ch'));
      words = [...copy.querySelectorAll('.tw-word')];
    }
    // The band of light, crossing the lane.
    const sweep = document.createElement('div');
    sweep.className = 'tw-sweep';
    sweep.setAttribute('aria-hidden', 'true');
    Object.assign(sweep.style, { left: `${laneAt.left}px`, top: `${laneAt.top}px`, width: `${laneAt.width}px`, height: `${laneAt.height}px` });
    sweep.append(Object.assign(document.createElement('div'), { className: 'tw-band' }));
    row.append(sweep);
    made.push(sweep);
    sweep.firstChild.animate([{ transform: 'translateX(-60%)', opacity: 1 }, { opacity: 1, offset: 0.9 }, { transform: 'translateX(280%)', opacity: 0 }], { duration: TRAVEL, easing: 'cubic-bezier(.35, .1, .3, 1)', fill: 'forwards' });
    // Each letter and pill bobs as the wave reaches it.
    for (const el of bobbing) el.animate(BOB_KEYS, { duration: BOB, delay: when(el), easing: 'ease-in-out' });
    // The line through the name, drawn along behind the wave, word by word.
    for (const word of words) {
      const span = (word.getBoundingClientRect().width / laneBox.width) * TRAVEL;
      word.querySelector('.tw-strike').animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: Math.max(40, span), delay: when(word), easing: 'linear', fill: 'forwards' });
    }
    setTimeout(() => { sweep.remove(); passed(); }, TRAVEL + BOB);
  }, delay));
  return { done, clear };
}

// After the wave, rows that are leaving fade to a ghost, then fold shut and the rows below slide up.
export async function fadeFold(rows) {
  rows = [...rows].filter(row => row.isConnected);
  for (const row of rows) Object.assign(row.style, { transition: `opacity ${FADE_MS}ms ease`, opacity: '.3' });
  await sleep(FADE_MS + 100);
  rows = rows.filter(row => row.isConnected);
  if (!rows.length) return;
  for (const row of rows) Object.assign(row.style, { height: `${row.offsetHeight}px`, minHeight: '0', overflow: 'hidden', boxSizing: 'border-box' });
  void rows[0].offsetHeight;
  const ease = `${FOLD_MS}ms cubic-bezier(.5, 0, .25, 1)`;
  for (const row of rows) Object.assign(row.style, { transition: ['height', 'padding', 'margin', 'border-width', 'opacity'].map(prop => `${prop} ${ease}`).join(', '), height: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px', opacity: '0' });
  await sleep(FOLD_MS + 30);
}
