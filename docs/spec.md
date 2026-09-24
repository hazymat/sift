# Sift — spec

> *sift (v.)*: to sort through a loose mass so that what matters settles into order. Sift is where your scattered tasks, thoughts, things, receipts, contracts and trusted people gradually find their place.

## 1. Goals

- One personal "life app": a day planner (the heart of it), tasks/projects, braindump, where-things-are, contacts (quick-capture people and organisations, incl. trusted trades), quick scans, personal contracts. Contracts + Scans together are the digital home filing cabinet.
- Runs on iPhone and laptop as an installable PWA (HTML/CSS/JS, no framework, no build step).
- **Local-first**: all data, including scan images, lives on the device. Fully usable with no server and no network.
- **Optional sync** across a user's devices via a self-hosted server we write (multi-user, end-to-end encrypted).
- **Free forever**: no paid services, no vendor lock-in. Anyone can run their own server.
- v2: sync via storage the user already owns (Google Drive app folder, Dropbox, WebDAV, S3-compatible) using the same protocol.

## 2. Non-goals (v1)

- Sharing data between users / households.
- File management: no folders, no file browser, no arbitrary file types, no annotation or versioning. Scans are capture-and-find, nothing more.
- User-defined tables / spreadsheet builder. Contracts use a fixed core schema plus free custom fields (§9).
- Photos on places/items (v2; reuses the Scans pipeline).
- Server-side search or processing of user data (server only ever holds ciphertext).

## 3. Architecture

```
 iPhone PWA ─┐                         ┌─ user A data (ciphertext)
             ├─ HTTPS ─ Caddy ─ sift-server (Node + SQLite + blobs dir)
 Laptop PWA ─┘                         └─ user B data (ciphertext)
   │
   └─ app shell served from GitHub Pages (static, free)
```

| Layer | Choice | Why |
|---|---|---|
| App hosting | GitHub Pages, deployed from `/app` by a GitHub Actions workflow | Free static HTTPS hosting (required for PWA). One fixed origin for everyone, so one Google OAuth client works for all users. Repo must be public for free Pages (nothing secret in it; OAuth client IDs are public by design). Branch-based Pages can only publish root or `/docs`, hence the workflow. |
| Local storage | IndexedDB via own thin wrapper (`js/store.js`) | Stores records and binary blobs (images/PDFs) natively. No dependency. |
| Offline shell | Service worker caching app shell + vendored libs | App opens with no network. |
| Libraries | Vendored in `/vendor` (no CDN): MiniSearch (search), pdf.js (PDF thumbnails) | Open source, work offline, can't start charging. |
| Crypto | WebCrypto (built into browser) | PBKDF2, AES-GCM, SHA-256. No dependency. |
| Sync server | Node.js + SQLite (`better-sqlite3`) + blobs on disk, one Docker container | Small, self-hostable anywhere (home server, Pi, free-tier VPS). |
| HTTPS | Caddy in front, Let's Encrypt via DNS challenge | Browsers block an HTTPS app calling an HTTP server. DNS challenge works even when the server is only reachable over VPN. |
| Calendar | Google Calendar API from the browser via Google Identity Services | Free, no server involvement. |

### 3.1 Platform storage notes

- iPhone: must be installed to Home Screen (exempt from Safari's 7-day storage eviction). App calls `navigator.storage.persist()` on first run.
- Safari grants an origin a large share of free disk; hundreds of MB of scans is fine. Usage shown via `navigator.storage.estimate()` in Settings.
- Laptop (Chrome/Edge): installed PWA gets persistent storage with a very large quota.
- **Before sync is enabled, the device is the only copy.** Backup/restore (§10) is a phase 1 requirement, not a nice-to-have.

### 3.2 Security model

- **On device**: data stored in plain IndexedDB, protected by the device's own encryption and lock screen. No passphrase friction for local-only use.
- **Leaving the device** (sync, backups): always end-to-end encrypted. The server and any v2 cloud store see only ciphertext, record ids and sizes.
- Contract reference numbers and ID scans are masked in the UI with tap-to-reveal (shoulder-surfing protection, not cryptography).

## 4. Data model

One IndexedDB database per signed-in user (`sift_<user_id>`), or `sift_local` before sign-in (§8.6). Object stores = collections below, plus `blobs`, `outbox`, `sync_meta`.

Common fields on every record: `id (UUIDv7), created_at, updated_at, deleted_at, archived_at, purged_at, tags[]`, plus sync metadata `_field_clocks {field: hlc}`, `_server_seq`, `_dirty_fields[]` (§8).

### 4.1 Tasks

- `projects`: `name, description, status (active|paused|done|archived), colour, sort_order, due_date`
- `milestones`: `project_id, name, due_date, done_at, sort_order`
  - A task shows in Day Planner on its `start_date`, and (while not done) on the day of its `aim_at`. Start and aim on different days = a multi-day task.
- `tasks`: `title, notes, project_id?, milestone_id?, parent_task_id? (subtasks), status (todo|doing|waiting|done), priority (1-4), energy? (high|medium|low), start_date? (the day it's planned for), aim_at? (completion aim, date + optional time), done_at? (set when ticked, cleared when unticked), calendar_event_id?, calendar_sync (none|push), recurrence_rule? (RRULE), source_thought_id?, source_scan_id?, source_contract_id?, contact_ids[], case_id?, sort_order`
  - `contact_ids[]`: people/organisations this task involves (reference only; shown as chips, tap to open the contact).

### 4.2 Braindump

- `thoughts`: `body, kind (thought|idea|task|shopping|journal|place_item), pinned, converted_to {collection, id}?`
  - No kind picked → `thought`. Recategorise anytime by changing `kind`.
  - `task` / `place_item` kinds offer "convert", which creates the target record and links back via `converted_to` / `source_thought_id`.
  - **Plan it**: any thought can become a day plan item (§4.2a): pick the day, then optionally a start time, end time and/or estimate. The thought links to it via `converted_to`.
  - **Select any text in a thought → "Make contact"** creates a contact from the selection (see §4.4); the thought keeps a link to it.

### 4.2a Day planner

**The heart of the app.** A day's battle plan for actually working through what has been dumped into Sift from everywhere else. Built for getting through a day (and planning the next few), not long-term planning (that's Tasks). Designed for people with high expectations of themselves: it helps plan less, not more.

