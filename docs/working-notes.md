# Sift: working notes

How work on Sift is done: where things are, the rules, and where it has got to. Read this first, then the two overview issues. `docs/spec.md` is the source of truth for what Sift is; this file is about how it's built.

## Where it has got to

- **Live:** 1.22.07 (GitHub Pages, https://hazymat.github.io/sift/). Every version has a GitHub Release with its notes.
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
   - bump the version in `app/js/version.js` (fixes and small changes: the last number; a new feature: the middle number, last back to `00`);
   - any new JS file goes into `SHELL` in `app/sw.js`;
   - syntax check each changed JS file: copy it to a `.mjs` file somewhere temporary and run `node --check` on that;
   - add the release note to `tools/release_notes.py`;
   - write **How to test** steps in the pull request (see below).
3. One pull request per change or small batch, with the issue numbers it closes (`Closes #n`).
4. **Publishing is merging the pull request.** Nothing is merged until it has been asked for.
5. After merging: check the deploy (`gh run watch`, then `curl -s "https://hazymat.github.io/sift/js/version.js?x=$RANDOM" | grep VERSION`), create the Releases (`python tools/release.py <version> <full commit hash> ...`), and close the issues it fixed with a comment naming the version. The overview issues tick themselves.

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
- **Code:** plain HTML, CSS and JS in `app/`, no build step, no framework. Libraries vendored in `app/vendor`, never from a CDN. Comments only where the reason isn't obvious. Multi-line edits are easier with a small script than with shell heredocs (they mangle `\n` inside quoted code).

## Map of the code

- `app/js/app.js`: areas list (`AREAS`), routing, navigation, keyboard (← / → tabs, Ctrl+← / → areas, Esc for menus and stepping back from a record's page), service worker registration and updates (a reload waits for saves).
- `app/js/store.js`: IndexedDB. Record format is final: UUIDv7 ids, per-field clocks, soft deletes, an outbox for sync. `idle()` resolves when every write has reached the database. Spaces: `local` is your own database; each person sharing with you has their own (`spaceOf(user id)`), and `store.get/list/create...` work on the current one (`useSpace`, reset to your own on changing area).
- `app/js/sync.js` and `app/js/sharing.js`: sync, and sharing between accounts on one server. A share holds a list (and its items), a note, or a range of days (`info.kind`: list, note, days); which records go to which share is worked out from that (`inShare`), never stored on the record. Your own shared records stay in your own records too; others' shared records live in their space. `sharing.js` is the sheet, the invitations and the "whose things these are" note.
- `app/js/richtext.js`: the one notes editor, used everywhere (toolbar, "- " bullets, links with 📞 📝 ⚠️, full screen with ⤢ or Alt+Enter, Esc steps out). `fullnote.js` is the full-screen part.
- `app/js/autosave.js`: `debounced(save, delay)` with `trigger()` / `flush()`; `flushAll()` runs on leaving a note, changing page, going into the background and before an update reload. Every note editor uses it.
- `app/js/browse.js`: keyboard browsing; one table of per-area settings (search box, filter bar, items, what Enter / Down do). The highlight is `.kb-cur` (same look everywhere).
- `app/js/inline.js`: one-line fields: Enter or leaving saves ("Saved · Undo"); Esc saves and leaves.
- `app/js/listkit.js`: shared list behaviour (select by the grab handle, drag, selection bar, Delete key).
- `app/js/gcal.js`: Google Calendar, read only, for the Day Planner (sign-in, day-by-day fetch, device-only cache); the box and **+ Add to plan** are in `views/planner.js` (`renderGcal`).
- `app/js/rows.js`: rows drawn the Tasks way (Tasks, and an open list's items): the lines joining sub-rows, the card classes, measuring where ticks and text sit, rows sliding open and closed.
- `app/js/hold.js`: press and hold to pick a row up (Tasks via `sortable.js`, the Day Planner). `app/js/undo.js`: Ctrl+Z / Ctrl+Y outside text, from History. `app/js/keys.js`: shortcut key boxes.
- `app/js/rowswipe.js`: phones, swiping a row for its actions (Tasks, Day Planner items). `app/js/slide.js`: the page sliding sideways (a side swipe, Brain Dump's filters); `installSwipe()` in `app.js` turns a side swipe into ← / →.
- `app/js/batchbook.js`: Batch Book data (recipes, batches, entries), books (the user's own, stored as a recipe's `type` and in settings `batch_sections`), steps, units, reading ingredient lines, {references} in a step, ABV, reading recipes imported as text (`parseRecipes`, format in its comment; the Import recipes sheet is in `views/recipes.js`); the pages, dragging cards (listkit, `rank`), each batch ingredient's In stock / Add to list (`stock`, `stock_items`, `list_id`), each card's Make and More menu (a recipe's own `colour` overrides its book's; sharing kind `recipe` in sync.js IN_SCOPE covers its batches and entries by `recipe_id`) and the books sheet are in `views/recipes.js`. Recipe and batch pages use the Day Planner's papers (`.bb-paper[data-paper]` shares the paper tokens in `app.css`).
- `app/js/views/*.js`: one module per area. `smoke.js`: the page check (dev only, not cached).
- `app/js/views/welcome.js`: the first time Sift is opened on a device with nothing in it (`firstVisit()` in `app.js`): tour now, later (a task with `tour: true`, whose pill starts it), or not at all. `app/js/tour.js`: the tours (`TOURS`: each has its steps, its place kept on the device in `tour_at`, and its task, `tour: <id>`) and how they point at things; a step can wait for something to be tried (`done`).
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
