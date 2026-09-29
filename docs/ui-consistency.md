# UI consistency

A map of how every area of Sift shows its controls, made to find where areas do the same job in different ways. New UI follows the **settled rules** below; where a row has no settled rule yet, copy the way most areas already do it and add the choice here.

Audited at 1.54.09 (29 September 2026), updated for 1.54.10, from the code and by opening every area at phone and computer widths in Tight, Medium and Loose spacing, lined and box. The same audit is GitHub issue #284; keep the two in sync.

## Settled rules (as decided)

- **⋯ page menu** holds only rarely used things: Show Archive, Show Bin, import, export, example data. Primary actions never go in it.
- **New things**: a "+ New [thing]" button at the top left of the page.
- **Switching between parts of an area** (Tasks | Projects, Recipes | Batches): a switch always visible on the page, never in a menu.
- **No search box** on Tasks, Projects, Lists or the Day Planner: intended. The search in the top bar covers them.
- **Scans' "Scan" button** has no "New" and no "+": intended (it takes a photo), noted only.
- **Anything that puts something into a project** (Move, the 📁 Project pill, Brain Dump conversion, any picker) lists projects shared with you too, with 👥.
- **Editing a row**: clicking anywhere outside it stops editing.

## 1. Page level: areas that list things

What each area shows before anything is opened. "Share (copy)" is the Share pill that copies the page as text; "👥" is sharing with a person.