**Page** (`#/planner/<date>`), top to bottom:
1. **Title**: the weekday, big, in the paper's handwriting font, then the date; "Today / Tomorrow / 3 days ago" under it.
2. **Day Focus** (bold, prominent): one or a handful of things that matter today.
3. **Today's Energy Level**: High / Medium / Low (see Energy below).
4. **Carry-over**: "n unfinished from earlier days · Bring them here · Go through them" (last 7 days). Go through them opens a panel listing each item under the day it came from, with ✓ Did it / → Bring to today / Let it go, plus "Bring the rest here" and "Let the rest go". Each item can also be **deleted** (to the Bin), with "Delete the rest". **Let go** (`dropped_at` + `archived_at`) = didn't do it and it doesn't need doing: it leaves the day and goes to the Archive like any archived item (also in ⋯ and the selection bar). The Archive doesn't mention it was let go unless you use the **"Let go, not done"** filter. Restoring it **recalls** it: back on its day, unfinished. From the Archive it can also be deleted to the Bin.
5. **Lined paper** with a margin: one line per slot from **day start** to **day end** (default 8.00 to 18.00, one line per hour; all three in Settings). Times are written in the margin.
   - Anything can be put at any time: an item at an odd time (12.45) gets its own line in time order; several items at one time get several lines. An item with an end time or duration is drawn as one block across the lines it covers (text centred, a bar down its side, the margin times still visible); nothing can be added inside it.
   - Items before the day starts get lines above; items after it go under **Evening** at the bottom.
   - Tap an empty line to write on it; tick items off; ⋯ opens time, until, estimate, day (move to another date), note, back to pile, delete.
6. **To place** (the pile): things for today without a time yet, fed by the dump box (text to list; a line starting with a time, e.g. `12.45 speak to L` or `12.45-13.30 …`, goes straight onto the plan).
7. **Tasks**: Tasks whose **start date** is this day, plus unfinished Tasks whose **completion aim** falls on this day. Multi-day tasks (start and aim on different days) show in their own strip ("ongoing: day 2 of 5"). Other undated Tasks and Brain Dump items can be **adopted** into the day, which sets their start date.
8. **Notes**: free text for the day (the notes editor, §4.7), which can reference other things (see mentions).

**Now marker**: on today's page a small ▶ in the margin marks the current time, placed proportionally between the written times and moving every 30 s (Settings → Day Planner → Nudges; on by default).

**Getting around**: ‹ Today › buttons (and ← → / T on a keyboard), plus a **Calendar** popup: a month grid where days that have anything planned or written are marked with a dot and down days are dimmed. Any date, past or future, opens the same page (look back at last Thursday; plan next week).

**Paper styles**: the page is drawn in a paper style. Default in Settings; any day can use a different one (Paper picker on the page, stored on the day).
- **Notebook**: light yellow paper, faint grey lines, red margin, handwriting, navy ink.
- **Techie**: dark terminal page, monospace, 24-hour times (08:30), faint grid, teal/amber.
- **Dot journal**: cream bullet-journal paper with a dot grid, no rules, handwriting, navy pen.
- **Minimal**: clean white page, system font, hairlines, roomy lines, small grey times.
- **Glass** (default): the app's own glass look (follows the app theme).
Each paper sets fonts, colours, spacing and time format through tokens scoped to the planner, so new papers are CSS only. Handwriting uses fonts already on the device (Segoe Print, Bradley Hand, Noteworthy …); a bundled web font can be added later.

**Energy**: Tasks can carry an `energy` tag (high | medium | low). Rough guide: **low** = laptop work (coding, accounts/bookkeeping, design); **medium** = pottering jobs; **high** = big tidy-ups, starting a big project. Setting today's energy makes the Tasks section suggest matching tasks to **adopt** for the day (suggestions only; nothing is added without a tap).

**Doing less** (Settings → Day Planner → Nudges; each can be turned off):
- **Down days** (default Sunday; any weekdays): the page says so and suggests picking one or two things; resting counts as part of the plan. The paper gets a calm tint.
- **Walking breaks**: with the **focus timer** (a Pomodoro-style timer started from any item: e.g. 25 min work / 5 min break), low-energy (laptop) items get a "walk around for 10 minutes" break built in.
- Other nudges to consider: a gentle warning when the planned minutes exceed the hours in the day ("that's 11 hours of plan for 10 hours"); an automatic "rest" line after lunch on down days; celebrating a done list at the end of the day ("You did 6 things") instead of highlighting what didn't happen; unfinished items move on quietly (carry-over) rather than showing as failures.

