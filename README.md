# Sift

A personal, local-first "life app": tasks and projects, a braindump, where things are, trusted trades, quick scans and personal contracts. Runs on phone and laptop as an installable PWA. Your data lives on your device, with optional end-to-end encrypted sync through a server you run yourself.

Early days: nothing usable yet.

- [docs/spec.md](docs/spec.md): what it is and how it works
- [docs/implementation.md](docs/implementation.md): progress and decisions

## Layout

```
app/      the PWA (plain HTML/CSS/JS, no build step), published to GitHub Pages
server/   optional self-hosted sync server (phase 2)
docs/     spec and implementation notes
tools/    dev helpers
```

## Running locally

Serve `app/` with caching turned off:

```
python tools/devserver.py
```

Then open http://localhost:5173. Opening `index.html` straight from disk won't work, because modules and service workers need HTTP.
