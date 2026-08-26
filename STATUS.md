# Wolf Creek Lodge - implementation status

**Last updated:** 2026-08-26 (**Auth, email sync and the CRM all work; the CRM is published.**)

Since the 2026-08-25 entry below: Microsoft sign-in was fixed on both surfaces and email sync now
runs (200 messages). The CRM turned out never to have been a broken build -- its login path was
broken instead -- and it is now published at `crm.wolfcreeklodge.us` on the owner's call,
reversing the earlier localhost-only recommendation. The database gained its first real guests and
reservations. The apartment's cover photo and gallery were wrong or weak and have been replaced.
The website image pipeline was fixed (`sharp` installed, `.next/cache` made writable), which
took the home page hero from 17.4 MB to 61 KB on a phone.

One defect knowingly left open: the arrival directions map is publicly fetchable, which defeats the
token gate on `/arrival/{token}`. See Known broken 3.

---

**Prior entry (2026-08-25, later):** (**Winter 2026/27 is live and the site is off Airbnb.**)

Three things changed and are deployed:

1. **The 2026-08-25 work was never actually deployed.** Both images dated from 2026-05-26, so
   `/winter`, `/llms.txt`, `/robots.txt` and `/sitemap.xml` were 404 in production and the live
   MCP `get_pricing` was still quoting stored parity rates, undercutting the published direct
   price by 10 percent. Rebuilt; all of it now serves.
2. **The winter rate ladder is applied.** `03` and `04` both ran. 11 seasons, 33 rate rows,
   applied as written on the owner's call. See the Database schema section.
3. **The site now books by email.** Airbnb is a fallback link, not a parallel call to action.
   See "Booking messaging" below.

Also fixed: all three `/listings/[id]` pages were returning 500 (`getListingPhotos` shape bug),
and `mcp-server/requirements.txt` gained an upper bound after a rebuild pulled mcp 2.x and
crash-looped the server.

**Prior entry (2026-08-25, earlier):** Winter 2026/27 shipped to the repo -- seasonal rate-calendar
schema, a sourced winter guide at `/winter`, and a real agent surface (JSON-LD, `/llms.txt`, two
new MCP tools, date-aware `get_pricing`). Repo hygiene: the May migration topology committed, the
photo stubs tracked so `main` builds from a clean clone, and a destructive-command deny-list.

**Prior entry (2026-05-26):** stack rebuilt on the ThinkPad X1 after Pintea-Ubuntu suffered a
hardware failure mid-migration. All containers running, Cloudflare routing restored. Fresh empty
database (the pre-crash dump never transferred). 142 of ~200 photos recovered from a truncated
tarball. Four photo-layer source files lost and replaced with stubs. See `MIGRATION-NOTES.md`.

**Purpose:** single source of truth for *current* implementation state. Read this first in any new
session. The design intent lives in `wolf-creek-lodge-prd.md`; when the PRD and reality diverge,
this document is authoritative for "what exists today". Host and workflow context for agents lives
in `CLAUDE.md`.

---

## Substrate snapshot

- **Host:** ThinkPad X1, Seattle, Windows + Docker Desktop. Repo at `C:\wolf-creek-lodge`.
  Cohabits the same Docker Desktop with the Gearbox stack at `C:\gearbox`. See
  `TWO-STACKS-OPERATING-GUIDE` in the Claude project for the isolation rules; the short version is
  one session per project, one folder connected.
- **NOT** on Pintea-Ubuntu any more. That machine is dead (kernel panic, suspected multi-bit RAM
  failure despite ECC) and its disk is still unrecovered.
- **Compose project name pinned** to `wolf-creek-lodge`, which is the name compose already derived
  from the directory. Pinning it means renaming or moving the folder can no longer orphan the
  `wolf-creek-lodge_pgdata` volume.
- **Database:** PostgreSQL 16 Alpine, `expose: 5432` only. No published host port, so it cannot
  collide with the Gearbox Postgres and is reachable only on its own compose network.
- **Public path in:** Cloudflare tunnel only. Every HTTP service is bound to `127.0.0.1`, so
  Tailscale peers cannot reach them directly.

### Three bookable SKUs

Two physical units, three configurations, mutually exclusive and enforced by database trigger
(`check_cross_property_overlap`). Booking any one blocks the others for overlapping dates.