**Calendar awareness** (phase 3): real appointments from the connected calendar are drawn on the timeline as busy blocks (read only). Scheduling an item over one warns, and the pile can suggest free slots that fit an item's estimate.

- `days`: `id = date (YYYY-MM-DD, so every device edits the same record), date, focus, energy (high|medium|low)?, notes (markdown), paper? (override of the default paper style)`
- `day_items`: `date (YYYY-MM-DD), title, notes?, time? (HH:MM), end_time?, estimate_min? (shown as Duration), estimate_unsure ("Not sure yet"), done_at?, dropped_at? (let go), sort_order, task_id?, case_id?, contact_ids[], source_thought_id?, carried_from? (date), merged_from[]? (ids of items combined into this one)`
  - No `time` = on the day's pile. With `time` = on the timeline, sorted by time.
  - Moving to another day = change `date` (carry-over also sets `carried_from`).
  - Separate records per item (not an array on the day) so edits from two devices merge per item.
  - `estimate_min` = how long I think it takes; with `time` and no `end_time`, the timeline brackets the lines it covers.
- Still to come: **Text mode** (the whole day as plain text, `12.45<tab>title`, edited freely and parsed back), drag an item onto a line or onto another item to combine, a "now" line.

### 4.3 Where things are (area: Find Things)