| | Brain Dump | Tasks > Tasks | Tasks > Projects | Day Planner | Lists | Find Things | Contacts | Scans | Contracts | Batch Book | Tidied |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **New item** | "New note" box at the top of the page, Save button | None: type into the "New task" line | "+ New project" dashed square, last tile in the grid | None: click a ruled line (Schedule), "New task" line (Tasks) | Two pills top left: "+ New template" (primary, first), "+ New list" | No button. "+ Add box" dashed tile per group; "Add box", "Add group", "New life area" in ⋯ | "+ New contact" pill top left (becomes "+ New case" on Cases); also a capture box with Save | "Scan" pill top left (icon, no "+ New"); "Add from files…" in ⋯ | "+ New contract" pill top left | "+ New recipe" pill top left | None |
| **Switch between parts** | None | Tasks \| Projects: small pills in own glass, top left | Same | None (day ‹ 📅 Today › top left) | None (Templates, Lists as headings) | Life areas: pills, glass track fills the row | Recent \| Directory \| Cases: large pills in own glass, right beside "+ New contact" | None | None | Recipes \| Batches: small pills with emoji, on the right next to 👁 (drops to row 2 on phones) | Archive \| Bin: pills in own glass, top left |
| **Filter bar** | Underlined tabs, full width, under search; ⋯ at the end edits types | Underlined tabs (Task Dump, Now, Next, Later, Done, All), same row as Tasks \| Projects | None | None | None | None (life areas act as the filter) | None (Directory uses category tiles) | Pills in glass that hugs them, own row | Pills in glass that hugs them, own row; "All" last | Underlined tabs per book, coloured underline, ⋯ at the end; tag chips row under it | Pills in glass (areas), same row as Archive \| Bin |
| **Search** | "Search your notes…", with ✕ | None (intended) | None (intended) | None (intended) | None (intended) | "Find anything… (press /)", full width, own row above everything, with ✕ | "Search contacts…", Recent tab only, under the capture box, with ✕ | "Search scans…" in the header row, no ✕, different style | "Search contracts…" in the header row, no ✕, different style | "Search recipes…" in the header row, no ✕, different style | "Search…" full width, with ✕ |
| **Share (copy)** | Pill, top right on the search row | Pill, top right | Pill, top right | Pill "Share" with 👥 options inside | Pill, top right | Pill, row 2 right | Pill, top right | Pill, top right | Pill, top right | **None** | None |
| **👁 View** | Look, Spacing | Layout (Lined Paper, Show margin, 5 more switches), Look (no Multicolour), Spacing | Same as Tasks | Paper, Timeslots, Layout, Nudges, Look, Spacing | Layout (Lined Paper, Show margin, Highlight), Look, Spacing | Look, Spacing | Look, Spacing | Spacing only | Spacing only | Paper, Layout (Lined paper, Show margin), Spacing | None |
| **⋯ page menu** | Show Archive, Show Bin | Show Archive, Show Bin | Show Archive, Show Bin | **None** ("Housekeeping:" links at page bottom instead) | Show Archive, Show Bin | Add box, Add group, New life area, Rename life area, Import CSV, Export CSV, Split quantities, Show Archive, Show Bin | New category, Show Archive, Show Bin | Add from files…, Show Archive, Show Bin | Show Archive, Show Bin | Edit books, Import recipes, Add example recipes, Show Archive, Show Bin | None |
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
| **While editing: More** | "More ⇧Enter" **top right**, then "More (full) ⇧Enter" in the same spot; "✓ Done Ctrl+Enter" beside it | "More (full)" top right (no key hint); pills show straight away; ✓ Done in pill row "More ⇧Enter" top right, goes straight to the panel (no quick stage); no Done | No More, no Done: click away or Esc | "More (full)" top right; Quantity pill underneath | n/a | n/a | n/a |
| **Full panel: Close** | **"✓ Close Esc" top right** | **"✓ Close Esc" top right** | "✓ Close" top right | No panel | "✓ Close" top right | n/a (page, ‹ back) | n/a (page) | n/a (page) |
| **Panel footer** | + Sub-task · Archive · Delete | Unallocate time · Let go · → Tasks · Archive · Delete | Archive · Delete (no + Sub-item) | n/a | Colour · Archive · Delete | n/a | n/a | n/a |
| **Shift+Enter** | More, then full panel | Note, in place | Full panel's note | New line | n/a | n/a | n/a | n/a |
| **Ctrl+Enter** | Tick | Tick | Nothing | Save / finish | Add items (box page) | n/a | n/a | n/a |
| **Phone** | Swipe: ⋯ More, ✓ Done / Delete; hold drags | Swipe: ⋯ More, ✓ Done / Delete; tap arms, tap edits | Swipe: ⋯ More, **✓ Tick** / Delete | No swipe | No swipe; ⋯ hidden | Hold selects | No swipe | No swipe |
| **Selection bar** | Indent, Outdent, ↑ ↓, Done Ctrl+Enter, Move ▸, Archive A, Delete D | Done, To place, Let go, Tomorrow, Delete (no key hints) | Indent, Outdent, ↑ ↓, Tick, Untick, Add to template, Archive, Delete | ↑ ↓, Colour…, → Tasks, Pin, Unpin, Archive, Delete (no key hints) | Indent, Outdent, ↑ ↓, Colour…, Archive, Delete | ↑ ↓, Move to ▸, Pin, Unpin, Archive A, Delete | Colour…, Store, Pin, Archive, Delete (no Unpin) | None |
| **Drag** | Hold anywhere | Hold anywhere | Hold anywhere | Hold ⠿ only | Hold grip | Hold ⠿ | None (grip shown but no drag) | None |
| **Sub-items** | 3 levels | None | 1 level | None | 1 level | n/a | n/a | n/a |

## 4. Main inconsistencies

Numbered for reference. ★ marks the ones already raised.

