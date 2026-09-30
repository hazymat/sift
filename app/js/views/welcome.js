// The welcome page: the choice of tours. Shown the first time Sift is opened on
// a device with nothing in it (app.js), and from Settings (Take the tour) or the
// "Take the tour of Sift" task. Three big tours for the three ways people use
// Sift, and short ones for the rest. #/welcome; not in the navigation.
import * as store from '../store.js';
import { startTour, showTourTask, progress, tourLength, toursSeen } from '../tour.js';
import { word } from '../words.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export default {
  async mount(el) {
    const seen = await toursSeen();
    const where = {};
    for (const id of ['tasks', 'notes', 'planner', 'recipes', 'lists', 'places', 'filing', 'yours']) where[id] = await progress(id);
    // What a card says under its words: carrying on, seen, or how long it is.
    const state = id => (where[id] ? `▶ Carry on: step ${where[id].n + 1} of ${where[id].total}` : seen[id] ? '✓ Seen' : `${tourLength(id)} quick steps`);
    const big = (id, colour, emoji, title, who, why) => `
      <button type="button" class="tour-pick" data-pick="${id}" style="--c: ${colour}">
        <span class="pick-emoji" aria-hidden="true">${emoji}</span>
        <span class="pick-title">${title}</span>
        <span class="pick-who">${who}</span>
        <span class="pick-why">${why}</span>
        <span class="pick-state${seen[id] && !where[id] ? ' seen' : ''}">${state(id)}</span>
      </button>`;
    const small = (id, emoji, label) => `<button type="button" class="pick-chip${seen[id] ? ' seen' : ''}" data-pick="${id}" title="${esc(state(id))}"><span aria-hidden="true">${emoji}</span> ${esc(label)}${seen[id] ? ' <span class="pick-tick">✓</span>' : ''}</button>`;
    el.innerHTML = `<div class="welcome">
      <header class="welcome-top">
        <h2>Welcome to Sift</h2>
        <p class="welcome-lead">What would you like to see? Each tour takes a couple of minutes, and you try things as you go.</p>
      </header>
      <div class="tour-picks">
        ${big('tasks', '#5b9dff', '✅', 'Get your life in order', `${esc(word('area_tasks'))} and projects`, `${esc(word('list_now'))}, ${esc(word('list_next'))} and ${esc(word('list_later'))} instead of deadlines that nag, with tasks matched to the energy you've got today.`)}
        ${big('notes', '#f0b43c', '✍️', 'Write it all down', 'For people who write, jot and take notes', `Why it beats Apple Notes and Notepad: nothing is ever lost, undo goes back to yesterday, and any line becomes a task or a contact.`)}
        ${big('planner', '#e7839f', '📓', 'Plan your day on paper', 'For lovers of a real notebook or planner', `Your task list and your day's journal on the same page: the bridge between a to-do app and a paper planner.`)}
        <div class="tour-pick tour-pick-more" style="--c: #9b86f0">
          <span class="pick-emoji" aria-hidden="true">🗂️</span>
          <span class="pick-title">Everything else</span>
          <span class="pick-who">Quick tours, a minute each</span>
          <div class="pick-chips">
            ${small('filing', '🗄️', 'Your digital filing cabinet')}
            ${small('recipes', '🍲', 'Your Recipe Archive')}
            ${small('lists', '🛒', word('area_lists'))}
            ${small('places', '📦', word('area_places'))}
            ${small('yours', '🎨', 'Make it yours')}
          </div>
        </div>
      </div>
      <div class="welcome-after">
        <button type="button" data-act="later">Put the tour on my to-do list</button>
        <button type="button" data-act="skip">Just start using Sift</button>
      </div>
    </div>`;
    el.querySelector('[data-pick]').focus({ preventScroll: true });
    el.addEventListener('click', async ev => {
      const b = ev.target.closest('button[data-pick], button[data-act]');
      if (!b) return;
      await store.updateDeviceSettings({ welcomed: true });
      if (b.dataset.pick) return startTour({ which: b.dataset.pick }); // carries on where it was left, if it was
      // Later: a task like any other, whose pill brings back this page (views/tasks.js), shown so it can be found.
      if (b.dataset.act === 'later') return showTourTask();
      location.hash = '#/dump';
    });
  },
};