| id | Config | Sleeps | Beds | Bath | Current rate (direct) |
|---|---|---|---|---|---|
| `wolf-creek-lodge` | 3BR house | 9 | 11 | 2 | $857 - $934 |
| `wolf-creek-apartment` | 1BR apartment | 2 | 1 | 1 | $275 / $308 weekend |
| `wolf-creek-retreat-combo` | 4BR both together | 10 | 12 | 3 | $1,045 / $1,160 weekend |

The range above is the flat fallback in `properties.pricing`, which is what the listing pages show
as a headline. **Actual per-night pricing is seasonal** as of 2026-08-25: a dated stay resolves
through `rate_seasons` + `property_rates` and can run from $549 base on a shoulder night to
$1,095 base in the Christmas corridor. Stored rates are Airbnb parity; both the site and the MCP
server add `DIRECT_MARKUP` (10 percent) on render. Superhost, 4.93 average across 46 reviews.

---

## Services running

All via `docker-compose.yml` at project root. `docker compose up -d` brings up everything;
`crm` no longer needs excluding.

| Container | Build | Host binding | Notes |
|---|---|---|---|
| `wcl-database` | `postgres:16-alpine` | expose 5432 only | volume `pgdata` -> `wolf-creek-lodge_pgdata` |
| `wcl-website` | `./website` | `127.0.0.1:8080` -> 3000 | Next.js 14 App Router, `output: standalone` |
| `wcl-mcp-server` | `./mcp-server` | `127.0.0.1:8081` | Python FastMCP, SSE transport, serves at `/sse` only |
| `wcl-crm` | `./crm` | `127.0.0.1:8082` -> 3000 | Express + Vite SPA. Published at `crm.wolfcreeklodge.us`. Sign-in works only through the tunnel: the app sends one redirect URI and it is the https one. |
| `wcl-ical-sync` | `./scripts` (`sync-ical.mjs`) | none | pulls Airbnb iCal into `reservations` |
| `wcl-email-sync` | `./scripts` (`Dockerfile.email-sync`) | none | Microsoft Graph -> `emails` |
| `wcl-cloudflared` | `cloudflare/cloudflared:latest` | none | mounts `./cloudflared` read-only |

### Cloudflare tunnel

Tunnel `wolfcreek`, id `87038840-5431-494c-9a71-6b33251bd799`.

**Ingress is DASHBOARD-managed, not `config.yml`-managed.** The local `cloudflared/config.yml`
exists but is overridden by server-side routes pushed at connection time. For routing changes edit
one.dash.cloudflare.com -> Networks -> Tunnels -> wolfcreek -> Public Hostname. The local file is
documentation only. (Older notes in `CLAUDE.md` said the opposite; the migration disproved it.)

Routes: `wolfcreeklodge.us` -> `website:3000`, `mcp.wolfcreeklodge.us` -> `mcp-server:8081`,
`crm.wolfcreeklodge.us` -> `crm:3000` (re-added 2026-08-26; it had been deleted while the CRM
looked broken). Routes must use the compose service name, not `localhost`; inside the cloudflared
container `localhost` is the container itself.

---

## Database schema

Applied automatically on first compose-up via `/docker-entrypoint-initdb.d/`:

| File | Contents | Applied? |
|---|---|---|
| `database/init.sql` | `site_config`, `properties`, `guests`, `reservations`, `payments`, `activity_log`, `ical_sync_log`, `sessions` + the overlap and cross-property exclusivity triggers | yes |
| `database/02-email-sync.sql` | `email_sync_state`, `emails` | yes |
| `database/03-rate-calendar.sql` | `rate_seasons`, `property_rates` + `resolve_season`, `is_weekend_night`, `resolve_nightly_rate`, `quote_stay`, `required_min_nights` | **yes, 2026-08-25** |
| `database/04-winter-2026-27-rates.sql` | the winter ladder + minNights and beds fixes | **yes, 2026-08-25** (11 seasons, 33 rate rows) |
| `database/05-arrival-tokens.sql` | `reservations.arrival_token` + unique index, for the private arrival page | **yes, 2026-08-25** |

Both applied 2026-08-25. The ladder went in **as written**, on the owner's call, without the
occupancy check the decision rule below asks for: `reservations` is empty on this database, so that
input does not exist. Revisit once a season of real booking data accumulates.