- `places`: `kind (edition|section|box)` (`edition` is shown as **Life Area**), name, label_code? (physical label, e.g. "BA", "W1"), parent_place_id?, location_note? (where it lives, e.g. "Under desk back"), notes? (e.g. "9L Really Useful"), sort_order`
  - **Life Areas** are separate parts of life the list is split into (e.g. Standard, Build), shown as tabs. Each has **groups** (e.g. "Where Things Area", "Wardrobe Boxes", "Front Room"; stored as kind `section`), which hold **boxes** (a box can also be a spot, like "Malakai's room - fireplace").
- `items`: `name, place_id (a box), parent_item_id? (one level of sub-items), quantity?, notes?, sort_order, last_moved_at`
  - Moving an item = change `place_id`; moving a box to another group = change its `parent_place_id`.

### 4.4 Contacts

Two kinds of contact, and you can move one between them at any time:

1. **Transient**: a number or detail you need for a few days ("the parking line", "the man about the van"). Never deleted automatically, just sorted by recency. If it has no `about`, it shows a gentle "What was this?" prompt so it can be labelled later.
2. **Stored**: your contacts directory, in **categories** you define ("Plumber", "Sparky", "Carers", "Mum Care", anything). A stored contact can be in several categories.

Making a transient contact stored asks for its categories; it then appears in those lists. Unstoring keeps everything and moves it back to Recent.

- `contacts`: `name (who: person or organisation), kind (person|organisation), status (transient|stored), category_ids[], about? ("what was this?" / who they are), details[] ({label, value, last_used_at?}: phone, email, website, address, ref no …), body? (unstructured text, kept exactly as captured), notes? (free text: specialities, "not sure they'll do it, but maybe"), research_status? (candidate|contacted|quoted|booked|rejected), rating? (1-5), would_use_again? (yes|no|maybe), area_covered?, captured_at, source_thought_id?, looked_up_at[] (recent views, newest first, capped at 20), last_contacted_at?, pinned`
  - **Structured or unstructured**: `details[]` holds whatever is known; `body` holds the raw text. Either can be empty.
  - **Capture from Brain Dump**: select text → Make contact. `body` = the selection; phone numbers, emails and URLs are offered as `details[]`; the user confirms `name` and optionally `about`. Starts transient. `captured_at` = the thought's time, not the conversion time.
  - **When**: `captured_at` (when I recorded it), `looked_up_at[]` (stamped each time it's opened), `last_contacted_at` plus the interactions log (when I contacted them, and which number or email I used: `details[].last_used_at`).
  - **Phone calls**: web apps can't read the iPhone's call history. Tapping a number or email in Sift logs an interaction (outgoing call/email, with the detail used) before handing over to the phone; a "Contacted" button logs one by hand (call, text, letter, visit, incoming or outgoing). The timeline then lines up with the phone's Recents by date and time.
- `contact_categories`: `name, colour?, sort_order`. Arbitrary; created on the fly.
- `interactions`: `at, how (call|text|email|letter|visit|meeting|other), direction (in|out), contact_id?, case_id?, detail_used?, summary?, scan_id?, task_id?` (one record per event, so logs from two devices merge cleanly).
- `contact_jobs`: `contact_id, date, description, cost, rating, notes, task_id?` (work someone has done for me).
- **Research mode** (per category), for "find lots of plumbers": a fast entry list. Type or paste one per line (name, number, website, note in any order; numbers and URLs recognised); each becomes a stored contact in that category with `research_status = candidate`. Then work down the list: tap to call (logged), set status chips (contacted, quoted, booked, rejected), jot notes, compare.
- **Connections**: contacts referenced by the same tasks, day items or cases are shown as connected. A contact's detail lists "Connected" contacts and cases; a category or case view clusters its contacts together.
- Recency, not tidiness: Recent is sorted by last activity (captured, looked up or contacted). Transient contacts untouched for 60 days fold into "Older" (never deleted).

### 4.4a Cases

An ongoing saga with one or more organisations or people, e.g. "Mum's care funding: council". Everything about it in one timeline, instead of scattered across calls, letters and tasks.

- `cases`: `title, status (open|waiting|closed), summary?, references[] ({label, value}: case numbers, reference numbers, named contacts), contact_ids[], project_id? (Tasks project, if it also has actionable work), opened_at, closed_at?`
- The case **timeline** is assembled from records that carry `case_id`:
  - `interactions` (calls, emails, visits, letters in and out; which number was used; what was said)
  - `scans` with `linked = {collection: "cases", id}` (letters received or sent: `kind = letter`, `letter_date`, `summary` of what it said; OCR in v2)
  - `tasks` and `day_items` (what I did or have to do)
  - case notes (`case_notes`: `case_id, at, body`)
- Case view: header (title, status, references with copy buttons, contacts with tap-to-call), then the merged timeline newest first, with filters (calls, letters, tasks, notes) and "Add": log call, add letter (opens Scan), add note, add task.
- Where it lives: a **Cases** tab in Contacts (Recent | Directory | Cases). Cases are also reachable from any linked task, day item, contact or scan.

### 4.5 Scans

- `scans`: `title, kind (receipt|id|warranty|letter|other), expiry_date?, letter_date?, summary?, note?, linked {collection, id}? (contract, contact_job, item, task, case), keep_on_device (bool), pages[]`
  - `pages[]`: `{blob_id, thumb_blob_id, mime_type, size_bytes}`
  - `title` defaults to e.g. "Receipt 23 Sep 14:32"; everything else optional.
- `blobs` store: `{blob_id, bytes (Blob), mime_type, size_bytes, uploaded (bool)}`

### 4.6 Contracts

- `contracts`: `name, category (insurance|utility|broadband|phone|mortgage|rent|loan|subscription|warranty|pension|other), provider, provider_phone?, provider_url?, reference?, covers?, start_date, end_date?, renewal_date?, auto_renew (bool), notice_days?, cost, cost_frequency (monthly|quarterly|annual|one_off), payment_method_note?, status (current|ended|cancelled), previous_contract_id?, contact_id?, custom_fields[] ({label, value}), notes`
  - Renewal/switch = new row with `previous_contract_id` → history chain per policy line.
  - Scans attach via `scans.linked = {collection: "contracts", id}`.

### 4.7a Lists (reusable checklists)

For lists you use again and again: packing for a trip, the weekly shop, a pre-flight check for the van.

- `lists`: `name, kind (template|instance|list), template_id?, notes, sort_order, used_at?`
- `list_items`: `list_id, text, parent_id? (one level of sub-items), sort_order, checked_at?`
- **Template**: the master list. "Use this template" makes an **instance** (a full copy, e.g. "Holiday packing – Portugal"), editable without touching the template.
- **Ticking**: tick items off in any order; progress "18 of 30"; **Reset ticks** clears them all (e.g. to re-pack for the trip home); **Hide ticked**.
- **Keeping template and copies in step**: an instance offers "Add n missing from template"; selecting items in an instance offers "Add to template".
- **Plain lists** have ticks without a template (a one-off shopping list).
- Same list behaviour as everywhere (select, drag, indent, text to list), undo, History, Archive & Bin.

### 4.8 Batch Book (recipes and the batches made from them)

A recipe book that also records every time a recipe is **made**: a batch of wine, a loaf, a sauce. The recipe is the plan; a **make** is one real run of it, with its own notes, readings, photos and outcome, so the next make can be better.

- `recipes`: `title, category (wine|beer|bread|food|drink|preserve|other, or free), summary?, yield? ({amount, unit}), ingredients[] ({qty, unit, item, note?}), steps[] ({text, wait?: {days|hours}}: a wait makes the planner remind you, e.g. "rack after 14 days"), notes (notes editor), source? (book, URL, person), photo_ids[], version (1, 2, … when changed after makes exist), tags[]`
- `recipe_makes`: `recipe_id, recipe_version, batch_no (e.g. "W-2026-04", auto-suggested), started_at, finished_at?, status (planned|in progress|done|failed), scale? (e.g. 2× / 23 L), deviations? (what I did differently), notes, rating? (1-5), would_make_again?, place_id? (where it's kept: a Find Things box/spot), photo_ids[]`
- `make_readings`: `make_id, at, kind (specific_gravity|temperature|ph|taste|weight|volume|note|other), value?, unit?, note?, photo_ids[]` (one record per reading so logs from two devices merge)
  - Wine/beer: original and final gravity give **ABV** automatically; a gravity chart over time per make.
  - Taste notes over time ("3 months: still harsh; 6 months: good").
- Photos and recordings (e.g. a voice note of tasting) use the Scans blob pipeline (§4.5, §8.4).
- **Links**: step waits become Day Planner items on the right dates ("Batch W-2026-04: rack"); a make can live in a Find Things box ("Under Coal Hole: 6 bottles W-2026-04"); ingredients can be added to a shopping list (Brain Dump `shopping`).
- UI: **Batch Book** area (internally `recipes`): recipe cards (photo, title, category, last made); a recipe page shows ingredients (scalable), steps, and its makes as a timeline; a make page shows readings (with chart), notes, photos and a "Log reading" button. "Make this" starts a make from the recipe.
- Details to be filled in later with the user.

### 4.7 Cross-cutting

- `tags` are free strings on every record; autocomplete from local data.
- **Archive & Bin** (every area): **Archive** = `archived_at` set: hidden from normal views, still searchable (search shows "+ n in archive"), never expires. **Bin** = `deleted_at` set: kept 30 days, then purged automatically. **Delete forever** / **Empty bin** purge: content fields are blanked and `purged_at` set, but the record stays as a tombstone so sync can't resurrect it (and the undo toast runs before anything is purged). One **Archive & Bin** page (`#/bin/<archive|bin>/<area>`): tabs Archive | Bin, area filter, search, grouped by area; each entry has Restore, bin entries also Delete forever. Reached from each area's ⋯ menu (pre-filtered) and from Settings. Each area supplies a provider (`entries(kind)`) to `js/bin.js`; a deleted box shows as one entry with the items deleted with it.
- **Lists** (every list): one behaviour everywhere, from Find Things' box contents. ≡ tap selects (Shift = range, Ctrl/⌘ = toggle), swiping down the ≡ column selects a range, press-and-hold drags (a selection moves as one stack; a parent carries its children; sideways = indent/outdent), Tab/Shift+Tab indents while editing, Esc clears the selection. A bar shows batch actions while anything is selected. Each list turns reordering and indenting on or off: Find Things contents (reorder, 1 level), Tasks List (reorder, nested), other Tasks views, Brain Dump, Contacts, Archive & Bin (select only). Shared helper: `js/listkit.js`.
- **Date and time fields**: nothing saves while you're typing in them; Enter or leaving the field saves (with undo), Esc restores. `js/inline.js`.
- **Inline editing** (every single-line field): Enter or clicking away saves (with "Saved · Undo"); Esc puts back what was there when you clicked in, with an "Escape cancelled change" toast whose Undo restores (and saves) your edit. Shared helper: `js/inline.js`.
- **History** (every area): every change made on this device is recorded field by field (before and after), grouped per action and named after its toast. The History page (`#/history`, ↺ in the header, and Settings) lists them newest first by day; any entry, or a selection of entries (shared list behaviour, Undo in the bar), can be undone individually regardless of what came after. An undo writes the "before" values back and is itself an entry (undoing it = redo). Undoing a creation soft-deletes; undoing "delete forever" restores the content from the recorded values. Fields changed again since are still put back, and the toast says so. No rollback-to-a-point. Local only (not synced, not in backups), newest 1,000 entries kept. `js/history.js`, recording in `store.js`.
- **Undo** (every area): every change shows a toast for ~6 s with **Undo** ("Saved · Undo", "Removed 'Jumpers' · Undo", "Deleted box BA · Undo"), like "undo send". Deletes don't ask "are you sure?"; they're soft deletes, so undo is a restore. Edits undo by writing the old value back (a new clock stamp, so it syncs like any edit). Shared helper: `undoable()` in `js/toast.js`.
- **Notes editor** (every free-text notes field): you just type; bold, italic, cross-out and lists show formatted as you go (toolbar, Ctrl+B / Ctrl+I), stored as a small markdown subset (`**bold**`, `_italic_`, `~~cross out~~`, `- list`). A **Markdown** toggle shows the raw text for direct editing; it always starts in formatted mode (reload = formatted). Pasting brings plain text only. Shared helper: `js/richtext.js`.
  - Typing `- ` or `* ` at the start of a line starts a bullet list; Enter on an empty bullet ends it.
  - The toolbar has 📝 📞 ⏰ ⚠️. **📞** (typed or from the toolbar) opens a dropdown search of contacts, **📝** a search of everything (plan items, day notes, tasks, brain dumps, contacts, cases, boxes, things, lists), **⚠️** a search of important things (urgent/high tasks, pinned brain dumps, anything whose text has ⚠️ or "important"). Most recently edited first; typing searches. The first row ("Don't link a contact" / Esc) keeps just the emoji. Ctrl+click picks several. 📞 also offers "+ New contact". The note's own item is left out.
  - **Links** are stored as `[label](sift:<collection>/<id>)` and shown as underlined chips. In a note being edited, clicking a chip offers Open / Unlink (Ctrl+click opens); anywhere else a click opens it. One-line previews keep chips clickable. A contact's page lists notes that mention it under Connected.
  - **Spotting**: a phone number or email typed into a note becomes a chip linked to a contact when you've typed past it (a space after a full-length number, any other character, Enter, or leaving the note). Numbers are recognised in any common format (`07970 938694`, `07 970 93 86 94`, `+44797 0938694`, `(44)`/`(+44)`, `+44 (0)…`, `0044…`) and normalised with the home country (Settings → Notes, default UK) so the same number always links to the same contact. Unknown ones make a **transient** contact whose notes keep the line under "Captured when created" plus a link back to where it was typed; plan items and tasks also list it in their contacts. A toast offers Undo (unlinks, removes the new contact and won't spot that one again in this note). Can be turned off in Settings. Not in a contact's own notes. The Brain Dump capture box links them when the thought is saved.
  - While typing in a note the rest of the page dims (a spotlight on the note and its dropdown); clicks still go through.
  - Later: drag handles on a new chip to pull the words around it into the new item's notes.
  - **Mentions** (to build): typing `@` opens a picker over contacts, tasks, day items, Brain Dump thoughts, boxes, cases and recipes; choosing one inserts a chip, stored as `[@Name](sift:<collection>/<id>)`. Tapping a chip opens the thing; the thing lists where it's mentioned ("Mentioned in: Tue 3 Oct notes").
