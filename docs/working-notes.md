# Sift: working notes

How work on Sift is done: where things are, the rules, and where it has got to. Read this first, then the two overview issues. `docs/spec.md` is the source of truth for what Sift is; this file is about how it's built.

## Where it has got to

- **Live:** 1.60.29 (GitHub Pages, https://hazymat.github.io/sift/). Every version has a GitHub Release with its notes.
- **The queue:** GitHub Issues. Two pinned overview issues hold the checklists, in order:
  - **Roadmap** (#20): Next, Started, To decide, Not built yet, Housekeeping.
  - **Known bugs** (#21).
- **Labels:** `feature`, `bug`; `started` (begun, not finished); `to decide` (needs a decision before building: don't build until the issue says what was decided); `to be checked` (fixed or not reproduced, waiting to be seen working on real devices); `overview`.
- **Recently done (1.21.04 to 1.22.07):** every note saves as you type through one shared helper (`autosave.js`); Esc leaves what's being edited and keeps it, one level per press; keyboard browsing (`browse.js`); Alt+Enter opens a note full screen; Archive and Bin is an area in the navigation ("Tidied" for now, #26); a new app icon made by `tools/make_icons.py`.
- **Waiting on a decision:** everything labelled `to decide`, in particular #26 (Archive and Bin's name), #27 (Day Planner delete buttons), #24 (keyboard shortcut matrix: categories of control first), #29 (the Esc / Shift+Enter cases still open), #23 (whether Ctrl+. makes sub-items in New task and Add items lines).
- **Needs the home network:** the sync server (`server/`) runs on a machine on the local network and isn't reachable from elsewhere; sync and server work (#2, #3, #11) has to be done from there.

## How a change goes live

`main` is live: a push to `main` deploys GitHub Pages within a minute or two.

1. Work on a branch, never straight on `main`.
2. Before opening a pull request, for every change:
   - bump the version in `app/js/version.js`: the last number for almost everything, new features included (1.60.04 → 1.60.05); the middle number only for something very major (last back to `00`); the first number only for a massive change to the app. A fix to a change not yet published bumps the version again and amends that change's What's new line and release note rather than adding new ones (a version with no What's new entry is skipped). Dropping a change before it's published: take out its code, What's new entry and release note, and bump again;
   - any new JS file goes into `SHELL` in `app/sw.js`;
   - syntax check each changed JS file: copy it to a `.mjs` file somewhere temporary and run `node --check` on that;
   - add the release note to `tools/release_notes.py`;
   - add the version's What's new entry to `WHATS_NEW` in `app/js/whatsnew.js` (see below); every version gets one;
   - write **How to test** steps in the pull request (see below).
3. One pull request per change or small batch, with the issue numbers it closes (`Closes #n`).
4. **Publishing is merging the pull request.** Nothing is merged until it has been asked for.
5. Just before merging: `python tools/published_times.py --now` (stamps the versions going live with the time), committed to the branch.
6. After merging: check the deploy (`gh run watch`, then `curl -s "https://hazymat.github.io/sift/js/version.js?x=$RANDOM" | grep VERSION`), create the Releases (`python tools/release.py <version> <full commit hash> ...`), and close the issues it fixed with a comment naming the version. The overview issues tick themselves.

## What's new (every version)

After an update, Sift shows a What's new sheet (Settings, Show update info; on unless turned off; Settings, What's new shows it again). It shows one update at a time (everything published together), headed with the date and time it went live, and ‹ Older and Newer › step through every update there has been. Its entries are `WHATS_NEW` in `app/js/whatsnew.js`, one per version bump, added with the release note; when each version went live is `PUBLISHED` in the same file, filled in by `python tools/published_times.py --now` just before publishing (`--backfill` works past ones out from the Pages deploys):

- `text`: one plain line per change, in the UI's words, saying where it is ("Find Things: ...").
- `go`, `open`, `at`: the Show me target. `go` is the address (`#/find-things`), `open` the selectors clicked in turn to get there (e.g. the first box), `at` the element that changed, which is scrolled to and pulses. Check each target with a Show me before merging.
- `more`: when one change reached many places, one Show me for the main one and the rest in words here.
- A bug fix with nothing to point at, or a phone gesture, has no `at` (no Show me).

## How to test

- **Locally:** `python tools/devserver.py`, then http://localhost:5173 (the port can be set with `PORT`). To try a pull request's branch: `git fetch`, `git switch <branch>`, then the same.
- **The page check:** in the browser console on the dev page, `(await import('/js/smoke.js')).run()` visits every page, tries the view options, opens a panel or two, goes through the Scans and Contracts filters and opens the first scan's and contract's own page, and returns `{ pages, errors, problems, skipped }`. Expect no errors and no problems; `skipped` names what couldn't be tried because there was nothing there yet (e.g. no scans). It takes about a minute.
- **Test data:** titles starting `zz ` or dates in 2030 and later. Delete them afterwards straight from IndexedDB (database `sift_local`: the record, plus its `history` and `outbox` entries).
- **How to test steps** (in each pull request, one per change), always as: "In <area>, click <this>, do <that>. Before, it <did this>; now fixed. It should <do this>." Name things in the UI's words. These are copied into the separate test list, and anything that fails comes back as an issue.
- Sharing is tested with two browser profiles against a local `server/` (`REGISTRATION=open`): register two accounts, share, accept, change on each side.
- Real iPhone behaviour (Home Screen app, keyboard, safe areas) can only be checked on a real iPhone after publishing: say what couldn't be checked.

## Rules

- **The repo is public.** No personal data, no home network details (the server's address, certificates) in anything committed. Personal notes stay out of the repo.
- **Commits** keep the author already used in this repo: `Mat <7063284+hazymat@users.noreply.github.com>`. No co-author or "generated with" lines in commits, pull requests, issues or files.
- **Writing** (UI text, docs, issues, commit messages): plain British English, short, in the UI's words; no em dashes. Issues and docs are written without referring to anyone ("to be checked", not who will check it).
- **Design priority:** distraction-free, but discoverable. No new buttons that need explaining; show advanced options only where and when they're relevant.
- **UI consistency:** new UI must follow `docs/ui-consistency.md` (where each kind of control goes, in every area). When a new control has no settled rule there yet, do it the way most areas already do and add it to that file.
- **Code:** plain HTML, CSS and JS in `app/`, no build step, no framework. Libraries vendored in `app/vendor`, never from a CDN. Comments only where the reason isn't obvious. Multi-line edits are easier with a small script than with shell heredocs (they mangle `\n` inside quoted code).

## Map of the code

- `app/js/app.js`: areas list (`AREAS`), routing, navigation, keyboard (← / → tabs, Ctrl+← / → areas, Esc for menus and stepping back from a record's page), service worker registration and updates (a reload waits for saves).
- `app/js/store.js`: IndexedDB. Record format is final: UUIDv7 ids, per-field clocks, soft deletes, an outbox for sync. `idle()` resolves when every write has reached the database. Spaces: `local` is your own database; each person sharing with you has their own (`spaceOf(user id)`), and `store.get/list/create...` work on the current one (`useSpace`, reset to your own on changing area).
- `app/js/sync.js` and `app/js/sharing.js`: sync, and sharing between accounts on one server. A share holds a list (and its items), a note, a recipe (and its batches), a project (and its milestones, tasks and their comments: a comment's project is looked up from its task (`scoped`), and a task going into or out of a share queues its comments; files (attachments) follow whatever they're on, their records to the share and the files themselves to the share's own file store on the server (`/api/shares/<id>/blobs`, sealed with the share's key); a task moved out of it goes to that share once more, so everyone sees it go) or a range of days (`info.kind`: list, note, recipe, project, days); which records go to which share is worked out from that (`inShare`), never stored on the record. Your own shared records stay in your own records too; others' shared records live in their space. `sharing.js` is the sheet, the invitations and the "whose things these are" note.
- People's names: anywhere a person sharing with you (or you) shows, use `personName(email)` from `sync.js`, never the email itself. It gives the name they set (first name, plus the last name when two people sharing with you have the same first name; else their username), else the start of their email. Names are optional and kept on the server (`POST /api/profile`; usernames unique on the server) and come with each share's members. Sharing or accepting asks for your name first while none is set (`askName` in `sharing.js`, with Carry on to skip); Settings, Sync, Your name changes it.
- Any place that puts something into a project (a picker, a Move, a conversion from Brain Dump or elsewhere) lists the projects shared with you too, after your own: `sharedProjects()` in `app/js/tasks.js` gives them, `sharedValue` / `sharedFrom` make and read a picker's value, and `moveIntoShared` puts your tasks into one (made in the owner's space, yours marked `moved_away` so they stay out of the Bin).
- Who does a task: in a shared project a task has an **Owner** (`owner_id`, a server user id; null means anyone sharing the project can do it), picked from `projectMembers()` in `app/js/tasks.js` (the owner and accepted members, you as Me). Anyone sharing it can change it any number of times; each change stores `owner_by` and `owner_at`, and the project page (only there) shows a dismissable notice to whoever was given tasks by someone else since they last dismissed it (`assign_seen` in your settings, per project). **Waiting on** (every task) is someone outside Sift's sharing: Other, then any typed name, kept as text in `waiting_on` so everyone sees it (not contacts: they're each person's own), and it sets the status to Waiting. Both show as pills (`.who-pills`) on the task's own line in every spacing. 1.60.40's `member_ids` is read as the owner when `owner_id` was never set. In a shared project the Selections bar has Assign to… (`pickOwner`, the people as a small list above the button (`pillMenu` with `list-menu`), as Project… does); inside any project it has no Move ▸ (tasks stay in their project; a group with nothing to show hides itself in `listkit.js`), and quick edit (click into a task, then More) shows a 👤 Who pill for the owner where Energy was. A shared project's view is each person's own (`project_views` in settings, per project: `who` filter from the filter bar under its name, `first` and `group` from the 👁 menu's This project section, drawn by `drawProjectView`); grouped by People, dropping a task under a name sets its owner (`persistOrder`). People (contacts) is separate: it links a task to contacts in your own Contacts. A project's drag order is part of the project, so it's the same for everyone; view choices (spacing, look) are each person's own.
- `app/js/richtext.js`: the one notes editor, used everywhere (toolbar, "- " bullets, links with 📞 📝 ⚠️, full screen with ⤢ or Alt+Enter, Esc steps out). `fullnote.js` is the full-screen part.
- `app/js/autosave.js`: `debounced(save, delay)` with `trigger()` / `flush()`; `flushAll()` runs on leaving a note, changing page, going into the background and before an update reload. Every note editor uses it.
- `app/js/browse.js`: keyboard browsing; one table of per-area settings (search box, filter bar, items, what Enter / Down do). The highlight is `.kb-cur` (same look everywhere).
- `app/js/inline.js`: one-line fields: Enter or leaving saves ("Saved · Undo"); Esc saves and leaves.
- `app/js/listkit.js`: shared list behaviour (select by the grab handle, drag, selection bar, Delete key); `holdSelect` for card grids (press and hold selects, then a tap adds), `rowSel` when the rows aren't one list's `li`s (Find Things' boxes across groups). Shift+arrows while browsing cards reach it from `browse.js` (`browse-select`).
- `app/js/gcal.js`: Google Calendar, read only, for the Day Planner (sign-in, the calendars chosen, day-by-day fetch, device-only cache). It shows in the Day Planner's **↓ Bring items in** sheet (`views/planner.js`: `drawBring`, with From Tasks and Earlier days; what's marked Not today is the day's `bring_skip`).
- **Linked copies** (`app/js/link.js`): a task brought into the Day Planner is a day item with `task_id`; title, note, energy, estimate, people, case and ticking follow both ways, and comments are the task's. Deleting either side goes through `deleteLinked` (asks: everywhere, or only here) and `deleteAll`; `makeUnique` (Advanced's Make unique, and Bring items in's Move, don't copy, a device setting `bring_move`) keeps the day item, moves the task's comments and files onto it, marks it `unique_from` and puts the task (and its sub-tasks) in the Bin. Anything that would take a task out of a project shared with someone gets a second red warning, Cancel first (`askYes(..., { safe: true })`).
- **Brain Dump notes are never touched** by anything done to what was made from them (a task or day item only keeps `source_thought_id`): no delete, Make unique or move ever changes the note.
- `app/js/views/daytasks.js`: Advanced day tasks (`#/planner/<date>/advanced`, the Advanced link under the Day Planner's tasks). `views/planner.js`'s default export picks it or the Day Planner by the address. Each untimed day item is a row (tick, name with its note beside it, its latest comments on the right with a line to add one; clicking them opens all its comments, the full comments box, over the page; 📎 adds files as a comment of their own, `attachAsComment` in `comments.js`, so they carry a time); the schedule is a list on the right; Share asks what goes in (device setting `advanced_share`).
- `app/js/daypanel.js`: a Day Planner item's full panel (More, ⋯): details, energy, note, files, comments, actions. One HTML for the Day Planner and Advanced; each view wires its own buttons and fields.
- `app/js/casepage.js`: Open as case (`openCase({ task_id } | { item_id })`): one task full screen over the page, like a support case: details first (only what's set, each with when it last changed, from its field clocks), note, files, then its history in time order (created, day items, `done_log`, comments and their files, let go, archived, Bin, owner set, and this device's History entries for it). Edits from other devices aren't stored, so the page says so rather than inventing them. From a task's full panel: Open as case in `daypanel.js` (Advanced and the Day Planner) and in Tasks; ‹ Back or Esc closes it.
- `app/js/rows.js`: rows drawn the Tasks way (Tasks, and an open list's items): the lines joining sub-rows, the card classes, measuring where ticks and text sit, rows sliding open and closed.
- `app/js/zoom.js`: a card zooming into its page and back (Find Things' boxes, the Lists page's cards).
- `app/js/hold.js`: press and hold to pick a row up (Tasks via `sortable.js`, the Day Planner). `app/js/undo.js`: Ctrl+Z / Ctrl+Y outside text, from History. `app/js/keys.js`: shortcut key boxes.
- `app/js/rowswipe.js`: phones, swiping a row for its actions (Tasks, Day Planner items). `app/js/slide.js`: the page sliding sideways (a side swipe, Brain Dump's filters); `installSwipe()` in `app.js` turns a side swipe into ← / →.
- `app/js/batchbook.js`: Batch Book data (recipes, batches, entries), books (the user's own, stored as a recipe's `type` and in settings `batch_sections`), steps, units, reading ingredient lines, {references} in a step, ABV, reading recipes imported as text (`parseRecipes`, format in its comment; the Import recipes sheet is in `views/recipes.js`); the pages, dragging cards (listkit, `rank`), each batch ingredient's In stock / Add to list (`stock`, `stock_items`, `list_id`), each card's Make and More menu (a recipe's own `colour` overrides its book's; sharing kind `recipe` in sync.js IN_SCOPE covers its batches and entries by `recipe_id`) and the books sheet are in `views/recipes.js`. Recipe and batch pages use the Day Planner's papers (`.bb-paper[data-paper]` shares the paper tokens in `app.css`).
- `app/js/views/*.js`: one module per area. `smoke.js`: the page check (dev only, not cached).
- `app/js/whatsnew.js`: What's new after an update (`WHATS_NEW`, the sheet, Show me, Save to Brain Dump); `markUpdating()` runs in `applyUpdate()` in `app.js`, `afterUpdate()` on the next start.
- `app/js/demo.js`: the example things a tour fills Sift with, from `app/demo/demo.json` and its photos (fetched only when a tour starts, not part of the app's own files). They're made with `store.createDemo` and cleared with `store.clearDemo`: kept on the device only (never in the outbox or History, their files never uploaded), and anything made inside one is one too. Its categories are shown but never saved (`setDemoTypes` in `words.js`).
- `app/js/views/welcome.js`: the choice of tours (#/welcome), shown the first time Sift is opened on a device with nothing in it (`firstVisit()` in `app.js`), from Settings (Take the tour) and from the "Take the tour of Sift" task (`tour: 'new'`). Three big tours for the three ways Sift gets used (Tasks and projects, writing things down, the Day Planner) and short ones for the rest. `app/js/tour.js`: the tours (`TOURS`: each has its steps, its place kept on the device in `tour_at`, and its task, `tour: <id>`; finished ones in `tours_seen`) and how they point at things; a step can wait for something to be tried (`done`). Each step says one or two short things.
- `server/`: the sync server (Node 24, `node:sqlite`), end-to-end encrypted. `node test.js` after any change.
- `tools/`: `devserver.py`, `make_icons.py` (every icon size from `tools/icon-source.png`), `release.py` and `release_notes.py`, `onenote_to_csv.py`, `make_sift_test.py` (see Sift test below).

## Sift test (older build for comparison)

- https://hazymat.github.io/sift-test/ (repo `hazymat/sift-test`, Pages from `main`, root) runs an older sift build next to the live app. First build: commit 84ee797, the end of 23 September 2026.
- It shares the browser origin with the live app, so an unchanged build would share its IndexedDB, localStorage and caches (and its service worker would delete the live app's cache). Never put an unchanged build there.
- To change the build: from a sift checkout run `python3 tools/make_sift_test.py <commit> <out folder>`, then replace the files in the sift-test repo with `<out folder>/app` and push. The script renames the database, cache, channel and localStorage keys. It stops if a text it patches is missing, which a much newer build may need adding to the script.

## Keyboard behaviour (as built)

- **Esc** leaves what's being worked on and keeps it, one level per press: a menu, then the field or note (saved), then the panel around it, then a record's page back to its list. In Brain Dump, Esc in New note stops writing and un-dims the page. Esc takes the focus off a button reached with Tab.
- **Ctrl+.** in a note makes the line a bullet, or plain text again (#23).
- **Ctrl+Enter** saves and leaves. **Shift+Enter** is a new line. **Alt+Enter** goes one level in (a note full screen; browsing: the outlined note straight into full screen).
- **Brain Dump, browsing** (a note outlined): C colour, T task, P Plan it, A archive, D delete, * pin; Ctrl+V attaches a picture or file from the clipboard, Ctrl+C copies the note with formatting (#46).
- **At an area's top level** (nothing being edited): ← / → change the area's tabs (the Day Planner: its days; Brain Dump: its filter bar), Ctrl+← / → change area, ↓ and Enter start work (see `browse.js` for each area). Alt+← / → are left to the browser.
