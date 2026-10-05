// Long lines typed as a task (or plan item) become a short title plus a note
// holding the whole line as typed.
//
//   summarise('Call the council about the bins: they missed us twice …')
//   → { title: 'Call the council about the bins', notes: '<the whole line>' }
//
// Only lines over MAX characters are touched. The title is the text before
// the first colon, comma or full stop (not one inside a number, time, email
// or web address), else before a " - " / " – " / " (" or a joining phrase
// ("because", "so that", …), else the words that fit with "…". Leading
// filler ("I need to", "remember to") is dropped.
//
// It also spots a time typed anywhere in the line (spotTime), for the view to
// offer as the task's time (offerTime): never used without asking.
//
//   summarise('Lavender 11.55-12.30').spotted
//   → { time: '11:55', end_time: '12:30', title: 'Lavender', text: '11.55-12.30' }

import { toast } from './toast.js';
import { labelHistory } from './store.js';

export const MAX = 50;

const FILLER = /^(?:(?:i|we)\s+(?:really\s+)?(?:need|have|want|ought)\s+to|(?:i|we)\s+(?:must|should)|(?:need|have|got|ought)\s+to|gotta|remember\s+to|don'?t\s+forget\s+to|must|should|todo:?|to\s*do:?)\s+/i;
const JOINERS = /\s(?:because|so that|so I|so we|in order to|which|then|and then|but|as|since|to see if|to check if)\s/i;

// A cut at i is fine unless the punctuation sits inside a number (3.30,
// 1,000), an email or a web address.
function cleanCut(text, i) {
  const before = text[i - 1] || '';
  const after = text[i + 1] || '';
  if (/\d/.test(before) && /\d/.test(after)) return false;
  if (text[i] === '.' && after && !/\s/.test(after)) return false; // e.g. example.com, e.g.
  if (text[i] === ':' && after === '/') return false; // https://
  return true;
}

const tidy = s => {
  const t = s.replace(FILLER, '').replace(/[\s,;:.\u2013\u2014-]+$/, '').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
};

// A title for free text (like iPhone Notes): its first line, without
// markdown or link syntax, shortened if it's long.
export const cleanLine = line => line.trim().replace(/\[([^\]]*)\]\(sift:[^)]*\)/g, '$1').replace(/^(?:#{1,6}|-#|\+#|#\+)\s+/, '').replace(/^[-*•]\s+/, '')
  .replace(/\*\*|~~/g, '').replace(/(^|\s)_(\S.*?)_(?=$|[\s).,!?:;])/g, '$1$2').trim();

export function titleFrom(text) {
  const first = (text || '').split('\n').map(l => l.trim()).find(Boolean) || '';
  return summarise(cleanLine(first)).title;
}

export function summarise(text, max = MAX) {
  const short = shorten(text, max);
  short.spotted = spotTime(text);
  return short;
}

function shorten(text, max) {
  const whole = text.trim();
  if (whole.length <= max) return { title: whole, notes: '' };
  const min = 4; // a title needs a few characters at least

  // 1. The earliest of: a colon, comma or full stop; a dash; a bracket; a
  //    joining phrase.
  let punct = -1;
  for (let i = min; i < whole.length - 1; i++) {
    if (/[:,.]/.test(whole[i]) && cleanCut(whole, i)) { punct = i; break; }
  }
  const cuts = [punct, whole.search(/\s[-\u2013\u2014]\s/), whole.indexOf(' ('), whole.search(JOINERS)].filter(i => i >= min).sort((a, b) => a - b);
  for (const at of cuts) {
    const title = tidy(whole.slice(0, at));
    if (title.length >= min) return { title, notes: whole };
  }
  // 2. As many whole words as fit, then "…".
  const cut = tidy(whole).slice(0, max);
  const title = `${cut.slice(0, Math.max(cut.lastIndexOf(' '), min)).trim()}…`;
  return { title, notes: whole };
}

// ---------- times ----------
// 11.55, 11:55, 1155h, 11.55am, 3pm; a range with -, –, ->, →, "to", "till",
// "until" (11.55-12.30, 11:55 -> 12:30, 3-4pm); "at", "from" or "@" before it
// goes with it. Not inside a number, date, price or web address (£3.50,
// 12.10.2026, 1.60.56). Without am / pm, 1 to 6 o'clock is the afternoon,
// and an end before its start is 12 hours later (11.30-1 → 13:00).
const TOK = String.raw`\d{3,4}\s?h|\d{1,2}(?:[:.]\d{2})?(?:\s?(?:am|pm|a\.m\.|p\.m\.|h)(?![a-z]))?`;
const SPOT = new RegExp(String.raw`(?<![\w.,:£$€/])(?:(?:at|from)\s+|@\s*)?(${TOK})(?:\s*(?:->|→|=>|-|\u2013|\u2014|to|till|til|until)\s*(${TOK}))?(?![\w:/]|[.,]\d)`, 'gi');

// One time as typed → { min, half: 'am' | 'pm' | '' , bare: no minutes and no am / pm / h }
function readTok(tok) {
  const t = tok.toLowerCase().replace(/\s/g, '');
  let m = t.match(/^(\d{1,2})(\d{2})h$/);
  if (m) return Number(m[1]) < 24 && Number(m[2]) < 60 ? { min: Number(m[1]) * 60 + Number(m[2]), half: '', fixed: true } : null;
  m = t.match(/^(\d{1,2})(?:[:.](\d{2}))?(a\.?m\.?|p\.?m\.?|h)?$/);
  if (!m) return null;
  const hour = Number(m[1]), mins = Number(m[2] || 0);
  const half = m[3]?.[0] === 'a' ? 'am' : m[3]?.[0] === 'p' ? 'pm' : '';
  if (mins > 59 || hour > 23 || (half && (hour > 12 || hour === 0))) return null;
  return { hour, mins, half, fixed: m[3] === 'h', bare: !m[2] && !m[3] };
}
const at = (tok, half) => {
  if (tok.min !== undefined) return tok.min;
  const use = tok.half || half;
  let hour = tok.hour;
  if (use) hour = hour % 12 + (use === 'pm' ? 12 : 0);
  else if (!tok.fixed && hour >= 1 && hour <= 6) hour += 12; // "3.30" in a day plan is the afternoon
  return hour * 60 + tok.mins;
};
const hhmm = min => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// The first time in the text → { time, end_time, title (the text without it), text (as typed) } or null.
export function spotTime(text) {
  for (const m of (text || '').matchAll(SPOT)) {
    const start = readTok(m[1]);
    const end = m[2] ? readTok(m[2]) : null;
    if (!start || (m[2] && !end)) continue;
    if (start.bare && !(end && end.half)) continue; // "3" alone is a number, "3-4pm" is a time
    let from, to = null;
    if (end) {
      to = at(end, '');
      from = at(start, end.half);
      if (start.bare && from > to) from = at(start, end.half === 'pm' ? 'am' : 'pm'); // 11-1pm
      if (!end.half && !end.fixed && end.min === undefined && to <= from && to + 720 > from) to += 720;
      if (to <= from) continue;
    } else from = at(start, '');
    const title = (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)).replace(/\s+/g, ' ').replace(/\s+([,.;:!?)])/g, '$1').replace(/^[\s,;:\u2013-]+|[\s,;:\u2013-]+$/g, '').trim();
    if (!title) continue;
    return { time: hhmm(from), end_time: to === null ? null : hhmm(to), title, text: m[0].trim() };
  }
  return null;
}

const showTime = time => time.replace(/^0?(\d+):/, '$1.'); // 8.30, as on paper (days.js)

// After adding a task whose name had a time in it: ask, in the toast, whether to
// use it (Set time); Undo beside it takes the task away again. added: the
// "Added …" History entry; where: after the time (" on today's Day Planner").
export const spotWhen = spot => (spot.end_time ? `${showTime(spot.time)} to ${showTime(spot.end_time)}` : showTime(spot.time));
export function offerTime(spot, { added, undo, apply, where = '' }) {
  if (added) labelHistory(added);
  toast(`Set "${shorten(spot.title, MAX).title}" for ${spotWhen(spot)}${where}?`, { action: 'Set time', onAction: apply, more: undo ? { label: 'Undo', onAction: undo } : undefined, ms: 9000 });
}