- **Text to list** (every area): wherever plain text becomes list items (Find Things contents, Day Planner dump box, Brain Dump, Contacts research mode, Tasks), the same entry is used: one item per line, a line starting with `-` (or a space) is a sub-item of the line above, **Ctrl+Enter** (⌘+Enter on Mac) adds, with the same hint text. Shared helper: `js/listentry.js`.
- `settings` (single record, synced): `default_calendar_id, week_start, theme, pinned_areas[], day_start, day_end, slot_min, paper_style, down_days[], hint_down_day, hint_walk_breaks`.
- `device_settings` (local only, never synced): `server_url, device_name, keep_all_scans_on_device`.

## 5. UI

Single-page app, hash routing, top nav on laptop, bottom tab bar on iPhone. Global search always available (`/` on laptop, pull-down on phone).

### 5.1 Navigation

- Areas registered in one list (`id, label, icon, view_module`); adding an area is a single entry.
- **iPhone**: fixed bottom bar, never scrolls. 4 pinned areas + 5th **More** tab opening a bottom sheet with the rest.
- **Laptop**: all areas in top nav; overflow collapses into a More dropdown.
- Pinned set configurable in Settings (drag between "Pinned" (max 4) and "More"); stored in `settings.pinned_areas[]`.
- When the active area lives in More, the More tab shows as active with that area's icon.

