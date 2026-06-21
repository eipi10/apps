# Interleaved Practice Timer

A small static web app for building interleaved music-practice sessions. It is designed for GitHub Pages and uses only HTML, CSS, and JavaScript. No server, build step, framework, account, database, or tracking.

## What it does

The app supports several interleaved-practice formats:

- **Serial spots**: practice hard spots one after another and track successful passes with tick marks.
- **Interval cue**: keep working, then perform a selected spot whenever the timer cues you.
- **Time-constrained switching**: switch what you are working on after short timed blocks.
- **Random sections**: practice numbered sections in shuffled order.
- **New music revisit**: return to earlier spots after intervening work.

It also includes short breaks, browser-local saving, JSON export/import, dark mode, a practice-journal field, and optional beep/vibration cues.

## Repository layout

This is intentionally similar to simple static app collections such as `ericnovik/apps`: each app can live in its own folder and be served directly by GitHub Pages.

```text
interleaved-practice-timer/
├── index.html
├── styles.css
├── app.js
├── README.md
└── LICENSE
```

## Run locally

Open `index.html` in a browser, or run a tiny local server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy to GitHub Pages

Option A: standalone repo

1. Create a new GitHub repository, for example `interleaved-practice-timer`.
2. Copy these files into the repository root.
3. Commit and push.
4. In GitHub, go to **Settings → Pages**.
5. Set source to **Deploy from a branch**, branch `main`, folder `/root`.

Option B: app collection repo

1. Create or use a repo called `apps`.
2. Put this folder at `apps/interleaved-practice-timer/`.
3. Add a link to it from the root `index.html` of the collection.
4. Enable GitHub Pages for the repo.

The app will then be available at a URL similar to:

```text
https://YOUR-GITHUB-USERNAME.github.io/apps/interleaved-practice-timer/
```

## Notes on the practice model

This app is an implementation aid, not a substitute for the book or teacher guidance. The labels avoid reproducing copyrighted text from the source and are phrased as generic practice-tool features.

## License

MIT. See `LICENSE`.
