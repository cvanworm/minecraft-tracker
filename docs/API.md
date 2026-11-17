# Authenticated tracker API



The web application and ComputerCraft use the same Node.js backend and persistent

SQLite database. The catalog/progress API requires either a shared-password session or

an API key. Public endpoints are limited to health, session status, login, and

the token-protected first-time setup flow. The login page and its

static JavaScript/CSS are public; tracker data and inventory-image requests are

authenticated on the server.



## Shared password and API keys



1. Open the website and set the shared password using the one-time setup code

   in `.tracker.local/setup-code.txt`. Choose your player name and a password

   of at least 12 characters. Share that password with trusted players.

2. Other players enter the same password and their own player names. A player

   profile is created on first login; no separate accounts or invitations are needed.

3. Open **API KEYS** in the header. Choose a name, permissions, and expiry, then

   **CREATE API KEY**. The full key is shown only once. The server stores its hash.

4. Use **REVOKE** to invalidate a key immediately. Revocation/expiry also invalidates

   website sessions opened using that key. Keys cannot mint keys or switch players.



The shared password uses a salted scrypt hash. Browser sessions use opaque,

server-validated HttpOnly, SameSite=Strict cookies and expire after 7 days.

Production HTTPS origins also set Secure cookies. API keys contain 256 random

bits, expire after 1–365 days (30 by default), and are never accepted in query

strings. Shared-password sessions are required for key management.



Player names provide attribution, not separate security boundaries: anyone who

knows the shared password can select any name and manage that name's keys.

Switching a player name rotates the website session; existing API keys retain

their original player identity. Key-based sessions cannot change their identity.



The setup code works only before the shared password is configured. It is not a

reusable login credential. Keep the data directory private. This version does

not provide email password resets.



## ComputerCraft authentication



Every request supplies:



```http

Authorization: Bearer mct_YOUR_KEY

Accept: application/json

```



Mutations also require `Content-Type: application/json`. Cookie-authenticated

mutations require the matching website `Origin` header. Bearer requests do not

need Origin. CORS access from unrelated websites is not enabled.



Use HTTPS for a hosted tracker. HTTP on `127.0.0.1` is suitable when the tracker

and Minecraft server run on the same computer. ComputerCraft HTTP runs from the

Minecraft **server**, so `localhost` means the machine running Minecraft's server.



CC: Tweaked blocks private addresses by default. The current Valhelsia world has

this default block. If using the local tracker, add this narrow rule **before**

the existing `$private` deny rule in

`world/serverconfig/computercraft-server.toml`, then restart Minecraft:



```toml

[[http.rules]]

host = "127.0.0.1"

port = 3000

action = "allow"

```



Keep the existing private-address deny rule. The tracker does not change Minecraft

