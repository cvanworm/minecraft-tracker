# Minecraft All-Items Tracker

A shared vanilla-survival checklist with 1,420 item icons, a shared server password and player names, and an authenticated HTTP API for CC: Tweaked/ComputerCraft.

## Run locally

Requires **Node.js 24+**. Install dependencies once, then:

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:3000. On the first start, the server generates a one-time
setup code in `.tracker.local/setup-code.txt`. Use it to set your group’s shared
password (at least 12 characters) and choose your player name. There is no default
password. Other players sign in using that same password and their own player
names. API keys also work for website login, retaining their permissions and expiry.

The website requires authentication for collection access. Every catalog/progress
API request is checked by the backend. Authentication is never based on editable
localStorage flags or a password compiled into the browser bundle.

## API keys and ComputerCraft

Sign in with the shared password, select **API KEYS**, and create a named key
with read-only or update permissions and an expiry. Copy it when shown; only its
hash is stored. You can revoke keys in the same panel.

Send `Authorization: Bearer mct_YOUR_KEY` with HTTP requests:

- `GET /api/v1/items`: item catalog, including Minecraft IDs.
- `GET /api/v1/progress`: shared collection state.
- `PATCH /api/v1/progress/stone`: JSON `{"is_completed":true}`.
- `POST /api/v1/progress/batch`: up to 200 changes atomically.

See [the API guide](docs/API.md) for permissions, first-time setup, migration,
ComputerCraft's local-address rules, and runnable examples. The reusable in-game
Lua client is [computercraft/tracker.lua](computercraft/tracker.lua).

## Storage and hosting

The Node server stores player profiles, hashed credentials, sessions, and progress
in `.tracker.local/tracker.sqlite`. Keep this directory private and persistent;
it is ignored by Git and never served over HTTP. Back up the data directory while
the tracker is stopped, including SQLite's journal files if present.

For production:

```powershell
npm run build
npm start
```

Configure `PORT`, `HOST`, `APP_ORIGIN`, and optionally `DATA_DIR` in `.env`
(see `.env.example`). `APP_ORIGIN` must match the website URL. Use HTTPS behind
a reverse proxy for non-local hosting; HTTPS origins use Secure session cookies.
The default listener stays on 127.0.0.1. Use a persistent Node host/container or
VM. A static-only Vercel/Netlify upload or bare Vite preview does not run this
backend and is not a supported deployment.

The previous browser-to-Supabase implementation has been replaced. If an older
Supabase project is deployed, apply the included lockdown SQL there and migrate
its progress before using this backend. No Supabase credentials are needed now.

## Checks

```powershell
npm run test:api
npm run test:icons
npm run build
```

The API tests cover authentication bypasses, permissions, key hashing/expiry and
revocation, cookie origins, shared-password login, atomic updates, undo conflicts,
legacy imports, rate limits, and persistence across restarts.

## Local Minecraft item images

All 1,420 checklist entries use local inventory PNGs in `public/item-icons/`.
The bundled images were extracted or rendered from an installed vanilla
Minecraft **26.2** client JAR. The website does not contact the wiki for images
and does not need Minecraft or Python installed to run.

To regenerate from an installed client JAR (Python 3.10+):

```powershell
python -m pip install -r scripts/requirements-icons.txt
npm run fetch-icons -- "C:\path\to\versions\26.2\26.2.jar"
npm run test:icons
```

The extractor reads the JAR without running Minecraft. It resolves English item
names and aliases, model inheritance, block geometry, texture layers, tint colors,
and animation frames into transparent 64×64 PNGs. Built-in entity items such as
heads, chests, shields, and banners use approximate inventory geometry with the
original game textures; their lighting and shapes can differ from the game.
Long/strong potion variants share images where their appearance is identical.
The extractor currently targets the bundled 26.2 resource format; other versions
may require model or alias updates. Missing entries cause extraction to fail
before replacing the current icon lookup.

`public/item-icons/manifest.json` records the Minecraft version, source JAR hash,
referenced assets, item mappings, and coverage. The source JAR is never copied
into this project. After changing the checklist, regenerate the icons and run
the coverage check. `scripts/fetchWikiIcons.js` is the previous wiki-based importer
and is no longer used by `fetch-icons`.
