// The first time Sift is opened on a device with nothing in it (app.js): a
// welcome, and the choice of the tour now, later (a task that starts it), or
// not at all. #/welcome; not in the navigation.
import * as store from '../store.js';
import { addTaskFirst } from '../tasks.js';
import { toast } from '../toast.js';
import { word } from '../words.js';

export default {
  mount(el) {
    el.innerHTML = `<div class="welcome">
      <section class="card welcome-card">
        <h2>Welcome!</h2>
        <p class="welcome-lead">You've found an extremely useful app and I can't wait to show it to you. What do you want to do?</p>
        <div class="welcome-choices">
          <button type="button" class="primary" data-act="tour">See the tour now?</button>
          <button type="button" data-act="later">Put it on my to do list?</button>
          <button type="button" data-act="skip">Just use the app</button>
        </div>
      </section>
    </div>`;
    el.querySelector('[data-act="tour"]').focus();
    el.addEventListener('click', async ev => {
      const act = ev.target.closest('button[data-act]')?.dataset.act;
      if (!act) return;
      await store.updateDeviceSettings({ welcomed: true });
      if (act === 'later') {
        // A task like any other, with a pill that starts the tour (views/tasks.js); ticked off when the tour is finished.
        await addTaskFirst({ title: 'Take the tour of Sift', notes: 'About five minutes. ▶ Start the tour whenever you like.', horizon: 'now', tour: true });
        location.hash = '#/tasks/now';
        toast(`The tour is on your ${word('list_now')} list`);
        return;
      }
      location.hash = '#/dump';
      if (act === 'tour') (await import('../tour.js')).startTour();
    });
  },
};
