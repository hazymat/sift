"""Convert "Where things are" OneNote pages (exported as .docx) into the
Find Things import CSV.

    python tools/onenote_to_csv.py OUT.csv "Page.docx=Life area name" ...

How the pages are read:
  - blue paragraphs are section headings
  - tables with BOX / Desc / Contents column groups (repeated side by side)
    become boxes; orange text in the Desc cell is where the box lives
  - Box/Contents and Locations/Items/Note tables work the same way
  - each line of a Contents cell is an item; sub-bullets are items too,
    noted as part of their parent when the parent line ends with ':'
  - loose text outside tables goes into a "Page notes" box

Output stays in private/ (gitignored): it describes where things are kept.
"""
import csv
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
HEADING = {'1E4E79', '2E74B5', '1F4D78'}
PLACE = {'ED7D31', 'C55A11', 'F4B083'}
GREY = {'767676', '595959'}
COLUMNS = ['life_area', 'section', 'box_code', 'box_name', 'box_location', 'box_notes', 'item', 'item_notes']


# ---------- reading the docx ----------

def run_text(r):
    out = []
    for x in r:
        if x.tag == f'{W}t':
            out.append(x.text or '')
        elif x.tag in (f'{W}br', f'{W}cr'):
            out.append('\n')
        elif x.tag == f'{W}tab':
            out.append(' ')
    return ''.join(out)


def lines_of(p):
    """A paragraph as [(text, level, colour)], split on line breaks."""
    lvl = p.find(f'{W}pPr/{W}numPr/{W}ilvl')
    level = int(lvl.get(f'{W}val')) if lvl is not None else None
    out, text, colour = [], '', None
    for r in p.iter(f'{W}r'):
        c = r.find(f'{W}rPr/{W}color')
        c = c.get(f'{W}val').upper() if c is not None else None
        for i, part in enumerate(run_text(r).split('\n')):
            if i:
                out.append((text, level, colour))
                text, colour = '', None
            if part.strip() and colour is None:
                colour = c
            text += part
    out.append((text, level, colour))
    return [(clean(t), lv, c) for t, lv, c in out if clean(t)]


def clean(text):
    text = text.replace('\xa0', ' ')
    text = re.sub(r'^[\s\-⁃•*·…]+', '', text)  # stray bullet characters
    return re.sub(r'\s+', ' ', text).strip()


def cell_lines(tc):
    return [ln for p in tc.iter(f'{W}p') for ln in lines_of(p)]


def rows_of(tbl):
    return [[cell_lines(tc) for tc in tr.findall(f'{W}tc')] for tr in tbl.findall(f'{W}tr')]


def header(row):
    return [' '.join(t for t, _, _ in cell).strip().lower() for cell in row]


# ---------- turning cells into rows ----------

def items_from(lines):
    """Contents lines -> [(item, notes)]."""
    out = []
    top = min((lv for _, lv, _ in lines if lv is not None), default=None)
    parent = None
    for text, lv, _ in lines:
        nested = lv is not None and top is not None and lv > top
        if nested and parent and parent.endswith(':'):
            out.append((text, f'part of: {parent.rstrip(":").strip()}'))
        else:
            out.append((text, ''))
            if not nested:
                parent = text
    return out


class Writer:
    def __init__(self, edition):
        self.edition = edition
        self.rows = []

    def box(self, section, code='', name='', location='', notes='', contents=()):
        base = [self.edition, section, code, name or code, location, notes]
        items = items_from(contents)
        if not items:
            self.rows.append(base + ['', ''])
        for item, item_notes in items:
            self.rows.append(base + [item, item_notes])


def split_desc(lines):
    """Desc cell -> (name, location): orange text is where the box lives."""
    return join([t for t, _, c in lines if c not in PLACE]), join([t for t, _, c in lines if c in PLACE])


def join(parts):
    """Join wrapped cell lines with ' / ', unless a line already ends in '/'."""
    out = ''
    for part in parts:
        out += part if not out else (' ' if out.endswith('/') else ' / ') + part
    return out


def convert(path, edition):
    out = Writer(edition)
    body = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml')).find(f'{W}body')
    section = 'Boxes'
    notes = []  # loose paragraphs
    seen_title = False

    for el in body:
        if el.tag == f'{W}p':
            for text, lv, colour in lines_of(el):
                if not seen_title:
                    seen_title = True  # page title
                elif colour in GREY:
                    pass  # OneNote's date/time stamp
                elif colour in HEADING:
                    section = text
                else:
                    notes.append((text, lv, colour))
            continue
        if el.tag != f'{W}tbl':
            continue

        rows = rows_of(el)
        if not rows:
            continue
        head = header(rows[0])
        box_cols = [i for i, h in enumerate(head) if h == 'box']

        if box_cols and 'desc' in head:
            # BOX | Desc | Contents, possibly repeated side by side.
            for row in rows[1:]:
                for i in box_cols:
                    cells = row[i:i + 3] + [[]] * 3
                    code_lines, desc, contents = cells[0], cells[1], cells[2]
                    if not (code_lines or desc or contents):
                        continue
                    code = code_lines[0][0] if code_lines else ''
                    extra = ' / '.join(t for t, _, _ in code_lines[1:])  # e.g. "9L Really Useful"
                    name, location = split_desc(desc)
                    out.box(section, code, name, location, extra, contents)
        elif box_cols:
            # Box | Contents: named boxes without codes.
            for row in rows[1:]:
                if not row or not row[0]:
                    continue
                name, location = split_desc(row[0])
                out.box('Other boxes', '', name, location, '', row[1] if len(row) > 1 else [])
        elif head and head[0] == 'locations':
            # Locations | Items | Note
            for row in rows[1:]:
                if not row or not row[0]:
                    continue
                note = ' / '.join(t for t, _, _ in row[2]) if len(row) > 2 else ''
                out.box(section, '', ' / '.join(t for t, _, _ in row[0]), '', note, row[1] if len(row) > 1 else [])
        elif len(rows[0]) == 1 or (len(rows[0]) > 1 and not any(rows[0][1:])):
            # Single-column list: first row names the group, the rest are boxes.
            name, location = split_desc(rows[0][0])
            group = name.split(' / ')[0] if name else section
            loc = location or ' / '.join(name.split(' / ')[1:])
            for row in rows[1:]:
                if row and row[0]:
                    out.box(group, '', ' / '.join(t for t, _, _ in row[0]), loc, '', row[1] if len(row) > 1 else [])
        else:
            # Anything else: every cell under the header is contents of one box.
            contents = [ln for row in rows[1:] for cell in row for ln in cell]
            out.box(section, '', section, '', '', contents)

    if notes:
        out.box('Page notes', '', 'Notes from OneNote', '', '', notes)
    return out.rows


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    rows = []
    for arg in sys.argv[2:]:
        path, _, edition = arg.partition('=')
        rows += convert(path, edition or 'Standard')
    with open(sys.argv[1], 'w', newline='', encoding='utf-8-sig') as f:
        csv.writer(f).writerows([COLUMNS] + rows)
    boxes = {tuple(r[:4]) for r in rows}
    print(f'{len(boxes)} boxes, {sum(1 for r in rows if r[6])} items -> {sys.argv[1]}')


if __name__ == '__main__':
    main()