```powershell
docker exec -i wcl-database psql -U wolfcreek -d wolfcreek < database\03-rate-calendar.sql
docker exec -i wcl-database psql -U wolfcreek -d wolfcreek < database\04-winter-2026-27-rates.sql
docker compose up -d --build website mcp-server
```

Rollback for rates only: `DELETE FROM property_rates; DELETE FROM rate_seasons;` The resolver
falls straight back to flat pricing.

---

## Website routes

| Route | Rendering | Notes |
|---|---|---|
| `/` | dynamic | hero, winter band, featured Retreat, property cards, galleries, host |
| `/winter` | dynamic | **new.** Trail passes, Loup Loup, the winter drive, event calendar, rate table |
| `/area` | dynamic | seasonal activities + Highway 20 winter access |
| `/about`, `/contact` | dynamic | |
| `/availability` | static shell | calendar + admin sign-in (Microsoft OAuth) |
| `/listings/[id]` | dynamic | per-SKU detail. Email-first booking panel; Airbnb demoted to a footnote link |
| `/arrival/[token]` | dynamic | **new, PRIVATE.** Exact directions to the house. Token-gated, `noindex`, `Disallow`ed. Never link to it from a public page. |
| `/llms.txt` | dynamic | **new.** Agent brief, generated from the same rows the site reads |
| `/robots.txt`, `/sitemap.xml` | **new** | |
| `/api/availability`, `/api/auth/[action]`, `/api/admin/bookings`, `/api/admin/blocks`, `/api/ical/[token]` | route handlers | |

All pages carry a schema.org `@graph`: `LodgingBusiness` + three `VacationRental` nodes with 11
seasonal `Offer` nodes each (live now that `03`/`04` are applied) and `eligibleQuantity` minimum stay. The
three-SKU exclusion constraint is written out in plain language in every node description, because
no vacation-rental schema can express it.

---

## CRM and email sync

The CRM was recorded as a broken build. It is not, and probably has not been for a while --
`docker compose build crm` succeeds and the container serves. The real fault was in the login
path, and it had two parts, both fixed 2026-08-25.

**1. The refresh token was never stored.** `crm/server/auth.js` read `result.refreshToken` off the
MSAL `AuthenticationResult`. MSAL deliberately does not put it there -- that property is always
`undefined`, because refresh tokens are meant to stay inside its token cache. So every login wrote
`access_token` and left `refresh_token` null, which is exactly the state the database was found
in (`has_access = t, has_refresh = f`), and `scripts/sync-email.mjs` logged "No refresh token
found in email_sync_state" forever. It now reads the token out of
`getTokenCache().serialize()`, which is the supported route, and logs a loud warning if the cache
has no refresh token (which would mean `offline_access` was not consented).

**2. The session cookie could never be set.** `cookie.secure` was keyed off `NODE_ENV`, so in
production it was always `true`. A secure cookie is not stored by the browser over plain HTTP, and
this CRM is reached over `http://localhost:8082` now that the `crm.wolfcreeklodge.us` route is
gone -- so the session vanished between the OAuth callback and the next request. It now follows the
scheme of `MICROSOFT_REDIRECT_URI`.

Also changed: `MICROSOFT_REDIRECT_URI` is now set explicitly in `.env`
(`http://localhost:8082/auth/callback`); the compose default no longer points at the deleted
`crm.wolfcreeklodge.us` hostname; and `DEV_BYPASS_AUTH` now defaults to `false` in compose
rather than `true`, because a CRM that silently runs with no auth if `.env` goes missing is a
bad default.

Verified: the authorize URL carries the right `redirect_uri` and includes `offline_access`, and
Microsoft returns a normal sign-in page rather than `AADSTS50011`, so that redirect URI is
registered on the app registration.

**Resolved 2026-08-25. Email sync is live: 200 messages, Jun 1 to Aug 26.** Getting there turned
up three more faults after the two above:

1. **Wrong authority.** The app registration is "Any Entra ID Tenant + Personal Microsoft
   accounts", but `MICROSOFT_TENANT_ID` was the tenant GUID. A personal Microsoft account cannot
   authenticate against a single-tenant authority. Now `common`. Every code path already
   defaulted to that; the GUID was the anomaly.
