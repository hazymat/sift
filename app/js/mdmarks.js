// The one set of rules for a note's inline marks (**bold**, _italic_, ~~cross out~~),
// shared by everything that shows a note or turns it into plain text, so they
// never disagree. Italic's underscores count only at a word's edge: next to a space,
// punctuation, the start or end of the line, or another mark ("**_both_**" and
// "_**both**_" are the same), so snake_case_words keep theirs.
const EDGE_BEFORE = `(^|[\\s(\\[{"'“‘;*~>-])`; // ';' ends &quot; and the like; '>' ends <b> once bold is drawn
const EDGE_AFTER = `(?=$|[\\s)\\]}.,!?:;"'”’*~<&-])`; // '<' starts </b>; '&' starts &quot;
const ITALIC = new RegExp(`${EDGE_BEFORE}_(?=\\S)(.+?)(?<=\\S)_${EDGE_AFTER}`, 'g');

// A line of note text (already HTML-escaped) with its marks drawn.
export const marksHtml = html => html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/~~(.+?)~~/g, '<s>$1</s>').replace(ITALIC, '$1<i>$2</i>');

// The same text without its marks, for plain-text uses (titles, search, sharing).
export const stripMarks = text => text.replace(ITALIC, '$1$2').replace(/\*\*|~~/g, '');
