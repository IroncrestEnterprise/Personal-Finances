# Ledger Cleaner

Clean up and categorize bank statement exports.

Statement files are never uploaded or stored anywhere. Only your setup is
saved — accounts, rules, categories, manual fixes, opening balances.

## Uploading to GitHub

Drag **all five files in this folder** into your repo (including the hidden
`.gitignore` if your file manager shows it). `index.html` must sit at the top
level of the repo, next to the others — not inside a folder.

Uploading a file that already exists overwrites it. You don't need to delete
anything first.

## Render settings

This layout is flat, so in your Render static site:

- **Build Command:** empty
- **Publish Directory:** `.` (a single period)

After uploading, Render redeploys on its own. Watch for `==> Build successful`.

## What each file does

| File | Purpose |
|------|---------|
| `index.html` | the whole app, self-contained |
| `server.js` | only used for the synced version; harmless otherwise |
| `render.yaml` | only used for the synced version; harmless otherwise |
| `package.json` | keeps Render's auto-detected build command happy |
| `.gitignore` | keeps stray files out of the repo |

Only `index.html` matters for the static site. The rest sit unused until you
switch to the synced version.

## Updating later

Replace `index.html` with a newer one and commit. Your saved settings live
separately and survive updates.

## Switching to synced settings

Rules and categories follow you between computers instead of living per-browser.

In Render: **New → Blueprint**, point it at this repo. It reads `render.yaml`,
which asks you to set `APP_PASSWORD` — make it long. Sign in with username `me`.

This needs a paid instance. Settings are stored on a persistent disk, and Render
doesn't allow disks on free services; free services also spin down after 15
minutes idle, which wipes their filesystem. Roughly $7/month. The free static
site works fine — you just move settings between computers by hand with
**Settings → Download settings** and **Load settings**.

## Backups

**Settings → Download settings** saves everything you've built to a JSON file.
Keep one in a synced folder. If browser storage is ever cleared, that file is
the only way back.

## If something looks wrong

- **404 after deploy** — Publish Directory isn't `.`
- **Blank page** — open the browser console; it names the library that failed
- **"Chart unavailable"** — charts didn't load; everything else still works
- **Settings not saving** — the console logs `Ledger Cleaner storage mode:` on
  startup. `local` is expected on the static site; `memory` means the browser
  blocked storage.
