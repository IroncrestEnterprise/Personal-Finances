# Ledger Cleaner

Clean up and categorize bank statement exports. Runs three ways: as a file you
double-click, as a free static site, or as a small server that syncs your setup
between computers.

Statement files are never uploaded or stored anywhere. Only your *setup* is
saved — accounts, rules, categories, manual fixes, opening balances.

---

## Option A — just open the file

Download `public/index.html`, put it anywhere, double-click it.

Free, nothing to deploy. Your setup saves to that browser's local storage, so
each computer keeps its own. Move between them with **Settings → Download
settings** and **Load settings**.

One catch: some browsers (Safari especially) block local storage on `file://`
URLs. If your setup doesn't survive a reload, that's why — the app still works,
it just can't remember. Options B and C both fix this.

---

## Option B — free static site on Render

Free forever, no cold starts, and local storage works properly because it's
served over `https://`. Still one setup per computer.

1. Push this folder to a GitHub repo.
2. In Render: **New → Static Site**, connect the repo.
3. Publish directory: `public`. Build command: leave empty.
4. Deploy.

Anyone with the URL can open it. Since nothing is stored on the server, there's
nothing to leak — but use Option C if you'd rather it not be public at all.

---

## Option C — web service with synced settings

Your rules and categories follow you between computers automatically.

**This needs a paid instance.** Not upselling — it's a hard platform limit.
Settings are stored on a persistent disk, and [Render doesn't allow disks on
free services](https://render.com/docs/free). Free services also spin down after
15 minutes idle, which wipes their filesystem. The free Postgres alternative
expires 30 days after creation. A Starter instance plus a 1 GB disk is roughly
$7/month; check [Render's pricing](https://render.com/pricing) for current rates.

1. Push this folder to a GitHub repo.
2. In Render: **New → Blueprint**, point it at the repo. It reads `render.yaml`.
3. Set `APP_PASSWORD` in the dashboard to something long. This is the only thing
   standing between your financial setup and anyone who finds the URL.
4. Deploy, open the URL, sign in with username `me` and that password.

Change the username by editing `APP_USER`.

To verify sync: add a rule on one computer, reload on the other.

---

## Running it locally

```bash
node server.js
```

Then open http://localhost:3000. No `npm install` — there are no dependencies.
Set `APP_PASSWORD` to require a login; without it the server runs open, which is
fine on your own machine and not fine anywhere else.

---

## What's here

```
server.js       zero-dependency Node server: static files + settings API
public/         the app, one self-contained HTML file
render.yaml     Render Blueprint for Option C
package.json    no dependencies; just the start script
```

The app needs an internet connection on first load to fetch React, Tailwind,
SheetJS and recharts from CDNs. Your browser caches them afterward.

## API

Everything except `/healthz` requires the password when `APP_PASSWORD` is set.

| Method | Path             | Purpose                        |
|--------|------------------|--------------------------------|
| GET    | `/healthz`       | health check, no auth          |
| GET    | `/api/kv`        | read all settings              |
| PUT    | `/api/kv/:key`   | save settings, body `{"value":"..."}` |
| DELETE | `/api/kv/:key`   | clear settings                 |

Settings live in a single JSON file at `DATA_DIR/store.json`, written
atomically. Back it up by hitting `/api/kv`, or from inside the app with
**Settings → Download settings**.

## If something breaks

**Blank page.** Open the browser console. The app names the library that failed
to load — usually a network or ad-blocker issue.

**Settings don't sync.** The console logs `Ledger Cleaner storage mode:` on
startup. `server` means synced, `local` means this browser only, `memory` means
the browser blocked storage entirely. If it says `local` on Option C, the app
couldn't reach `/api/kv`.

**Everything vanished after a deploy.** The disk probably isn't mounted. Confirm
`DATA_DIR` is `/var/data` and the disk shows up under the service's Disks tab.