1. ★ **List items didn't edit like tasks** (click anywhere on the line, More top right, Close top right). Fixed in 1.54.10 for Lists and Find Things. Still different: Lists' More goes straight to the panel (no quick stage, no ✓ Done); Brain Dump notes still only edit from their text and have no More or Done. Brain Dump notes are edited in place like rows, so they should get the same pattern (green More top right, then ✓ Close). Recipe, contact, scan and contract cards open their own page instead, so they don't need it, but their card ⋯ should be one style.
2. **"More" is two different things.** Tasks, Day Planner, Lists, box items: a green "More" pill top right. Brain Dump notes and recipe cards: a plain ⋯ at the bottom right. The Day Planner's "More (full)" has no ⇧Enter hint.
3. **Shift+Enter** means More in Tasks, the note in place in the Day Planner, and the panel's note in Lists. Ctrl+Enter ticks in Tasks and the Day Planner but does nothing in Lists.
4. ★ **Lined paper or box** is only offered in Tasks (and project pages) and Lists. Everywhere else is box only, apart from the Day Planner and Batch Book, which have their own Paper styles (Batch Book has both Paper and a Lined paper switch). "Lined Paper" is capitalised differently in Batch Book.
5. ★ **New buttons differ in form and place.** "+ New project" is a dashed square at the end of the grid; "+ New list" is a pill top left, and it comes second after "+ New template", which is the highlighted one. Find Things has no New button at all ("+ Add box" tiles, the rest in ⋯). Contacts has both a New button and a capture box. Wording mixes "New" and "Add" (New life area, Add box, Add group, + Add a detail, + Detail).
6. ★ **Find Things ⋯ holds primary actions**: Add box, Add group, New life area, Rename life area. No other area's ⋯ has "New"/"Add" items (Scans' "Add from files…" and Contacts' "New category" are smaller cases of the same).
7. ★ **Filter bars come in two styles.** Underlined tabs: Brain Dump, Tasks, Batch Book. Pills in glass: Scans, Contracts, Find Things, Tidied. The glass hugs the pills in Scans and Contracts but fills the row in Find Things. "All" is first in Scans, last in Contracts.
8. ★ **Switches between parts sit in different places.** Tasks \| Projects: small pills top left. Contacts: large pills right beside "+ New contact" (the only area where they touch the New button). Batch Book: on the right, next to 👁. Tidied: joined to the filter pills.
9. ★ **Search boxes differ.** "(press /)" only in Find Things. Scans, Contracts and Batch Book use a different style with no ✕ to clear. Search sits in the header row (Scans, Contracts, Batch Book), on its own row (Find Things, Tidied), beside Share (Brain Dump) or further down the page (Contacts).
10. ★ **Pinned** only in Brain Dump, Batch Book and Contacts, each shown differently (☆ top right of card, ☆ in the card's action row, ☆ only on the contact's page). Contacts has no Pinned filter and no Unpin in its selection bar.
11. **Two different "Share" buttons with the same word.** The page Share pill copies text; "👥 Share" on a list or project shares with a person. Batch Book has no Share pill. An open list has 👥 but no copy Share; the Lists page has copy Share but no 👥. Recipes show 👥 only once already shared.
12. **Opened pages are built differently.** The area header stays on project and contact pages but not on the others. Back reads "‹ Back", "‹ Projects", "‹ [group name]" and so on. 👁 and ⋯ come and go. "Archive project"/"Archive list"/"Archive box" vs plain "Archive". Batches can't be archived.
13. **Day Planner has no ⋯**; its rarely used actions are lowercase "Housekeeping:" links at the bottom.
14. **👁 contents vary with no pattern**: Look is missing from Scans, Contracts and Batch Book; Multicolour from Tasks and the Day Planner. Contracts has alternate-shading styling that can never be switched on.
15. **Tick wording**: "✓ Tick / Untick" in Lists, "✓ Done / Not done" in Tasks and the Day Planner. "Done" is also the close button on some Day Planner sheets.
16. **Selection bars**: key hints only in Tasks and Batch Book; drag handles are an icon in most areas and a text "⠿" in the Day Planner; Contacts shows a grip but can't be dragged.
17. **Closing sheets and panels**: top right (Tasks, Day Planner), bottom left (Lists, box items), "Done" at bottom right (sharing), "Cancel … Save" (Batch Book sheets), ✕ (photo viewer, custom theme), nothing (most sheets, by design).
18. **Saved messages**: "✓ Saved" with no Undo in Settings, "Saved · Undo" elsewhere.
19. **Empty states**: "Nothing matches." / "Nothing here." / "Nothing found"; Tasks has none apart from Done.
20. **Hard to reach**: History is only linked from Settings (not from any ⋯ as the code says); Tidied has no link from Settings.
