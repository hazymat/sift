# UI consistency

A map of how every area of Sift shows its controls, made to find where areas do the same job in different ways. New UI follows the **settled rules** below; where a row has no settled rule yet, copy the way most areas already do it and add the choice here.

Audited at 1.54.09 (29 September 2026), updated for 1.55.16, from the code and by opening every area at phone and computer widths in Tight, Medium and Loose spacing, lined and box. The same audit is GitHub issue #284; keep the two in sync.

## Settled rules (as decided)

- **⋯ page menu** holds only rarely used things: Show Archive, Show Bin, import, export, example data. Primary actions never go in it.
- **New things**: a "+ New [thing]" button at the top left of the page.
- **Switching between parts of an area** (Tasks | Projects, Recipes | Batches): a switch always visible on the page, never in a menu.
- **No search box** on Tasks, Projects, Lists or the Day Planner: intended. The search in the top bar covers them.
- **Scans' "Scan" button** has no "New" and no "+": intended (it takes a photo), noted only.
- **Anything that puts something into a project** (Move, the 📁 Project pill, Brain Dump conversion, any picker) lists projects shared with you too, with 👥.
- **Editing a row**: clicking anywhere outside it stops editing.
- **Esc on an opened page** (a list, a project, a box, a contact or case, a scan, a contract, a recipe or batch): the first Esc leaves the field being typed in, keeping what's typed (an Add items box adds it, as Enter); the next Esc goes back. The back button shows Esc whenever nothing is being typed (hidden while a field has the cursor, and on touch screens) (1.55.15).
- **Arrow keys on rows edited in place** (Tasks, Day Planner, an open list, a box's things): ↓ at the top level starts editing (the new line at the top, or the first row), then ↑ / ↓ move the editing from row to row, and Shift+↑ / ↓ select rows. No blue browsing box on these; it's only for cards and grids (Brain Dump, the Lists page, Find Things' boxes, Contacts, Scans, Contracts, Batch Book).
- **Shift+Enter goes one step further**: from an item's name to quick edit (with its note), and from there, the name or the note, to the full panel. Lists go straight to the panel.
- **Green means open or close**: a green pill opens something or closes it again (More, More (full), ✓ Close, a note's full-screen ⤢ and its Done). Buttons that open or close a thing aren't another colour. (The Day Planner's green "↓ Bring in from tasks" doesn't open or close anything, so it breaks this: to decide.) The colour is the shared rule in `app.css` (search `.close-top, .md-full`); add new open and close buttons to it. A green button that has a key shows it on the button (hidden on touch screens): a note's ⤢ shows Alt+Enter, and Esc once full screen; full screen's Done shows Esc (1.55.14).
- **Sideways rows** (filter bars, tabs, pill rows, anything that scrolls sideways): a mouse wheel over one scrolls it sideways; at its end the page scrolls as usual. Built once for the whole app (`installWheelRows` in `app.js`), so new rows get it for free.
- **Selection bars** take the same keys everywhere, shown on their buttons: A Archive, D (or Delete) Delete, Ctrl+Enter Done or Tick. Built into `listkit.js` (an action's `key`); the Day Planner's own bar does the same (1.55.13).
- **Cards with a photo** keep one shape whatever the photo: the photo is cropped to its frame (a square on recipe cards, 4:3 on scans) and never sets the card's height. Recipe cards are all the same height (1.55.17).
- **A thing's colour shows the same way everywhere it has one**: a list looks like a project, a 4px coloured edge along the top of its card, down the left of its open page's head, and its progress bar in its colour, whatever the Look. Built on `--c`, as projects already were (1.55.08).

## 1. Page level: areas that list things

What each area shows before anything is opened. "Share (copy)" is the Share pill that copies the page as text; "👥" is sharing with a person.

| | Brain Dump | Tasks > Tasks | Tasks > Projects | Day Planner | Lists | Find Things | Contacts | Scans | Contracts | Batch Book | Tidied |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **New item** | "New note" box at the top of the page, Save button | None: type into the "New task" line | "+ New project" pill top left, beside Tasks \| Projects (on phones, on the row under it) | None: click a ruled line (Schedule), "New task" line (Tasks) | Two pills top left: "+ New template" (primary, first), "+ New list" | Three pills top left: "+ New box" (primary, asks which group), "+ New group", "+ New life area"; also a "+ New box" dashed tile per group | "+ New contact" pill top left (becomes "+ New case" on Cases); also a capture box with Save | "Scan" pill top left (icon, no "+ New"); "Add from files…" in ⋯ | "+ New contract" pill top left | "+ New recipe" pill top left | None |
| **Switch between parts** | None | Tasks \| Projects: small pills in own glass, top left | Same | None (day ‹ 📅 Today › top left) | None (Templates, Lists as headings) | Life areas: pills, glass track fills the row | Recent \| Directory \| Cases: large pills in own glass, right beside "+ New contact" | None | None | Recipes \| Batches: small pills with emoji, on the right next to 👁 (drops to row 2 on phones) | Archive \| Bin: pills in own glass, top left |
| **Filter bar** | Underlined tabs, full width, under search; ⋯ at the end edits types | Underlined tabs (Task Dump, Now, Next, Later, Done, All), same row as Tasks \| Projects | None | None | None | None (life areas act as the filter) | None (Directory uses category tiles) | Pills in glass that hugs them, own row | Pills in glass that hugs them, own row; "All" last | Underlined tabs per book, coloured underline, ⋯ at the end; tag chips row under it | Pills in glass (areas), same row as Archive \| Bin |
| **Search** | "Search your notes…", with ✕ | None (intended) | None (intended) | None (intended) | None (intended) | "Find anything… (press /)", full width, own row above everything, with ✕ | "Search contacts…", Recent tab only, under the capture box, with ✕ | "Search scans…" in the header row, with ✕ | "Search contracts…" in the header row, with ✕ | "Search recipes…" in the header row, with ✕ | "Search…" full width, with ✕ |
| **Share (copy)** | Pill, top right on the search row | Pill, top right | Pill, top right | Pill "Share" with 👥 options inside | Pill, top right | Pill, row 2 right | Pill, top right | Pill, top right | Pill, top right | **None** | None |
| **👁 View** | Look, Spacing | Layout (Lined Paper, Show margin, 5 more switches), Look (no Multicolour), Spacing | Same as Tasks | Paper, Timeslots, Layout, Nudges, Look, Spacing | Layout (Lined Paper, Show margin, Highlight), Look, Spacing | Look, Spacing | Look, Spacing | Spacing only | Spacing only | Paper, Layout (Lined paper, Show margin), Spacing | None |
| **⋯ page menu** | Show Archive, Show Bin | Show Archive, Show Bin | Show Archive, Show Bin | Reset this week to this page's paper, Reset all pages to today's paper, Clear this day… | Show Archive, Show Bin | Rename life area, Import CSV, Export CSV, Split quantities, Show Archive, Show Bin | New category, Show Archive, Show Bin | Add from files…, Show Archive, Show Bin | Show Archive, Show Bin | Edit books, Import recipes, Add example recipes, Show Archive, Show Bin | None |
| **Pinned** | Yes: ☆ top right of card, "★ Pinned" filter | No | No | No | No | No | Yes: ☆ on contact page, pinned sort first, no filter, no Unpin in selection bar | No | No | Yes: ☆ on card, "★ Pinned" tab | No |
| **Lined paper / box** | Box only | Choice: lined (with or without margin) or box | Cards | Paper styles (always ruled) | Cards | Box only | Box only | Box only | Table (computer), cards (phone) | Cards | Box only |
| **Sticky header** | Yes, glass once stuck | No | No | No | No | Search bar only | No | No | No | Yes, glass once stuck | No |

## 2. Page level: an opened thing

| | Project | List | Box (Find Things) | Contact | Scan | Contract | Recipe | Batch |
|---|---|---|---|---|---|---|---|---|
| **Back** | "‹ Projects" pill inside the head box | "‹ Lists" pill inside the head box | "‹ [group name]" in its own bar | "‹ Back" | "‹ Scans" | "‹ Contracts" | "‹ Recipes" | "‹ [recipe]" or "‹ Batches" |
| **Area header still shown** | Yes (Tasks \| Projects, Share, 👁, ⋯) | No | No | Yes (New, tabs, Share, 👁, ⋯) | No | No | No | No |
| **👥 Share with a person** | Button in head, always | Button in head, always ("👥 Share") | None | None | None | None | Only once already shared (else card ⋯) | Only once shared |
| **👁 / ⋯ on the page** | Both (area's) | 👁 only | Neither | Both (area's) | Neither | Neither | 👁 only | 👁 only |
| **Name** | Input in glass head, colour dot | Input in glass head, colour dot | Label and name inputs, colour dot | Input in glass head | Input in glass head | Input in glass head | Textarea on the paper | Textarea on the paper |
| **Archive / Delete** | Bottom: Pause, Mark finished left; "Archive project", "Delete project" right | Bottom: "Archive list", "Delete list" | Bottom: "Archive box", "Delete box" | Bottom: Colour, Archive, Delete | Bottom: → Contract, Archive, Delete | Bottom: Renew or switch…, Archive, Delete | Bottom: "Archive recipe", "Delete recipe" | Bottom: "Delete batch" only (no Archive) |

## 3. Item level

Rows and cards inside an area. "Top right" means on the row's own first line, at the right.

| | Task (Tasks, project page) | Day Planner item | List item | Brain Dump note | Box item (Find Things) | Recipe card | Contact card | Scan / contract |
|---|---|---|---|---|---|---|---|---|
| **Resting** | ⠿ (hover), tick, title, chips, note | ⠿ (text glyph), tick, title, tags, note | ⠿, tick, text, ▾ n/m, note line | Head row (⠿, type, time, ☆), text, action row | Cube grip, name, ×qty, tags | Photo, title, tags, Make, ☆, ⋯ | Grip, name, about, chips | Card or table row |
| **Computer hover** | Green **"More"** top right | Green **"More"** top right | Green **"More"** top right | Action row brightens; **⋯ bottom right** | Green **"More"** top right | Card lifts; grip shows | Grip brightens | Background only |
| **Start editing** | Click anywhere on the line | Click anywhere on the line | Click anywhere on the line | Click the body text only | Click anywhere on the line | Open the page | Open the page | Open the page |
| **While editing: More** | "More ⇧Enter" **top right**, then "More (full) ⇧Enter" in the same spot; "✓ Done Ctrl+Enter" beside it | "More (full)" top right (no key hint); pills show straight away; ✓ Done in pill row | "More ⇧Enter" top right, goes straight to the panel (no quick stage, intended); no Done. The hover More opens the panel, it doesn't start editing | No More, no Done: click away or Esc | "More (full)" top right; Quantity pill underneath | n/a | n/a | n/a |
| **Full panel: Close** | **"✓ Close Esc" top right** | **"✓ Close Esc" top right** | "✓ Close" top right | No panel | "✓ Close" top right | n/a (page, ‹ back) | n/a (page) | n/a (page) |
| **Panel footer** | + Sub-task · Archive · Delete | Unallocate time · Let go · → Tasks · Archive · Delete | Archive · Delete (no + Sub-item) | n/a | Colour · Archive · Delete | n/a | n/a | n/a |
| **Shift+Enter** | More (with the note), then full panel; from the note too | Note in place, then full panel from the note | Full panel's note | New line | n/a | n/a | n/a | n/a |
| **↑ / ↓ keys** | Move editing row to row; Shift selects | Same | Same (since 1.55.07) | Blue box browses cards | Same as Tasks (since 1.55.07) | Blue box browses cards | Blue box browses cards | Blue box browses cards |
| **Ctrl+Enter** | Tick | Tick | Nothing | Save / finish | Add items (box page) | n/a | n/a | n/a |
| **Phone** | Swipe: ⋯ More, ✓ Done / Delete; hold drags | Swipe: ⋯ More, ✓ Done / Delete; tap arms, tap edits | Swipe: ⋯ More, **✓ Tick** / Delete | No swipe | No swipe; ⋯ hidden | Hold selects | No swipe | No swipe |
| **Selection bar** | Indent, Outdent, ↑ ↓, Done Ctrl+Enter, Move ▸, Archive A, Delete D | Done Ctrl+Enter, To place, Let go, Tomorrow, Archive A, Delete D | Indent, Outdent, ↑ ↓, Tick Ctrl+Enter, Untick, Add to template, Archive A, Delete D | ↑ ↓, Colour…, → Tasks, Pin, Unpin, Archive A, Delete D | Indent, Outdent, ↑ ↓, Colour…, Archive A, Delete D | ↑ ↓, Move to ▸, Pin, Unpin, Archive A, Delete D | Colour…, Store, Pin, Archive A, Delete D (no Unpin) | None |
| **Drag** | Hold anywhere | Hold anywhere | Hold anywhere | Hold ⠿ only | Hold grip | Hold ⠿ | None (grip shown but no drag) | None |
| **Sub-items** | 3 levels | None | 1 level | None | 1 level | n/a | n/a | n/a |

## 4. Main inconsistencies

Still open, numbered for reference. ★ marks the ones already raised. Fixed or settled ones move to section 5.

1. ★ **Card ⋯ menus come in different styles.** Recipe, contact, scan and contract cards open their own page, so they don't need More, but the ⋯ on their cards should be one style.
2. **"More" is two different things.** Tasks, Day Planner, Lists, box items: a green "More" pill top right. Brain Dump notes and recipe cards: a plain ⋯ at the bottom right (Brain Dump notes having no More is intended). The Day Planner's "More (full)" has no ⇧Enter hint.
3. **Ctrl+Enter** ticks in Tasks and the Day Planner but does nothing in Lists.
4. ★ **Lined paper or box** is only offered in Tasks (and project pages) and Lists. Everywhere else is box only, apart from the Day Planner and Batch Book, which have their own Paper styles (Batch Book has both Paper and a Lined paper switch). "Lined Paper" is capitalised differently in Batch Book.
5. ★ **New buttons differ in form and place.** "+ New list" is a pill top left, and it comes second after "+ New template", which is the highlighted one. Contacts has both a New button and a capture box. Wording mixes "New" and "Add" (+ Add a detail, + Detail).
6. ★ **Filter bars come in two styles.** Underlined tabs: Brain Dump, Tasks, Batch Book. Pills in glass: Scans, Contracts, Find Things, Tidied. The glass hugs the pills in Scans and Contracts but fills the row in Find Things. "All" is first in Scans, last in Contracts.
7. ★ **Switches between parts sit in different places.** Tasks \| Projects: small pills top left. Contacts: large pills right beside "+ New contact" (the only area where they touch the New button). Batch Book: on the right, next to 👁. Tidied: joined to the filter pills.
8. ★ **Search boxes differ.** "(press /)" only in Find Things. Search sits in the header row (Scans, Contracts, Batch Book), on its own row (Find Things, Tidied), beside Share (Brain Dump) or further down the page (Contacts).
9. ★ **Pinned** only in Brain Dump, Batch Book and Contacts, each shown differently (☆ top right of card, ☆ in the card's action row, ☆ only on the contact's page). Contacts has no Pinned filter and no Unpin in its selection bar.
10. **Two different "Share" buttons with the same word.** The page Share pill copies text; "👥 Share" on a list or project shares with a person. Batch Book has no Share pill. An open list has 👥 but no copy Share; the Lists page has copy Share but no 👥. Recipes show 👥 only once already shared.
11. **Opened pages are built differently.** The area header stays on project and contact pages but not on the others. Back reads "‹ Back", "‹ Projects", "‹ [group name]" and so on. 👁 and ⋯ come and go. "Archive project"/"Archive list"/"Archive box" vs plain "Archive". Batches can't be archived.
12. **👁 contents vary with no pattern**: Look is missing from Scans, Contracts and Batch Book; Multicolour from Tasks and the Day Planner. Contracts has alternate-shading styling that can never be switched on.
13. **Tick wording**: "✓ Tick / Untick" in Lists, "✓ Done / Not done" in Tasks and the Day Planner. "Done" is also the close button on some Day Planner sheets.
14. **Selection bars**: drag handles are an icon in most areas and a text "⠿" in the Day Planner; Contacts shows a grip but can't be dragged.
15. **Closing sheets and panels**: top right (Tasks, Day Planner, Lists, box items), "Done" at bottom right (sharing), "Cancel … Save" (Batch Book sheets), ✕ (photo viewer, custom theme), nothing (most sheets, by design).
16. **Saved messages**: "✓ Saved" with no Undo in Settings, "Saved · Undo" elsewhere.
17. **Empty states**: "Nothing matches." / "Nothing here." / "Nothing found"; Tasks has none apart from Done.
18. **Hard to reach**: History is only linked from Settings (not from any ⋯ as the code says); Tidied has no link from Settings.
19. **Colours only sometimes show.** Projects, lists and recipes always show their colour. Brain Dump notes, contacts, Find Things' box cards and the things in a box only show theirs when 👁 Look is Multicolour (a box's own page always shows its lid colour). To decide: show them always, the project way, or leave them to Multicolour.
20. **Contact cards look different from Brain Dump notes and Find Things' boxes.** To make consistent with one or both. Contact cards: plain glass, 260px wide columns, name in normal weight (Brain Dump titles and box names are bold), the grip top right, the when at the bottom (Brain Dump: in a head row at the top, with the type and ☆), no ⋯ or action row, ☆ only on the contact's page, detail chips in the card body. Brain Dump notes: narrower columns, a head row, an action row (→ Task, Plan it, Archive, ⋯). Boxes: a coloured lid band and a label strip, always in their colour; contact cards show theirs only with Multicolour.

## 5. Resolved

- **List items edit like tasks** (was point 1): click anywhere on the line to edit, More top right, ✓ Close top right. Fixed in 1.54.10 for Lists and Find Things. Lists' More goes straight to the panel, with no quick stage and no ✓ Done: intended. Since 1.55.01 the hover More on a list item opens the panel; clicking the line is for editing.
- **Brain Dump notes** edit from their text only and have no More or Done: intended.
- **Shift+Enter** (was point 3) goes one step further each press, from the note as well as the name, in Tasks and the Day Planner (1.55.05). Lists go straight to the panel: intended. Now a settled rule.
- **Mouse wheel over sideways rows** scrolls them (1.55.02). Now a settled rule.
- **Recipe card ⋯ menu** no longer runs up under the sticky books bar; ⋯ menus stay below the top bar and sticky bars (1.55.03).
- **Full-screen ⤢ and its Done are green** like More (1.55.04). Now part of the "green means open or close" rule.
- **Arrow keys in an open list and a box's things** work like Tasks: ↑ / ↓ move editing, Shift selects, no blue box (1.55.07). Now a settled rule.
- **Full-screen ⤢ shows its key** (Alt+Enter, then Esc) on every note's toolbar, Brain Dump's new note included, and full screen's Done shows Esc (1.55.14).
- **List colours** show the way project colours do, whatever the Look (1.55.08). Now a settled rule.
- **Find Things' New buttons** (was point 6): "+ New box" (asks which group), "+ New group" and "+ New life area" are pills at the top left, like the other areas' New pills. Its ⋯ keeps only the rarely used things: Rename life area, Import, Export, Split quantities, Show Archive, Show Bin (1.55.09).
- **Projects' New button** (part of point 5): "+ New project" is a pill at the top left of the Projects page, beside Tasks | Projects, instead of a dashed square at the end of the grid (1.55.10).
- **Search boxes in Scans, Contracts and Batch Book** (part of point 8) use the shared search box style, with the ✕ to clear while there's text, like Brain Dump, Find Things, Contacts and Tidied (1.55.11).
- **Day Planner ⋯ menu** (was point 12): a ⋯ at the top right, like the other areas, holds Reset this week to this page's paper, Reset all pages to today's paper and Clear this day…; the "Housekeeping:" line at the bottom of each day is gone (1.55.12).
- **Selection bar keys** (part of point 14): A Archive, D Delete and Ctrl+Enter Done or Tick, with the key on the button, in every selection bar (Tasks, Day Planner, Lists, Brain Dump, Find Things, Contacts, Batch Book, Tidied). The Day Planner's bar gained Archive (1.55.13). Now a settled rule.
- **Contact cards, short-term fix** (part of point 20): a long email or web address in a card's name wraps instead of running into the next card, the "From ..." line is a tappable link instead of raw link text, and "What was this?" only shows when there's nothing but a number (1.55.16).