### 5.2 Areas

| Area | Laptop | iPhone |
|---|---|---|
| **Tasks** | Left: projects. Main: tasks grouped by milestone, drag reorder. Right: detail. Views: Today, Upcoming, Project, Done. | Segmented views; detail as full-screen sheet. |
| **Day Planner** | See §4.2a: title, Day Focus, Today's Energy Level, carry-over, lined paper with times in the margin, Evening, To place (pile + dump box), Tasks, Notes. ‹ Today › and a Calendar popup. Paper picker per day. | Same page, one column. |
| **Brain Dump** | Large text area focused on open; kind pills underneath; Save (⌘↵). Below: thought list/cloud, filter by kind and tag. | Opens into text entry with keyboard up; pills above keyboard. |
| **Find Things** | Search bar always on top (`/`), searching every life area: matching boxes show their path and only the matching items. Life Area tabs; each group is a grid of box cards (big code, name, where it lives in orange, first few items, "+ n more"). Tap a card to edit the box and its contents (add many items at once, one per line). Menu: add box / group / life area, import / export CSV. | Same, one column; box editor as a full-height sheet. |
| **Contacts** | Tabs: **Recent** (transient + recently used, "What was this?" prompts), **Directory** (by category; research mode per category), **Cases**. Contact detail: name, about, details (tap to call/email, which logs an interaction), raw captured text, notes, timeline (captured, looked up, contacted), connected contacts, cases, tasks and day items, jobs. | Same, full-screen detail. Quick "Contacted" button. |
| **Contracts** | Spreadsheet-style table: sort, filter, group, column picker, inline edit. Detail with history chain + scans. Footer: annual cost total. | Cards by category, current first, renewals due highlighted. Tap-to-call provider. |
| **Batch Book** | Recipe cards; recipe page (ingredients, steps, makes timeline); make page (readings + chart, notes, photos). | Same; "Log reading" is one tap from the make. |
| **Scans** | Reverse-chronological thumbnails, kind pill filters, search. Drag-and-drop to add. | Big **Scan** button, recent scans below. Full-screen viewer, pinch zoom. |

- Header: sync status (local only / synced / syncing / n pending / offline).
- Quick-add (+) on every area pre-fills that area's record type.
- Themes: Blue (default, glass look from the home dashboard), Dark (neutral), Light, or Auto (Light by day, Blue at night, following the system). Chosen in Settings.

## 6. Google Calendar integration

- Scope `https://www.googleapis.com/auth/calendar.events`, requested only when the user enables it.
- Google Identity Services token client in the browser (no refresh token; ~1h tokens re-acquired silently while the Google session is active).
- One-way push: task with due date and `calendar_sync = push` creates/updates/deletes an event; `calendar_event_id` stored on the task.
- Read: the day's events are fetched (read only) and shown as busy blocks in Day Planner, so I don't plan my own work over real appointments. Cached for offline viewing.
- `calendar.js` is a small connector interface (`list_events(from, to)`, `push_event`, `delete_event`), Google first; CalDAV / ICS feed connectors can follow.
- Offline: calendar operations queued in `calendar_outbox`, flushed on reconnect.
- The OAuth client is tied to the GitHub Pages origin; Google app verification (free) needed before >100 users can connect.

## 7. Search

