// Long entries in a timeline (a pasted email, say): the first few lines, fading out, with More / Less under them.
// Ones opened with More stay open when the page redraws.
const opened = new Set();
const keyOf = text => { const row = text.closest('[data-entry], [data-comment]'); return row ? row.dataset.entry || row.dataset.comment : text.textContent.slice(0, 200); };

export function foldLong(root, selector, lines = 6) {
  for (const text of root.querySelectorAll(selector)) {
    if (text.nextElementSibling?.classList.contains('ctl-fold')) continue;
    const lineHeight = parseFloat(getComputedStyle(text).lineHeight) || 20;
    if (text.scrollHeight <= lineHeight * (lines + 2)) continue; // a line or two over isn't worth folding
    text.style.setProperty('--fold-h', `${Math.round(lineHeight * lines)}px`);
    const key = keyOf(text);
    const button = Object.assign(document.createElement('button'), { type: 'button', className: 'ctl-fold' });
    const show = open => { text.classList.toggle('folded', !open); button.textContent = open ? 'Less' : 'More'; button.setAttribute('aria-expanded', open); };
    show(opened.has(key));
    button.addEventListener('click', ev => {
      ev.stopPropagation();
      const open = !opened.has(key);
      if (open) opened.add(key); else opened.delete(key);
      show(open);
      if (!open && button.getBoundingClientRect().top < 0) text.closest('.ctl-item')?.scrollIntoView({ block: 'nearest' }); // folding a long one from below: back to its top
    });
    text.after(button);
  }
}
