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
- **The page check:** in the browser console on the dev page, `(await import('/js/smoke.js')).run()` visits every page, tries the view options, opens a panel or two, and returns `{ pages, errors, problems }`. Expect no errors and no problems. It takes about a minute.
- **Test data:** titles starting `zz ` or dates in 2030 and later. Delete them afterwards straight from IndexedDB (database `sift_local`: the record, plus its `history` and `outbox` entries).
- **How to test steps** (in each pull request, one per change), always as: "In <area>, click <this>, do <that>. Before, it <did this>; now fixed. It should <do this>." Name things in the UI's words. These are copied into the separate test list, and anything that fails comes back as an issue.
- Real iPhone behaviour (Home Screen app, keyboard, safe areas) can only be checked on a real iPhone after publishing: say what couldn't be checked.

## Rules

- **The repo is public.** No personal data, no home network details (the server's address, certificates) in anything committed. Personal notes stay out of the repo.
- **Commits** keep the author already used in this repo: `Mat <7063284+hazymat@users.noreply.github.com>`. No co-author or "generated with" lines in commits, pull requests, issues or files.
- **Writing** (UI text, docs, issues, commit messages): plain British English, short, in the UI's words; no em dashes. Issues and docs are written without referring to anyone ("to be checked", not who will check it).
- **Design priority:** distraction-free, but discoverable. No new buttons that need explaining; show advanced options only where and when they're relevant.
- **Code:** plain HTML, CSS and JS in `app/`, no build step, no framework. Libraries vendored in `app/vendor`, never from a CDN. Comments only where the reason isn't obvious. Multi-line edits are easier with a small script than with shell heredocs (they mangle `\n` inside quoted code).

## Map of the code

- `app/js/app.js`: areas list (`AREAS`), routing, navigation, keyboard (← / → tabs, Ctrl+← / → areas, Esc for menus and stepping back from a record's page), service worker registration and updates (a reload waits for saves).
- `app/js/store.js`: IndexedDB. Record format is final: UUIDv7 ids, per-field clocks, soft deletes, an outbox for sync. `idle()` resolves when every write has reached the database.
- `app/js/richtext.js`: the one notes editor, used everywhere (toolbar, "- " bullets, links with 📞 📝 ⚠️, full screen with ⤢ or Alt+Enter, Esc steps out). `fullnote.js` is the full-screen part.
- `app/js/autosave.js`: `debounced(save, delay)` with `trigger()` / `flush()`; `flushAll()` runs on leaving a note, changing page, going into the background and before an update reload. Every note editor uses it.
- `app/js/browse.js`: keyboard browsing; one table of per-area settings (search box, filter bar, items, what Enter / Down do). The highlight is `.kb-cur` (same look everywhere).
- `app/js/inline.js`: one-line fields: Enter or leaving saves ("Saved · Undo"); Esc saves and leaves.
- `app/js/listkit.js`: shared list behaviour (select by the grab handle, drag, selection bar, Delete key).
- `app/js/views/*.js`: one module per area. `smoke.js`: the page check (dev only, not cached).
- `server/`: the sync server (Node 24, `node:sqlite`), end-to-end encrypted. `node test.js` after any change.
- `tools/`: `devserver.py`, `make_icons.py` (every icon size from `tools/icon-source.png`), `release.py` and `release_notes.py`, `onenote_to_csv.py`.

## Keyboard behaviour (as built)

- **Esc** leaves what's being worked on and keeps it, one level per press: a menu, then the field or note (saved), then the panel around it, then a record's page back to its list. In Brain Dump, Esc in New note stops writing and un-dims the page. Esc takes the focus off a button reached with Tab.
- **Ctrl+Enter** saves and leaves. **Shift+Enter** is a new line. **Alt+Enter** goes one level in (a note full screen; browsing: the outlined note straight into full screen).
- **Brain Dump, browsing** (a note outlined): C colour, T task, P Plan it, A archive, D delete, * pin; Ctrl+V attaches a picture or file from the clipboard, Ctrl+C copies the note with formatting (#46).
- **At an area's top level** (nothing being edited): ← / → change the area's tabs (the Day Planner: its days; Brain Dump: its filter bar), Ctrl+← / → change area, ↓ and Enter start work (see `browse.js` for each area). Alt+← / → are left to the browser.