- MiniSearch index built on startup from IndexedDB across all collections; updated on every local write and every merged pull.
- Results grouped by type; item results show place path (`Loft › Shelf 2 › PB-14`).

## 8. Sync

### 8.1 Principles

- Device is the source of truth for its own edits; server is a dumb encrypted relay/store.
- Server sees: user id, record id, server sequence number, ciphertext, sizes. Never collection names, field names or content.
- Same protocol targets the self-hosted server (v1) and user-owned cloud storage adapters (v2).

### 8.2 Keys (one password, server can't decrypt)

- `master_key` = PBKDF2-SHA256(password, salt = lowercased email, 600k iterations).
- `auth_hash` = PBKDF2(master_key, password, 1 iteration) → sent to server; server stores a slow hash (scrypt) of it.
- `data_key`: random AES-GCM 256 key created on registration, wrapped with a key derived from `master_key`, stored on server as `wrapped_data_key`.
- New device: log in → receive `wrapped_data_key` → unwrap locally. Password change = rewrap only, no re-encryption.
- **Recovery key**: `data_key` exported as a printable code at registration. Lost password + lost recovery key = data unrecoverable (forced acknowledgement at setup).
- Signed-in devices keep `data_key` as a non-extractable CryptoKey in IndexedDB.

### 8.3 Record changes

- Every field write stamps `_field_clocks[field]` with a hybrid logical clock (`wall_ms-counter-device_id`) and adds the field to `_dirty_fields`, then queues the record id in `outbox`.
- Envelope encrypted per record: `{collection, data, field_clocks, deleted_at}` → AES-GCM(data_key, random 12-byte IV).
- **Push**: `{record_id, base_seq, ciphertext}` per changed record. Server accepts only if its current seq for that record == `base_seq`, else returns the current version (conflict).
- **Conflict merge** (client): decrypt server version, then per field take whichever `_field_clocks` value is later; re-push with new `base_seq`.
- **Pull**: `since = last_seq` → changed records in seq order; client merges each (same per-field rule), updates `last_seq`.
- Deletes are soft (`deleted_at`); tombstones kept so offline devices can't resurrect deleted records.
- Sync runs on app open, on regaining network, after local writes (debounced 5 s), and every 5 min while open.

### 8.4 Blobs

- Blob encrypted client-side; `blob_id` = SHA-256 of ciphertext (integrity check on download).
- Blobs are immutable: upload only what the server lacks (`HEAD`), download on demand.
- Thumbnails always synced to every device. Full pages downloaded when opened, and kept if `keep_on_device` (per scan) or `keep_all_scans_on_device` (per device, default on for laptop).
- Old full pages on iPhone can be evicted locally once confirmed uploaded; re-fetched on demand.
- Purging a scan's tombstone deletes its blobs on the server.

### 8.5 Server (sift-server)

> **As built (2026-09-24):** Node 24 with built-in `node:sqlite` (no `better-sqlite3`), no dependencies. Run natively under systemd on the home server (Docker in the Proxmox container hit a runc/AppArmor clash). The Docker image is still planned for VPS installs. HTTPS on the LAN uses Caddy `tls internal` for the IP, with each device trusting Caddy's root CA, because a public DNS name would reveal the LAN address. Record ids on the server are HMACs of `collection/id`. The local database stays `sift_local` (not renamed to `sift_<user_id>`).

- Node.js, SQLite, blobs in `data/blobs/<user_id>/<blob_id>`. One Docker image; `docker-compose.yml` includes Caddy.
- Tables: `users (id, email, auth_hash_scrypt, kdf_params, wrapped_data_key, quota_bytes, created_at)`, `devices (id, user_id, name, token_hash, last_seen)`, `records (user_id, record_id, seq, ciphertext, size_bytes)`, `blobs (user_id, blob_id, size_bytes)`.
- Config: `REGISTRATION (open|invite|closed)`, `DEFAULT_QUOTA_MB` (default 1024), `ALLOWED_ORIGIN` (the GitHub Pages origin, for CORS).
- Admin CLI: create user / invite code, set quota, list users and usage, revoke device.
- Login rate limiting and lockout. Tokens: 32 random bytes, stored hashed, per device, revocable.
- Quota enforced on push and blob upload (sum of `records.size_bytes` + `blobs.size_bytes`).

| Endpoint | Purpose |
|---|---|
| `POST /api/prelogin` | email → KDF params |
| `POST /api/register` | email, auth_hash, kdf_params, wrapped_data_key, invite_code? |
| `POST /api/login` | email, auth_hash, device_name → token, wrapped_data_key |
| `GET /api/devices`, `DELETE /api/devices/:id` | list / revoke devices |
| `POST /api/sync/push` | changed records with base_seq → accepted seqs + conflicts |
| `GET /api/sync/pull?since=` | records changed since seq |
| `HEAD/GET/PUT/DELETE /api/blobs/:blob_id` | blob store |
| `GET /api/usage` | bytes used / quota |

### 8.6 Local-only → signed-in (adding auth after phase 1)

