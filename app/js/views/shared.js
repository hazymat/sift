// Shared with me (#/shared): everything shared with you, and by you, in one place. Invitations waiting (also on the
// bottom bar until answered), what you accepted (press it: Take me there), what you declined (accept it again), and
// what you share. Answers are sharing.js's (Accept, Decline and Not now, each with Undo).

import * as sync from '../sync.js';
import { personName, whatText, inviteText, answerOf, waitingNow, AREA_WORDS } from '../sharing.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const when = d => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default {
  async mount(el) {
    const row = (sh, words, acts) => `<li class="sw-row" data-id="${esc(sh.id)}">
      <span class="sw-area chip">${esc(AREA_WORDS[sh.info.kind] || '')}</span>
      <span class="sw-words">${words}</span>
      <span class="sw-acts">${acts}</span></li>`;
    const section = (title, note, rows) => (rows.length ? `<section class="sw-group"><h2>${title}</h2>${note ? `<p class="muted">${note}</p>` : ''}<ul class="sw-list">${rows.join('')}</ul></section>` : '');
    const render = this.render = this.refresh = async () => {
      const all = sync.sharesNow(), me = sync.myUserId();
      const theirs = all.filter(sh => !sh.mine);
      const waiting = waitingNow();
      const accepted = theirs.filter(sh => sh.accepted && answerOf(sh.id) !== 'declined');
      const declined = theirs.filter(sh => answerOf(sh.id) === 'declined');
      const mine = all.filter(sh => sh.mine);
      const since = sh => when(sh.members?.find(m => m.user_id === me)?.accepted_at || sh.created_at);
      const there = sh => `<button type="button" class="primary sw-there" data-share-there="${esc(sh.id)}">Take me there</button>`;
      el.innerHTML = `<div class="sw">
        <h1 class="sw-title">👥 Shared with me</h1>
        ${!sync.signedIn() ? '<div class="empty"><h2>Nothing shared yet.</h2><p class="muted">Sharing goes through your sync server: sign in under Settings, Sync, then share a list, note, recipe, book, project or days from its 👥 Share.</p></div>'
          : !all.length ? '<div class="empty"><h2>Nothing shared yet.</h2><p class="muted">When someone shares something with you, it waits here (and on the bar at the bottom) for you to accept. What you share shows here too.</p></div>' : ''}
        ${section('Waiting for you', 'Accept to see it in its area. Not now leaves it here.', waiting.map(sh => row(sh, `${inviteText(sh)} <span class="muted">${esc(when(sh.created_at))}${answerOf(sh.id) === 'later' ? ' · not now' : ''}</span>`,
          `<button type="button" class="primary" data-invite-accept="${esc(sh.id)}">Accept</button><button type="button" data-invite-decline="${esc(sh.id)}">Decline</button>`)))}
        ${section('Shared with you', 'Press one to go to it.', accepted.map(sh => row(sh, `<b>${esc(whatText(sh))}</b> <span class="muted">since ${esc(since(sh))}</span>`,
          `${there(sh)}<button type="button" data-share-about="${esc(sh.id)}" title="Who shared it, and Leave">⋯</button>`)))}
        ${section('Declined', "They still see you as invited. Accept to have it after all.", declined.map(sh => row(sh, `<b>${esc(whatText(sh))}</b>`,
          `<button type="button" data-invite-accept="${esc(sh.id)}">Accept</button><button type="button" class="danger" data-share-leave="${esc(sh.id)}" title="Take yourself off it for good: they'd have to share it again">Remove</button>`)))}
        ${section('Shared by you', '', mine.map(sh => { const people = (sh.members || []).filter(m => m.user_id !== me); return row(sh, `<b>${esc(whatText(sh))}</b> <span class="muted">with ${esc(people.map(m => `${personName(m.email)}${m.accepted_at ? '' : ' (invited)'}`).join(', ') || 'no one yet')}</span>`, there(sh)); }))}
      </div>`;
    };
    // Pressing a row (not one of its buttons) is its Take me there; sharing.js handles the buttons.
    el.addEventListener('click', ev => { if (ev.target.closest('button, a')) return; ev.target.closest('.sw-row')?.querySelector('.sw-there')?.click(); });
    this.off = sync.onShares(() => render());
    await sync.loadShares();
    await render();
  },
  unmount() { this.off?.(); },
};