2. **`docker compose restart` does not reload `.env`.** email-sync kept the old tenant GUID
   through three restarts while website and crm had `common`, so it kept minting an
   organizational token (`iss: sts.windows.net`, `tid: 354288e4...`) that Graph rejected with
   401 for a consumer mailbox. `--force-recreate` is required, as `CLAUDE.md` already says.
3. **`scripts/sync-email.mjs` carried its own stale schema.** Its `ensureTables()` and INSERT
   used `to_address TEXT` and `body_preview`, while `database/02-email-sync.sql` -- the
   authoritative definition, applied at init -- has `to_addresses JSONB`, `snippet` and
   `from_name`. The INSERT now matches, keeps every recipient rather than the first, and
   populates `from_name`. The duplicated CREATE TABLE is now identical to the migration.

The token was seeded by signing in at **https://wolfcreeklodge.us/availability**, not the CRM --
that redirect URI was already registered on the app, so it needed no Azure change.
`http://localhost:8082/auth/callback` has since been registered too, so the CRM UI is reachable.

Two things worth knowing about the sync: `delta_link` is still null, so each run does a full
200-message fetch rather than an incremental one (`ON CONFLICT (graph_id) DO NOTHING` makes that
harmless but wasteful), and nothing ever writes `last_sync_at`.

---

## Arrival details (private)

Exact directions to the house are not public. They live at `/arrival/{arrival_token}`, one
unguessable URL per reservation, using the same pattern as `properties.ical_export_token`.

- **Token:** `reservations.arrival_token`, defaulted by the database, so anything that inserts a
  reservation gets one without knowing about it. 122 bits via `gen_random_uuid()`.
- **Revocation:** setting a reservation to `cancelled` or `no_show` makes the page 404 with no
  extra step. To revoke without cancelling, rotate the token (statement at the bottom of
  `database/05-arrival-tokens.sql`).
- **The map itself is NOT gated.** See Known broken 3. The token protects the page; the image is a
  static file under `public/` and is fetchable by anyone who guesses the path. Known and
  deliberately left open as of 2026-08-26.
- **Crawler defence, three layers:** the page sends `robots: noindex, nofollow, nocache`;
  `/arrival/` is `Disallow`ed in `app/robots.js`; and it is not in the sitemap. It also sends
  `referrer: no-referrer` so tapping the Google Maps button does not leak the token onward.
- **Getting the link:** `POST /api/admin/bookings` now returns `arrival_url` alongside the
  reservation, ready to paste into a confirmation email. For a reservation that already exists:

  ```sql
  SELECT g.email, r.check_in, 'https://wolfcreeklodge.us/arrival/' || r.arrival_token AS arrival_url
    FROM reservations r JOIN guests g ON g.id = r.guest_id
   WHERE r.status NOT IN ('cancelled','no_show');
  ```

Verified 2026-08-25 against a temporary reservation, since removed: valid token 200, unknown token
404, cancelled reservation 404.

---

## CRM data

The database held no guests and no reservations until 2026-08-26. It now carries a small real
history, part entered by hand and part reconstructed from the synced mailbox.

- **8 guests.** Four supplied by the owner with full contact details; three recovered from Vrbo
  notification subjects (name only -- Vrbo does not put email or phone in them); one pre-existing
  record from the May rebuild.
- **7 reservations**, all `wolf-creek-apartment`, all `booking_channel = 'vrbo'`. Five
  `completed` totalling 17 nights across June to August 2026, and two `cancelled`.
- **13 of 200 emails linked to a guest.**

Three findings worth keeping:

1. **Two bookings that looked live were cancelled.** One of the four guests originally described
   as a past stay had in fact cancelled four days before arrival, and a Sep 5-7 booking that
   looked upcoming was cancelled on 2026-08-04. Both are stored as `cancelled` so they do not
   count toward occupancy. Check for a "Booking canceled" mail before trusting any reservation
   subject.
2. **Address matching cannot work for OTA mail.** 125 of the 200 messages come from `airbnb.com`
   and about 60 more from Vrbo/HomeAway domains, all of which anonymise the guest address.
   `matchGuest()` in `sync-email.mjs` compares addresses only, so it linked nothing. The 13 links
   were made by matching "<first> <last>" against the subject instead. This resolves itself as
   direct booking grows, since those guests mail the mailbox directly.