or firewall settings automatically. Reference: [CC: Tweaked local-address guide](https://tweaked.cc/guide/local_ips.html)

and the installed config's ordered host/port rule documentation.



Copy `computercraft/tracker.lua` to the in-game computer as `tracker.lua`, then:



```lua

settings.set("tracker.url", "http://127.0.0.1:3000")

settings.set("tracker.api_key", "mct_YOUR_KEY")

settings.save()



local tracker = require("tracker")

local items = tracker.items("minecraft:stone")

print(items[1].id) -- stone

local state = tracker.progress()

print(textutils.serialize(state.stone))



-- Requires a key with progress:write permission:

local result = tracker.complete("stone", true)

print(result.state.completed_by)

tracker.claim("diamond", true)



-- Up to 200 changes in one atomic request:

tracker.batch({

    { item_id = "oak_log", is_completed = true },

    { item_id = "iron_ingot", is_completed = true },

})

```



Keep the key on a trusted in-game computer: players who can read its files can

use its key. The client disables redirects so credentials cannot follow a

redirect to another host. Reference: [CC: Tweaked HTTP API](https://tweaked.cc/module/http.html).



## Endpoints



All paths below start with `/api/v1`.



| Method | Path | Permission | Result |

| --- | --- | --- | --- |

| GET | `/items` | `items:read` | `{items: [...], total: 1420}` |

| GET | `/items?minecraft_id=minecraft:stone` | `items:read` | Matching catalog entries |

| GET | `/items?q=diamond` | `items:read` | Case-insensitive name search |

| GET | `/progress` | `progress:read` | `{progress: {stone: {...}, ...}}` |

| PATCH | `/progress/:item_id` | `progress:write` | `{item_id, state, undo_id}` |

| POST | `/progress/batch` | `progress:write` | `{results: [...]}`, all changes or none |

| POST | `/progress/:item_id/undo` | `progress:write` | `{item_id, state}` |



Catalog entries contain `id`, `name`, `category`, `rarity`, and `minecraft_id`.

Use the checklist `id` for updates. A Minecraft ID can map to several variants

(for example potions/tipped arrows); choose the correct checklist variant from

the results. Unsupported modded items are not added to the vanilla catalog.



Example progress request:



```http

PATCH /api/v1/progress/stone

Authorization: Bearer mct_YOUR_KEY

Content-Type: application/json



{"is_completed":true,"expected_revision":0}

```



You may send `is_completed`, `claimed`, or both. Both must be booleans.

`expected_revision` is optional optimistic concurrency control: 0 means no saved

record exists. Use the returned revision for the next edit. Omit it when a trusted

inventory collector should apply an idempotent state update regardless of the

previous revision. Repeating `is_completed: true` preserves the original finder

and completion time. Completion clears hunting claims. Another player's hunting

claim cannot be taken or released; collecting the item still completes it.



Names/timestamps are assigned from the authenticated account and server clock;

clients cannot spoof them. An undo uses `{ "undo_id": "..." }`, works once for

the same account within 10 minutes, and fails if another edit has changed that item.



Batch body:



```json

{"items":[{"item_id":"stone","is_completed":true},{"item_id":"dirt","claimed":true}]}

```



Browser authentication routes: `POST /api/auth/login` (`username`, `password`),

`POST /api/auth/key-login` (`apiKey`), `POST /api/auth/logout`,

`GET /api/auth/session`. Key management uses `GET/POST /api/keys` and

`DELETE /api/keys/:id`; creation accepts `name`, `scopes`, `expires_in_days`.

A shared-password session can switch player name with

`POST /api/auth/player` (`username`). Key-authenticated sessions cannot switch.



Errors are JSON `{ "error": "..." }`:



| Status | Meaning |

| --- | --- |

| 400 | Invalid JSON, fields, or query-string credentials |

| 401 | Missing, invalid, expired, or revoked authentication |

| 403 | Missing permissions, wrong origin, or shared-password login required |

| 404 | Unknown item/key/endpoint |

| 409 | Revision conflict, existing hunting claim, or used player name |

| 413 | Body over 512 KiB |

| 415 | Missing JSON content type for a JSON endpoint |

| 429 | Rate limit reached; honor Retry-After and back off |



The backend permits 600 authenticated API requests per minute per player/key and

10 authentication requests per IP per 15 minutes. Browser progress refreshes

every 3 seconds. API keys allow up to 25 active keys per player name.



## Migrating the old tracker



The old localStorage authentication flag and `VITE_SITE_PASSWORD` are ignored.

A player signed in with the shared password can select **IMPORT SAVED PROGRESS** when this browser contains old

progress. Imports preserve original names and add only missing item records.

Existing shared progress is never overwritten. The browser copy remains intact.



If you previously deployed the open Supabase setup, run `supabase_setup.sql` in

that existing project to remove its public policies and revoke browser access.

This is an external migration: changing this repository cannot revoke a live

Supabase project's grants. Export old remote progress before importing it into

the new backend. This version does not synchronize with Supabase.
