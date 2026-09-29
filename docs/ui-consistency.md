# UI consistency

How every area of Sift shows its controls, to find where areas do the same job in different ways. All new UI follows the **standards** below. Where there's no standard yet, copy what most areas already do and add the choice here. The same text is GitHub issue #284; keep the two in sync.

Audited at 1.54.09 (29 September 2026), updated for 1.56.00.

## Standards to follow

**Buttons and menus**
- **+ New [thing]** is a pill at the top left of the page. Scans' "Scan" button is the one exception (it takes a photo).
- **⋯ menus** hold only rarely used things (Show Archive, Show Bin, import, export, example data). Primary actions never go in one. ⋯ menus open below the top bar and sticky bars and scroll inside if long (1.55.03).
- **Green means open or close** (More, More (full), ✓ Close, a note's ⤢ and its Done), and a green button with a key shows it (hidden on touch screens) (1.55.04, 1.55.14). Shared rule in `app.css` (search `.close-top, .md-full`).
- **Switching between parts of an area** (Tasks | Projects, Recipes | Batches) is always visible on the page, never in a menu.

**Keys**
- **Shift+Enter** goes one step further: name, then quick edit with its note, then the full panel. Lists and the Day Planner have no quick stage and go straight to the panel (1.55.05, 1.58.06).
- **↑ / ↓** move editing between rows edited in place (Tasks, Day Planner, an open list, a box's things); **Shift+↑ / ↓** select. The blue browsing box is only for cards and grids (1.55.07).
- **Ticking off** (one tick, or Done / Tick on a selection bar) plays the same animation everywhere: `tickWave` then `fadeFold` in `tickwave.js` (tick springs with a ring, letters hop, light passes, line drawn, then fade and fold if the row is leaving). Tasks, Projects, Day Planner, Lists (1.56.02).
- **Selection bars**: A Archive, D (or Delete) Delete, Ctrl+Enter Done or Tick, each key shown on its button. Built into `listkit.js` (1.55.13).
- **Esc on an opened page**: the first Esc leaves the field (keeping what's typed; an Add items box adds it), the next goes back. The back button shows Esc when nothing is being typed (1.55.15).

**Rows, cards and pages**
- **Choosing several cards**: things shown as cards or boxes (Find Things' boxes, Brain Dump notes, Batch Book recipes, Contacts) can be chosen by pressing and holding one, which brings up the selection bar, as in Batch Book; while any are chosen, a tap adds or removes one (Shift+tap: a run). Shift+arrows select while browsing. Esc or the bar's ✕ clears. Each card has a ⠿ in its top left corner, as on Batch Book's cards, with the card's first line moved right to make room; it shows on hover on a computer and all the time on touch screens; clicking it chooses the card (Brain Dump notes have theirs at the start of the head row, which is the same spot). One CSS rule places and shows it for every card grid (1.57.04). Built into `listkit.js` (`holdSelect`) and `browse.js` (1.56.00, 1.57.00).
- **Managing categories, areas and groups** (Brain Dump's types, Find Things' life areas and groups) always uses the one manager sheet (`openManager` in `typesheet.js`): a pull-up list to add, rename, drag to reorder and remove, opened by the ⋯ at the end of the filter bar. No small pop-up menus for this. Removing one with things in it asks first and says what goes to the Bin with it (1.56.00, 1.57.03). Two levels (Find Things: life areas with their groups) are one sheet with the inner level indented, a short hint at the top, and the Tasks way of moving rows: hold and drag, drop onto a row, Tab / Shift+Tab, ⠿ to choose several (1.58.00).
- **Swiping sideways on an opened thing** (a project, list, box, contact, case, recipe, batch, scan or contract) goes back, either way, as its ‹ button does: a box goes back to the boxes, a project to Projects and then Tasks. Built once in `app.js` (`installSwipe`, any visible `#main button.back`); Tasks does it for projects through ← / → (1.57.05).
- **Adding to an opened thing** (a project's tasks, an open list, a box's contents): the add box is at the top, above what's in it, as Tasks. In a box it is one line in line with the things, with a faint cube where theirs are (no lined paper, no rounded box); in Tasks and Lists it follows 👁 Layout (a rounded box with Add Enter when lined paper is off). ↓ from it goes to the first row (1.57.06, 1.57.07).
- **A long opened thing keeps its top in view** as it scrolls: an open list's head and ticks bar, a box's back and search bar and its whole lid (label, where it lives, notes, photo), a project's head and progress, each with a glass backing once stuck (1.57.09, 1.58.02). A field that is usually empty (a box's Notes) shows as a small + Add pill until it has something.
- **Editing a row**: click anywhere on its line to start, anywhere outside to stop.
- **Sideways rows** (filter bars, tabs, pill rows) scroll with the mouse wheel; at the end the page scrolls. Built once (`installWheelRows` in `app.js`) (1.55.02).
- **Search boxes** share one style with a ✕ to clear (1.55.11). Tasks, Projects, Lists and the Day Planner have none on purpose: the top bar search covers them.
- **Sticky top**: on an area's main page, the whole top (+ New pills, 👁, ⋯, search, filter bar) stays in view while scrolling, with a glass background once stuck (Batch Book, Find Things 1.58.01, Tasks, Projects and Contacts 1.58.03). Brain Dump keeps its New note box scrolling away and pins its search and types.
- **👁 Spacing on card grids** changes the cards' size: Tight is small cards (more on screen), Loose is big ones showing more of each (Find Things' boxes 1.58.01).
- **Cards with a photo** keep one shape: the photo is cropped to its frame (square on recipe cards, 4:3 on scans) and never sets the card's height (1.55.17).
- **A thing's colour** shows the project way wherever it has one: a 4px coloured edge on its card and page head, and its progress bar in its colour, whatever the Look. Built on `--c` (1.55.08).
- **Putting something into a project** (Move, 📁 Project pill, Brain Dump conversion, any picker) lists projects shared with you too, with 👥.

## 1. Page level: areas that list things

What each area shows before anything is opened. "Share (copy)" is the Share pill that copies the page as text; "👥" is sharing with a person.

| | Brain Dump | Tasks > Tasks | Tasks > Projects | Day Planner | Lists | Find Things | Contacts | Scans | Contracts | Batch Book | Tidied |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **New item** | "New note" box at the top of the page, Save button | None: type into the "New task" line | "+ New project" pill top left, beside Tasks \| Projects (on phones, on the row under it) | None: click a ruled line (Schedule), "New task" line (Tasks) | Two pills top left: "+ New template" (primary, first), "+ New list" | Three pills top left: "+ New box" (primary, asks which group), "+ New group", "+ New life area" (no per-group tile since 1.58.01) | "+ New contact" pill top left (becomes "+ New case" on Cases); also a capture box with Save | "Scan" pill top left (icon, no "+ New"); "Add from files…" in ⋯ | "+ New contract" pill top left | "+ New recipe" pill top left | None |
| **Switch between parts** | None | Tasks \| Projects: small pills in own glass, top left | Same | None (day ‹ 📅 Today › top left) | None (Templates, Lists as headings) | None (life areas are its filter bar) | Recent \| Directory \| Cases: large pills in own glass, right beside "+ New contact" | None | None | Recipes \| Batches: small pills with emoji, on the right next to 👁 (drops to row 2 on phones) | Archive \| Bin: pills in own glass, top left |
| **Filter bar** | Underlined tabs, full width, under search; ⋯ at the end edits types | Underlined tabs (Task Dump, Now, Next, Later, Done, All), same row as Tasks \| Projects | None | None | None | Life areas: underlined tabs like Brain Dump's and Tasks', full width, ⋯ at the end opens the Life areas / groups sheet; ← / → switch them | None (Directory uses category tiles) | Pills in glass that hugs them, own row | Pills in glass that hugs them, own row; "All" last | Underlined tabs per book, coloured underline, ⋯ at the end; tag chips row under it | Pills in glass (areas), same row as Archive \| Bin |
| **Search** | "Search your notes…", with ✕ | None (intended) | None (intended) | None (intended) | None (intended) | "Find anything… (press /)", full width, own row above everything, with ✕ | "Search contacts…", Recent tab only, under the capture box, with ✕ | "Search scans…" in the header row, with ✕ | "Search contracts…" in the header row, with ✕ | "Search recipes…" in the header row, with ✕ | "Search…" full width, with ✕ |
| **Share (copy)** | Pill, top right on the search row | Pill, top right | Pill, top right | Pill "Share" with 👥 options inside | Pill, top right | Pill, row 2 right | Pill, top right | Pill, top right | Pill, top right | **None** | None |
| **👁 View** | Look, Spacing | Layout (Lined Paper, Show margin, 5 more switches), Look (no Multicolour), Spacing | Same as Tasks | Paper, Timeslots, Layout, Nudges, Look, Spacing | Layout (Lined Paper, Show margin, Highlight), Look, Spacing | Look, Spacing | Look, Spacing | Spacing only | Spacing only | Paper, Layout (Lined paper, Show margin), Spacing | None |
| **⋯ page menu** | Show Archive, Show Bin | Show Archive, Show Bin | Show Archive, Show Bin | Reset this week to this page's paper, Reset all pages to today's paper, Clear this day… | Show Archive, Show Bin | Import CSV, Export CSV, Split quantities, Show Archive, Show Bin | New category, Show Archive, Show Bin | Add from files…, Show Archive, Show Bin | Show Archive, Show Bin | Edit books, Import recipes, Add example recipes, Show Archive, Show Bin | None |
| **Pinned** | Yes: ☆ top right of card, "★ Pinned" filter | No | No | No | No | No | Yes: ☆ on contact page, pinned sort first, no filter, no Unpin in selection bar | No | No | Yes: ☆ on card, "★ Pinned" tab | No |
| **Lined paper / box** | Box only | Choice: lined (with or without margin) or box | Cards | Paper styles (always ruled) | Cards | Box only | Box only | Box only | Table (computer), cards (phone) | Cards | Box only |
| **Sticky header** | Search and types only (the New note box scrolls away), glass once stuck | Yes, glass once stuck (1.58.03) | Yes, glass once stuck (1.58.03) | No | No | Yes: the whole top (pills, search, life areas), glass once stuck (1.58.01) | Yes, glass once stuck (1.58.03) | No | No | Yes, glass once stuck | No |

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
| **Resting** | ⠿ (hover), tick, title, chips, note | ⠿ (text glyph), tick, title, tags, note | ⠿, tick, text, ▾ n/m, note line | Head row (⠿, type, time, ☆), text, Archive and ⋯ (→ Task, Plan it, → Find Things are in the ⋯) | Cube grip, name, ×qty, tags | Photo, title, tags, Make, ☆, ⋯ | Grip, name, about, chips | Card or table row |
| **Computer hover** | Green **"More"** top right | Green **"More"** top right | Green **"More"** top right | Action row brightens; **⋯ bottom right** | Green **"More"** top right | Card lifts; grip shows | Grip brightens | Background only |
| **Start editing** | Click anywhere on the line | Click anywhere on the line | Click anywhere on the line | Click the body text only | Click anywhere on the line | Open the page | Open the page | Open the page |
| **While editing: More** | "More ⇧Enter" **top right**, then "More (full) ⇧Enter" in the same spot; "✓ Done Ctrl+Enter" beside it | "More ⇧Enter" top right, goes straight to the panel (no quick stage, since 1.58.06); Ctrl+Enter ticks. The hover More opens the panel too | "More ⇧Enter" top right, goes straight to the panel (no quick stage, intended); no Done. The hover More opens the panel, it doesn't start editing | No More, no Done: click away or Esc | "More (full)" top right; Quantity pill underneath | n/a | n/a | n/a |
| **Full panel: Close** | **"✓ Close Esc" top right** | **"✓ Close Esc" top right** | "✓ Close" top right | No panel | "✓ Close" top right | n/a (page, ‹ back) | n/a (page) | n/a (page) |
| **Panel footer** | + Sub-task · Archive · Delete | Unallocate time · Let go · → Tasks · Archive · Delete | Archive · Delete (no + Sub-item) | n/a | Colour · Archive · Delete | n/a | n/a | n/a |
| **Shift+Enter** | More (with the note), then full panel; from the note too | Full panel (since 1.58.06) | Full panel's note | New line | n/a | n/a | n/a | n/a |
| **↑ / ↓ keys** | Move editing row to row; Shift selects | Same | Same (since 1.55.07) | Blue box browses cards | Same as Tasks (since 1.55.07) | Blue box browses cards | Blue box browses cards | Blue box browses cards |
| **Ctrl+Enter** | Tick | Tick | Nothing | Save / finish | Add items (box page) | n/a | n/a | n/a |
| **Phone** | Swipe: ⋯ More, ✓ Done / Delete; hold drags | Swipe: ⋯ More, ✓ Done / Delete; tap arms, tap edits | Swipe: ⋯ More, **✓ Tick** / Delete | No swipe; hold selects | No swipe; ⋯ hidden (a box card: hold selects) | Hold selects | No swipe; hold selects | No swipe |
| **Selection bar** | Indent, Outdent, ↑ ↓, Done Ctrl+Enter, Move ▸, Archive A, Delete D | Done Ctrl+Enter, To place, Let go, Tomorrow, Archive A, Delete D | Indent, Outdent, ↑ ↓, Tick Ctrl+Enter, Untick, Add to template, Archive A, Delete D | ↑ ↓, Colour…, Move ▸ (→ Tasks, Plan it…, → Find Things…), Pin, Unpin, Archive A, Delete D | Indent, Outdent, ↑ ↓, Move to box…, Colour…, Archive A, Delete D (the boxes themselves: Move to…, Colour…, Archive A, Delete D) | ↑ ↓, Move to ▸, Pin, Unpin, Archive A, Delete D | Colour…, Store, Pin, Archive A, Delete D (no Unpin) | None |
| **Drag** | Hold anywhere | Hold anywhere | Hold anywhere | Hold ⠿ only | Hold anywhere (1.58.04) | Hold ⠿ | None (grip shown but no drag) | None |
| **Sub-items** | 3 levels | None | 1 level | None | 1 level | n/a | n/a | n/a |

## 4. Main inconsistencies

### Still open

★ marks the ones already raised.

- ★ **Cards**
  - The ⋯ on recipe, contact, scan and contract cards comes in different styles.
  - Brain Dump notes and recipe cards use a plain ⋯ at the bottom right where rows use a green More (Brain Dump notes having no More is intended).
  - Contact cards look unlike Brain Dump notes and Find Things' boxes: plain glass, wider columns, name not bold, the when at the bottom, no action row.
- **Colour** on Brain Dump notes, contacts, Find Things' box cards and a box's things only shows with 👁 Look Multicolour. To decide: always, the project way, or leave to Multicolour.
- ★ **Page headers**
  - New buttons: Lists' "+ New list" comes second after the highlighted "+ New template"; Contacts has a New button and a capture box; wording mixes "New" and "Add" (+ Add a detail, + Detail).
  - Switches between parts sit in different places: top left (Tasks), beside the New pill (Contacts), on the right by 👁 (Batch Book), joined to the filters (Tidied).
  - Filter bars come in two styles: underlined tabs (Brain Dump, Tasks, Batch Book) and pills in glass (Scans, Contracts, Tidied). "All" is first in Scans, last in Contracts.
  - Search sits in the header row, on its own row, beside Share or further down; only Find Things says "(press /)".
- **Share**
  - One word for two jobs: the Share pill copies text, "👥 Share" shares with a person.
  - Batch Book has no Share pill; an open list has 👥 but no copy Share; recipes show 👥 only once shared.
- **Opened pages**
  - The area header stays on project and contact pages only; 👁 and ⋯ come and go.
  - Back reads "‹ Back", "‹ Projects", "‹ [group name]" and so on.
  - "Archive project/list/box" vs plain "Archive"; batches can't be archived.
- **👁 View menu** contents vary: no Look in Scans, Contracts and Batch Book; no Multicolour in Tasks and the Day Planner; Contracts has shading that can't be switched on.
- ★ **Lined paper or box** is only offered in Tasks and Lists; the Day Planner and Batch Book have their own Paper styles; "Lined Paper" is capitalised differently in Batch Book.
- ★ **Pinned** exists only in Brain Dump, Batch Book and Contacts, shown three ways; Contacts has no Pinned filter and no Unpin.
- **Keys and wording**
  - Ctrl+Enter ticks in Tasks and the Day Planner but not on list items.
  - Tick words: "Tick / Untick" in Lists, "Done / Not done" in Tasks and the Day Planner, where "Done" also closes some sheets.
  - Saved messages: "✓ Saved" with no Undo in Settings, "Saved · Undo" elsewhere.
  - Empty states: "Nothing matches." / "Nothing here." / "Nothing found"; Tasks has none apart from Done.
- **No selection bar** on Scans, Contracts or the Lists page's list cards.
- **Drag handles**: an icon in most areas, a text "⠿" in the Day Planner; Contacts shows a grip but can't be dragged.
- **Closing sheets and panels**: ✓ Close top right, "Done" bottom right, "Cancel … Save", ✕, or nothing.
- **Hard to reach**: History is only linked from Settings; Tidied has no link from Settings.
- To decide: the Day Planner's green "↓ Bring in from tasks" doesn't open or close anything, so it breaks the green rule.

### Addressed

- List items and a box's things edit like tasks: click the line, More and ✓ Close top right (1.54.10, 1.55.01).
- Mouse wheel scrolls sideways rows (1.55.02).
- ⋯ menus stay below sticky bars (1.55.03).
- Full-screen ⤢ and its Done are green (1.55.04) and show their keys (1.55.14).
- Shift+Enter goes one step further, from the note too (1.55.05).
- Day Planner tasks: no quick edit stage, More goes straight to the full panel (no start and end times in it) and no longer covers the time pill (1.58.06).
- Tick-off fade restored (1.55.06).
- Arrow keys in an open list and a box's things work like Tasks (1.55.07).
- List colours show like project colours (1.55.08).
- Find Things' New buttons are pills top left; its ⋯ keeps only rare things (1.55.09).
- Projects' "+ New project" is a pill top left (1.55.10).
- Scans, Contracts and Batch Book search boxes use the shared style with ✕ (1.55.11).
- Day Planner has a ⋯ top right for reset and clear (1.55.12).
- Selection bar keys A, D, Ctrl+Enter everywhere; the Day Planner's bar gained Archive (1.55.13).
- Esc leaves the Add items box, then the page; back buttons show Esc (1.55.15).
- Contact cards: long names wrap, "From ..." is a link (1.55.16).
- Recipe cards all the same height, photos cropped square (1.55.17).
- Find Things: life areas and groups get their own ⋯ (1.56.00); the life areas are a filter bar of underlined tabs like Brain Dump's and Tasks' (1.57.01).
- Find Things' life areas and groups are managed in the same sheet as Brain Dump's types (1.57.03), now one Life areas / groups sheet with groups indented and no ⋯ beside group names (1.58.00).
- Choosing several cards by press and hold works in Find Things, Brain Dump, Contacts and Batch Book (1.56.00); every card shows its ⠿ on hover, Find Things' boxes included (1.57.00); the ⠿ is top left on every card grid, always shown on touch screens (1.57.04).
- Brain Dump notes: → Task, Plan it and → Find Things moved from the card into its ⋯, and into the selection bar's Move ▸ (1.57.00).
- Intended, not changing: Brain Dump notes edit from their text only, with no More or Done; list items go straight to the panel.
