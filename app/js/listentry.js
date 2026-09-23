// Shared "type or paste lines, turn them into a list" entry, used anywhere a
// block of plain text becomes list items (Find Things contents, Day Planner
// dump box, Brain Dump …). Same keys and rules everywhere:
//   - one item per line; blank lines ignored
//   - a line starting with a space, "-", "*" or "•" is a sub-item of the line above
//   - Ctrl+Enter (⌘+Enter on Mac) adds; the button does the same

const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const SHORTCUT = MAC ? '⌘↵' : 'Ctrl+Enter';

export function listHint({ subItems = true } = {}) {
  return `One per line.${subItems ? ' Start a line with - for a sub-item.' : ''} ${SHORTCUT} to add.`;
}

// Text → [{ text, sub }]
export function parseLines(text) {
  return text.split('\n')
    .map(raw => ({ text: raw.replace(/^[\s\-*•]+/, '').trim(), sub: /^(\s|[-*•])/.test(raw) }))
    .filter(line => line.text);
}

// Wire a textarea: Ctrl/⌘+Enter calls onSubmit(lines). The textarea is
// cleared and refocused after a successful submit.
export function listEntry(textarea, onSubmit) {
  const submit = async () => {
    const lines = parseLines(textarea.value);
    if (!lines.length) return;
    await onSubmit(lines);
    textarea.value = '';
    textarea.focus();
  };
  textarea.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      submit();
    }
  });
  return submit;
}