3. **No prices anywhere in the mailbox.** Verified against Graph: reservation bodies carry no
   amounts, Vrbo deposit statements carry none, and the six Airbnb payout mails put a figure in
   the *subject* but are host payouts -- net of fees, dated when money moved, not attributable to
   a named guest. All 7 reservations therefore have `total_amount = 0`. Revenue has to come from
   the Vrbo and Airbnb dashboards.

Still outside the system: roughly **16 Airbnb stays** are identifiable from subjects by property
and dates (5 apartment, 4 house, 7 Retreat, July through the Christmas corridor). Airbnb
reservation subjects name the *property*, not the guest, so they cannot be attributed, and Airbnb
withholds guest email and phone. That set has to be harvested from the Airbnb dashboard and
entered through the CRM.

---

## Booking messaging

Changed 2026-08-25. The site used to present Airbnb and direct booking as two equal options, with a
red "Book on Airbnb" button beside every direct one. It no longer does. **Email is the booking
channel**, the phone is offered as a secondary and explicitly described as slower, and Airbnb
survives only as a plain text link for guests who specifically want the platform.

| Surface | What it says now |
|---|---|
| `/listings/[id]` | `.booking-panel`: rate, "Email to Book" primary CTA, then "call or text ... email reaches us fastest". Airbnb is one `.booking-fallback` sentence below the panel. |
| `/` | featured Retreat card CTA is "Email to Book". No Airbnb button anywhere on the page. |
| `/contact` | "Booking is by email" replaces "Booking is handled through Airbnb". Phone carries "Email is checked far more often". The Airbnb list is retitled "Also listed on Airbnb" with a note that their total is higher. |
| `/llms.txt` | states email is the booking channel, gives the phone with the caveat that it is not monitored closely, and tells agents not to route guests to Airbnb unless asked. |

`.btn--airbnb` (the `#FF5A5F` button) still exists in `globals.css` but has no remaining usage in
any component. Left in place rather than deleted, since removing it is a separate cleanup.

Two related things worth knowing:

- The listing pages previously computed the direct rate with a bare `* 1.1` inline, which is the
  exact trap `CLAUDE.md` warns about. They now call `toDisplayRate()` from `lib/pricing.js`, so
  the markup is defined in one place.
- The phone number is read from `site_config.contact_phone` and formatted for display. It used to
  be hard-coded in `contact/page.js` while the `tel:` href came from the database, so the two
  could silently disagree.

---

## MCP server (9 tools)

`https://mcp.wolfcreeklodge.us/sse`. Returns 404 at `/`, which is normal.

| Tool | State |
|---|---|
| `search_properties` | existing |
| `get_property_details` | existing |
| `get_pricing` | **rewritten.** Takes `check_in`/`check_out` for a real dated quote with per-night breakdown and min-stay compliance. Now quotes direct rates; it previously returned stored base rates and undercut the published website price. |
| `check_availability` | existing |
| `get_area_info` | existing |
| `get_host_info` | existing |
| `get_booking_link` | existing |
| `get_rate_calendar` | **new.** Whole ladder in one call, so an agent can suggest cheaper adjacent dates instead of probing date by date. |
| `get_winter_info` | **new.** Sourced winter facts, events, and the Highway 20 constraint. |

Server instructions now state the exclusion constraint and the winter road constraint up front.

---

## Known broken / stubbed

1. **~~`wcl-crm` does not build~~ -- fixed 2026-08-25.** The recorded diagnosis (missing
   `./pages/GuestDetail` import) was stale: `src/pages/GuestDetail.jsx` is present and the image
   builds clean. What was actually broken was the login path. See "CRM and email sync" below.
2. **The photo layer is stubs.** `website/lib/photos.js`, `PhotoHero.js`, `PhotoGallery.js`,
   `FullBleedImage.js` are tracked as of 2026-08-25 so `main` builds, but they are stubs written on
   migration day. Real versions are on the dead disk. Most photos still declare a placeholder
   1920x1080; the ones added or replaced on 2026-08-25/26 (the aerial, the arrival map, the
   apartment hero, bathroom, entry and living-dining) carry real measured dimensions. Alt text is
   written per photo.
   `getListingPhotos()` returned a bare `[]` while `listings/[id]/page.js` reads `photos.hero`
   and `photos.gallery.length`, so all three listing pages threw and returned 500. Fixed
   2026-08-25: it returns `{ hero, gallery }` per SKU and wires up the previously unreferenced
   `public/images/apartment/` set.
