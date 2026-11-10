// A case's one box for its references and people: type a reference, a name or a number.
// Under it (in the page's flow, so never cut off): the people it could be, then
// Add "…" as a reference and Add "…" as a new person, the likelier one first.
// ↑ ↓ move, Enter adds the highlighted one (Enter in an empty box is Done),
// Esc closes the list, then Esc again is Done.
//
//   factBox(inputEl, { people, onPerson(id), onRef(text), onNew(text), onDone() })
//     people: contacts not on the case yet

import { contactLabel, contactHint, extractDetails, lastActivity } from './contacts.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const digitsOf = text => text.replace(/\D/g, '');

// A phone number, an email or words read as a person; anything else with a digit in it ("INC0012345", "AB/123 45") as a reference.
export const looksLikeRef = text => /\d/.test(text) && !extractDetails(text).length;

function matches(contact, typed) {
  const haystack = [contactLabel(contact), contact.name, contact.about, contact.body].concat((contact.details || []).map(detail => detail.value)).join(' ').toLowerCase();
  if (typed.toLowerCase().split(/\s+/).every(part => haystack.includes(part))) return true;
  const typedDigits = digitsOf(typed);
  return typedDigits.length >= 4 && (contact.details || []).some(detail => digitsOf(detail.value).includes(typedDigits));
}

export function factBox(input, { people, onPerson, onRef, onNew, onDone }) {
  const list = document.createElement('div');
  list.className = 'dd-menu fact-suggest';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  input.after(list);
  let options = [], active = -1;
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  const draw = () => {
    const typed = input.value.trim();
    const found = typed ? people.filter(contact => matches(contact, typed)).slice(0, 6)
      : people.slice().sort((one, other) => String(lastActivity(other) || '').localeCompare(String(lastActivity(one) || ''))).slice(0, 8);
    const personRows = found.map(contact => ({ kind: 'person', id: contact.id, html: `<em aria-hidden="true">👤</em><b>${esc(contactLabel(contact))}</b>${contactHint(contact) ? ` <span class="muted">${esc(contactHint(contact))}</span>` : ''}` }));
    const refRow = { kind: 'ref', html: `<em aria-hidden="true">#</em>Add <b>${esc(typed)}</b> as a reference` };
    const newRow = { kind: 'new', html: `<em aria-hidden="true">＋</em>Add <b>${esc(typed)}</b> as a new person` };
    options = !typed ? personRows : looksLikeRef(typed) ? [refRow].concat(personRows, [newRow]) : personRows.concat([newRow, refRow]);
    active = typed ? 0 : -1;
    if (!options.length) return close();
    list.innerHTML = (typed ? '' : '<div class="dd-group">People in Contacts</div>') + options.map((option, index) => `<div class="dd-opt fact-${option.kind}${index === active ? ' active' : ''}" role="option" data-n="${index}">${option.html}</div>`).join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  const pick = async option => {
    const typed = input.value.trim();
    input.value = '';
    close();
    if (option.kind === 'person') await onPerson(option.id);
    else if (option.kind === 'ref') await onRef(typed);
    else await onNew(typed);
  };
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.addEventListener('focus', draw);
  input.addEventListener('input', draw);
  input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) close(); }, 0));
  list.addEventListener('mousedown', ev => ev.preventDefault()); // keep the box focused
  list.addEventListener('click', ev => { const row = ev.target.closest('.dd-opt'); if (row) pick(options[Number(row.dataset.n)]); });
  input.addEventListener('keydown', ev => {
    if (ev.isComposing) return;
    if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && options.length) {
      if (list.hidden) draw();
      active = ev.key === 'ArrowDown' ? (active + 1) % options.length : (active <= 0 ? options.length : active) - 1;
      list.querySelectorAll('.dd-opt').forEach((row, index) => row.classList.toggle('active', index === active));
      list.querySelector('.dd-opt.active')?.scrollIntoView({ block: 'nearest' });
      ev.preventDefault();
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      if (!list.hidden && active >= 0) pick(options[active]);
      else if (!input.value.trim()) onDone();
    } else if (ev.key === 'Escape') {
      ev.preventDefault(); ev.stopPropagation();
      if (!list.hidden) close(); else onDone();
    }
  });
}
