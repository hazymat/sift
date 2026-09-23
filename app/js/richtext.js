// Notes editor used for free text across the app. Stored as a small
// markdown subset (**bold**, _italic_, ~~cross out~~, "- " lists), shown
// formatted while you type. A "Markdown" toggle shows the raw text; it
// always starts in formatted mode.
//
//   const editor = richText(container, { value, onChange(markdown), placeholder })
//   editor.setValue(markdown)

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function inline(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/(^|[\s(])_(.+?)_(?=$|[\s).,!?:;])/g, '$1<i>$2</i>');
}

export function toHtml(md) {
  const out = [];
  let list = null;
  for (const line of (md || '').split('\n')) {
    const item = line.match(/^\s*[-*]\s+(.*)$/);
    if (item) {
      list ??= [];
      list.push(`<li>${inline(item[1]) || '<br>'}</li>`);
      continue;
    }
    if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
    out.push(`<div>${inline(line) || '<br>'}</div>`);
  }
  if (list) out.push(`<ul>${list.join('')}</ul>`);
  return out.join('');
}

export function toMarkdown(root) {
  const walk = node => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.replace(/ /g, ' ');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const inner = () => [...node.childNodes].map(walk).join('');
    const tag = node.tagName;
    const style = node.style || {};
    if (tag === 'BR') return '\n';
    if (tag === 'B' || tag === 'STRONG' || style.fontWeight === 'bold' || Number(style.fontWeight) >= 600) return wrap(inner(), '**');
    if (tag === 'I' || tag === 'EM' || style.fontStyle === 'italic') return wrap(inner(), '_');
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || /line-through/.test(style.textDecoration || '')) return wrap(inner(), '~~');
    if (tag === 'UL' || tag === 'OL') {
      return [...node.children].map(li => `- ${[...li.childNodes].map(walk).join('').replace(/\n+$/, '')}`).join('\n') + '\n';
    }
    if (tag === 'DIV' || tag === 'P') {
      const text = inner();
      return text.endsWith('\n') ? text : `${text}\n`;
    }
    return inner();
  };
  return [...root.childNodes].map(walk).join('').replace(/\n+$/, '');
}

// Keep markers outside surrounding spaces: "** word**" → " **word**".
function wrap(text, mark) {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : text;
}

export function richText(container, { value = '', onChange, placeholder = '' } = {}) {
  container.classList.add('rich');
  container.innerHTML = `
    <div class="md-bar" role="toolbar" aria-label="Formatting">
      <button type="button" data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button>
      <button type="button" data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button>
      <button type="button" data-cmd="strikeThrough" title="Cross out"><s>S</s></button>
      <button type="button" data-cmd="insertUnorderedList" title="List">• List</button>
      <button type="button" class="md-toggle" aria-pressed="false" title="Show the raw markdown">Markdown</button>
    </div>
    <div class="rich-edit hand" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="${esc(placeholder)}"></div>
    <textarea class="rich-raw hand" hidden spellcheck="true"></textarea>`;

  const edit = container.querySelector('.rich-edit');
  const raw = container.querySelector('.rich-raw');
  const toggle = container.querySelector('.md-toggle');
  let md = value || '';
  let rawMode = false;

  const paint = () => {
    edit.innerHTML = toHtml(md);
    edit.classList.toggle('is-empty', !md.trim());
  };
  const changed = next => {
    if (next === md) return;
    md = next;
    edit.classList.toggle('is-empty', !md.trim());
    onChange?.(md);
  };

  edit.addEventListener('input', () => changed(toMarkdown(edit)));
  raw.addEventListener('input', () => changed(raw.value));

  // Paste as plain text so web pages don't bring their styling along.
  edit.addEventListener('paste', ev => {
    ev.preventDefault();
    document.execCommand('insertText', false, ev.clipboardData.getData('text/plain'));
  });

  container.querySelector('.md-bar').addEventListener('mousedown', ev => {
    if (ev.target.closest('[data-cmd]')) ev.preventDefault(); // keep the selection in the editor
  });
  container.querySelector('.md-bar').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b === toggle) {
      rawMode = !rawMode;
      toggle.setAttribute('aria-pressed', rawMode);
      container.classList.toggle('raw', rawMode);
      if (rawMode) { raw.value = md; raw.hidden = false; edit.hidden = true; raw.focus(); }
      else { paint(); raw.hidden = true; edit.hidden = false; edit.focus(); }
      return;
    }
    if (rawMode) return;
    edit.focus();
    document.execCommand(b.dataset.cmd);
    changed(toMarkdown(edit));
  });

  paint();
  return {
    setValue(next) {
      md = next || '';
      if (rawMode) raw.value = md; else paint();
    },
    get value() { return md; },
  };
}
