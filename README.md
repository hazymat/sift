# Sift

A personal, local-first "life app" for people who like to get things out of their head and sort them later. It runs on a phone and a laptop as an installable web app (a PWA). Your data lives on your own devices, with optional end-to-end encrypted sync through a small server you run yourself.

**Status:** in daily use by its author and still changing fast. It works, but expect rough edges. Back up your data (Settings → Backup) before trusting it with anything important.

**Try it:** https://hazymat.github.io/sift/ (everything stays in your browser until you turn sync on).

## What it does

- **Tasks:** lists (Now / Next / Later), projects, sub-tasks, energy levels, notes, drag to reorder, undo for everything.
- **Day Planner:** a lined page for today: give tasks times and lengths, carry unfinished things over, pick a paper style, copy or share the plan as text.
- **Brain Dump:** capture a thought in seconds, sort it later into a task, a plan item, a Find Things item or a contact. Cards, spacing you can change, attachments (photos, PDFs, text files), bullets and simple formatting.
- **Find Things:** where things live (boxes, shelves, tags) with search that follows you into a box.
- **Lists:** checklists and reusable templates.
- **Contacts and cases:** people and trades, with a timeline of calls, letters and visits.
- **Notes everywhere:** the same notes editor across the app, with links between things.
- **Sync (optional):** your phone and laptop stay in step through your own server. Everything is encrypted on your device first; the server only stores scrambled copies. See [server/README.md](server/README.md).
- **Works offline**, installs to the Home Screen, and keeps a full history so you can undo anything.

Not built yet: Scans, Contracts and Batch Book (they show as placeholders), the calendar connection, and cloud drives as an alternative to your own server. See the backlog in [docs/implementation.md](docs/implementation.md).

## Documents

- [docs/pitch.md](docs/pitch.md): why Sift, and how it compares with Apple Notes and Google Keep
- [docs/spec.md](docs/spec.md): what it is and how it works
- [docs/implementation.md](docs/implementation.md): progress, the to-do list and decisions
- [server/README.md](server/README.md): running your own sync server (Ubuntu or Docker)

## Layout

```
app/      the app (plain HTML/CSS/JS, no build step), published to GitHub Pages
server/   the optional sync server (Node 24, no dependencies) and its installer
docs/     spec and implementation notes
tools/    dev helpers
```

## Running it locally

Serve `app/` with caching turned off:

```
python tools/devserver.py
```

Then open http://localhost:5173. Opening `index.html` straight from disk won't work, because modules and service workers need HTTP.

## Tests

The sync server has an end-to-end check that starts its own throwaway server (needs Node 22.5 or newer):

```
cd server
node test.js
```

## Privacy

There is no account with the app itself, no analytics and no tracking. The app talks only to a sync server you choose to enter. With sync on, records and attachment files are encrypted on your device with a key the server never receives.