3. **The arrival map is not actually private.** `/arrival/{token}` gates the *page*, but the
   map itself is a static file under `website/public/`, so
   `https://wolfcreeklodge.us/images/arrival/directions-map.webp` returns 200 to anyone who
   guesses the path, token or no token. The 12 MB `-original.png` beside it is exposed the same
   way. This defeats the point of the token gate. Deliberately left open 2026-08-26; the fix is to
   move both files out of `public/` into a directory the server does not publish, stream them
   through a token-checked route, and add that directory to the Dockerfile copy.

4. **~58 photos missing.** 142 of roughly 200 recovered. Find the gaps empirically: load the site
   with DevTools open, filter Network by status 404, and note the filenames the code expects.
5. **Six recovered photos may be HEIC** (from the `iOS/` subfolder). Convert if rendering fails.
6. **Sync workers run but are idle** (checked 2026-08-25, resolving the old "unverified" item):
   - `init.sql` did seed the three properties. That part is fine.
   - **iCal sync does nothing:** no property has `ical_import_url` set (the column is
     `ical_import_url`, not `airbnb_ical_url`). `reservations` is empty and `ical_sync_log`
     has zero rows, so availability shown anywhere is not real.
   - **~~Email sync is still unauthorized~~ -- working as of 2026-08-25.** 200 messages synced,
     Jun 1 to Aug 26. Seeded by signing in at `/availability` on the website, not the CRM. See
     "CRM and email sync". `guest_id` is null on all 200 because `guests` is empty; matching
     will start working once real bookings exist.

7. **`sharp` is missing from the website image.** Next.js standalone logs "sharp is required ...
   for image optimization" plus `EACCES: mkdir '/app/.next/cache'` on every optimized image.
   Images still serve 200, so this is a performance and caching problem, not an outage. Add
   `sharp` to the website dependencies and give the runtime a writable `.next/cache`.

8. **`mcp-server/requirements.txt` needed an upper bound.** It pinned `mcp[cli]>=1.0.0`; a fresh
   resolve on 2026-08-25 pulled mcp 2.x, where `FastMCP` became `MCPServer`, and the container
   crash-looped. Now `mcp[cli]>=1.0.0,<2` (running 1.29.1). Migrating `server.py` to the 2.x
   API is still open work.

---

## Open tasks, most leverage first

1. **Recover the Pintea-Ubuntu disk.** A $15 USB-to-SATA/NVMe adapter. It holds the real photo
   components, the complete photo set, the original `.env`, and a 1011K `pg_dump` with booking and
   CRM history. Still the single highest-leverage action in this project.
2. **Run `backup-wcl-assets.ps1`.** `website/public` (549 MB), `cloudflared/` and `.env`
   are the only copies in existence and they sit inside a git working tree. The script now takes
   `-Dest` and `-SkipSecrets` (added 2026-08-25) so the two halves can go to different places:

   ```powershell
   # photos offsite to personal OneDrive -- marketing assets, safe to sync
   .\backup-wcl-assets.ps1 -Dest "$env:OneDriveConsumer\wcl-assets" -SkipSecrets

   # .env and cloudflared/ stay local, off any cloud-synced folder
   .\backup-wcl-assets.ps1
   ```

   This machine's OneDrive is a **personal** Microsoft account (`OneDriveConsumer` is set,
   `OneDriveCommercial` is empty), which satisfies the "personal remote, not the corporate Drive
   Gearbox uses" rule. Do not drop `.env` or `cloudflared/` into it in plaintext -- those are live
   production credentials, and per item 4 below they are already exposed and unrotated.

   **Never move the repo itself into OneDrive.** Docker bind mounts plus file-level cloud sync
   against a live `.git` is a corruption route, not a backup.