- Phase 1 runs with no account: IndexedDB database `sift_local`, no encryption, no sync.
- Nothing in phase 1 UI depends on auth; sign-in lives only in Settings → Sync.
- **Enable sync on a device with existing local data:**
  1. Register or log in (§8.2).
  2. Pull everything the account already has (other devices may have pushed) and merge into local data using the per-field rule.
  3. Queue every local record and blob in the outbox with `base_seq = 0` for records the server doesn't have; push.
  4. Database renamed to `sift_<user_id>`; `sift_local` removed once push completes.
- **Sign out**: choose "keep data on this device" (reverts to `sift_local`, sync off) or "remove data from this device".
- Because the phase 1 record format already carries ids, field clocks, soft deletes and an outbox, no data migration is needed.

### 8.7 v2 cloud adapters

- Adapter interface: `put_record, list_records_since, put_blob, has_blob, get_blob, delete_blob`, with **conditional writes** (ETag / If-Match) to provide the `base_seq` check.
- Targets: Google Drive app-data folder, Dropbox app folder, WebDAV (incl. Nextcloud), S3-compatible buckets.
- User's own storage account = zero cost to the project.

## 9. Scans & Contracts detail

### 9.1 Quick scan (2 taps)

- Entry points: Scan button in Scans, Scan in global quick-add, "Attach scan" on contract / contact job / item / task (pre-fills `linked`).
- Flow: tap Scan → camera (`<input type="file" accept="image/*,application/pdf" capture="environment">`) → photo → **saved immediately** with default title and `kind = receipt`.
- Post-save dismissible strip: kind pills, "+ page", title/expiry fields, "Make contract".
- Auto on capture: EXIF rotate, greyscale/contrast "scan" filter. v2: edge detection, OCR.
- Images resized to 2000 px long edge, JPEG q0.8 (~200–500 KB/page); thumbnail 300 px q0.7. PDFs as-is, pdf.js page-1 thumbnail. 10 MB per-file cap.
- Scan with `expiry_date` → linked task due 3 months before expiry.

### 9.2 Contracts

- Table UI with inline edit, saved views ("Current insurance", "Renewing in 60 days").
- **Renew** action: duplicates row as new current contract (`previous_contract_id` set), marks old one ended.
- Custom fields `{label, value}`; labels autocomplete; frequent labels can become optional columns.
- Costs normalised to annual for totals and per-category subtotals.
- Contract with `renewal_date` → linked task due `notice_days` (default 30) before renewal.

## 10. Backup, import, export

- **Backup** (phase 1): one tap → `.sift` file (zip of JSON records + blobs), optionally encrypted with a backup passphrase. Saved via share sheet to Files / iCloud Drive / Downloads. Settings shows "last backup" with a reminder after 14 days when sync is off.
- **Restore**: into an empty device, or merge into existing data using the same per-field merge rules.
- Imports: Find Things CSV, one row per item (`life_area, group, box_code, box_name, box_location, box_notes, item, item_notes, sub_of`; only a box name or code is required; importing again merges, no duplicates; also exported). `tools/onenote_to_csv.py` converts the OneNote pages (exported as .docx). Contacts CSV; contracts CSV (unknown columns → custom fields).

## 11. File layout

```
/.github/workflows/pages.yml  (publishes /app to GitHub Pages)
/app                         (published to GitHub Pages)
  index.html
  manifest.webmanifest
  sw.js
  css/app.css
  js/app.js                  boot, routing, area registry
  js/store.js                IndexedDB wrapper, CRUD, field clocks, soft delete
  js/search.js
  js/files.js                capture, compression, thumbnails, blobs
  js/backup.js               backup / restore / CSV import
  js/crypto.js               key derivation, wrap/unwrap, encrypt/decrypt
  js/sync.js                 outbox, push/pull, merge, blob sync
  js/calendar.js
  js/views/{tasks,planner,dump,places,contacts,contracts,recipes,scans,settings,bin}.js
  vendor/{minisearch,pdfjs}/
  icons/
/server
  src/{index,auth,sync,blobs,admin}.js
  Dockerfile
  docker-compose.yml         sift-server + Caddy
  Caddyfile
```

## 12. Phases

**Phase 1 — Local, single user, no server** (laptop and iPhone each usable standalone)
1. Shell: PWA install, service worker, area registry/nav, `store.js` with sync-ready record format (UUIDv7, field clocks, soft delete, outbox), persistent storage request.
2. Find Things (places + items) + CSV import.
3. Brain Dump.
4. Day Planner (incl. text mode).
5. Tasks.
6. Contacts + Cases (transient/stored, categories, research mode, interactions log, "Make contact" from Brain Dump, case timeline).
7. Scans.
8. Contracts.
9. Batch Book (recipes, makes/batches, readings, photos).
10. Search.
11. Backup / restore.

**Phase 2 — Sync server (multi-user from its first version)**
12. `crypto.js`: registration, login, key wrap, recovery key.
13. sift-server: auth, devices, push/pull, quota, admin CLI, Docker + Caddy.
14. `sync.js`: record sync + merge, then blob sync.

**Phase 3 — Calendar**
15. Calendar connector (Google first): busy blocks in Day Planner, task push; scan expiry + contract renewal reminders.

**Phase 4 — v2 cloud adapters**
16. Adapter interface + Google Drive app-data adapter first.

## 13. Future

- Photos on places/items (reuse `files.js`).
- OCR + edge detection for scans.
- Household sharing (shared spaces, per-member wrapping of a shared data key).
- Two-way calendar sync.