3. **Watch the winter ladder against real bookings.** `03` and `04` are applied as of
   2026-08-25, as written. They went in without the occupancy check the original decision rule
   called for, because `reservations` is empty -- there is no booking history on this database to
   check against. That makes the level an assumption, not a finding. The two numbers most worth
   revisiting once enquiries start arriving:
   - the **4-night minimum on the Christmas corridor**, where the published valley norm is a flat
     2 nights and 3 is the defensible retreat;
   - the **$1,095 base** for that corridor, which is roughly 2x the shoulder rate.

   Rollback is still one statement: `DELETE FROM property_rates; DELETE FROM rate_seasons;`

4. **Rotate the two exposed secrets.** `MICROSOFT_CLIENT_SECRET` and `ANTHROPIC_API_KEY` were
   pasted through a chat as a Parsec-clipboard workaround on migration day and have not been
   rotated. `MIGRATION-NOTES.md` has the exact steps.
5. **~~Log into the CRM~~ -- done. Email sync is live and the CRM is published.** On the owner's
   call the `crm.wolfcreeklodge.us` route was re-added 2026-08-26, reversing the earlier
   localhost-only recommendation. The tradeoff stands and is worth restating: this is an admin
   tool holding guest records, payment status and read access to the mailbox. Its protection is
   Microsoft OAuth plus `CRM_ALLOWED_EMAILS`, which now fails closed. `DEV_BYPASS_AUTH` must
   stay `false`; with a public route a stray `true` exposes the CRM outright.
6. **Fix the CRLF situation.** `core.autocrlf` is unset, so the working tree is CRLF while the
   blobs are LF and `git status` reports 80-plus modified files with ~17,000 phantom line changes.
   With `--ignore-all-space` there are none left. A `.gitattributes` with `* text=auto eol=lf`
   plus one renormalize commit churns every file once and then never again. Files committed on
   2026-08-25 are already LF.
7. **Automated offsite database backup.** No offsite exists. Either a Task Scheduler `pg_dump` +
   `rclone`, or a dedicated `wcl-backup` compose service.
8. **Blog infrastructure.** There is no posts table and no `/blog` route, so the PRD's personality
   agents (the Powder Hound for winter) have nowhere to publish. `/winter` carries the seasonal
   content in the meantime.
9. **Smithery registration.** Blocked on namespace issues since before the migration.

---

## Gotchas worth not rediscovering

- **PowerShell `Set-Content` writes Windows-1252, not UTF-8.** Any non-ASCII character (em dash,
  smart quote) becomes an invalid UTF-8 byte and webpack's Rust-based SWC rejects the file outright.
  Keep generated source and SQL ASCII-only. Where you must write from PowerShell, use
  `[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding $false))`
  with an absolute path.
- **.NET file APIs ignore PowerShell's working directory.** They use the process's current
  directory. Always pass absolute paths.
- **Cloudflare dashboard config overrides the local `config.yml`.** See the tunnel section.
- **Compose services reach each other by service name, not `localhost`.**
- **`EAI_AGAIN` on a service name that should resolve, in a previously healthy container network,
  is a hardware-degradation signal.** That is what preceded the Pintea-Ubuntu kernel panic by hours.
- **Git writes from a Cowork device session are awkward.** The device bridge cannot unlink files, so
  every git command touching the index or HEAD leaves a `.lock` that blocks the next one. Move any
  `.git/*.lock` aside immediately before each git command, and do not run `git status` between an
  `add` and a `commit`. Working in Claude Code locally avoids this entirely.
- **This repo has a deny-list.** `.claude/settings.local.json` denies `git clean`, `git restore`,
  `git reset --hard`, `rm -rf` and the Docker volume-destroying commands, because 520 MB of
  irreplaceable photos and the tunnel credentials are untracked inside this working tree.
  Branch-switching `git checkout <branch>` is untouched.

---

## Companion documents

| Doc | What it is |
|---|---|
| `CLAUDE.md` | agent context: host, stack, conventions, workflow |
| `wolf-creek-lodge-prd.md` | design intent, the full agent architecture, expansion roadmap |
| `MIGRATION-NOTES.md` (Claude project) | the 2026-05-26 migration, what was lost, what was reconstructed |
| `WINTER-2026-27.md` (Claude project) | the winter rate ladder, the comps research, the decision rule |
| `TWO-STACKS-OPERATING-GUIDE.md` (Claude project) | running this and Gearbox on one machine |
| `SERVER-SETUP.docx` (Claude project) | operational reference, still describes Pintea-Ubuntu, needs a rewrite |
