# Wolf Creek Lodge - implementation status

**Last updated:** 2026-08-25 (**Winter 2026/27 shipped to the repo.** Seasonal rate-calendar
schema, a sourced winter guide at `/winter`, and a real agent surface (JSON-LD, `/llms.txt`,
two new MCP tools, date-aware `get_pricing`). The proposed winter rate ladder is committed but
**deliberately not applied** to the database, pending a decision on rate level. Same-day repo
hygiene: the May migration topology is finally committed, the photo stubs are tracked so `main`
builds from a clean clone, and this repo now carries its own destructive-command deny-list.)

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

Rates are flat year-round today. Stored rates are Airbnb parity; the site adds `DIRECT_MARKUP`
(10 percent) on render. Superhost, 4.93 average across 46 reviews.

---

## Services running

All via `docker-compose.yml` at project root. Bring up with
`docker compose up -d database website mcp-server ical-sync email-sync cloudflared`
(note `crm` is excluded, see Known broken).

| Container | Build | Host binding | Notes |
|---|---|---|---|
| `wcl-database` | `postgres:16-alpine` | expose 5432 only | volume `pgdata` -> `wolf-creek-lodge_pgdata` |
| `wcl-website` | `./website` | `127.0.0.1:8080` -> 3000 | Next.js 14 App Router, `output: standalone` |
| `wcl-mcp-server` | `./mcp-server` | `127.0.0.1:8081` | Python FastMCP, SSE transport, serves at `/sse` only |
| `wcl-crm` | `./crm` | `127.0.0.1:8082` -> 3000 | **BROKEN BUILD**, do not start |
| `wcl-ical-sync` | `./scripts` (`sync-ical.mjs`) | none | pulls Airbnb iCal into `reservations` |
| `wcl-email-sync` | `./scripts` (`Dockerfile.email-sync`) | none | Microsoft Graph -> `emails` |
| `wcl-cloudflared` | `cloudflare/cloudflared:latest` | none | mounts `./cloudflared` read-only |

### Cloudflare tunnel

Tunnel `wolfcreek`, id `87038840-5431-494c-9a71-6b33251bd799`.

**Ingress is DASHBOARD-managed, not `config.yml`-managed.** The local `cloudflared/config.yml`
exists but is overridden by server-side routes pushed at connection time. For routing changes edit
one.dash.cloudflare.com -> Networks -> Tunnels -> wolfcreek -> Public Hostname. The local file is
documentation only. (Older notes in `CLAUDE.md` said the opposite; the migration disproved it.)

Routes: `wolfcreeklodge.us` -> `website:3000`, `mcp.wolfcreeklodge.us` -> `mcp-server:8081`.
The `crm.wolfcreeklodge.us` route was deleted deliberately, better a clean 404 than a broken
backend. Routes must use the compose service name, not `localhost`; inside the cloudflared
container `localhost` is the container itself.

---

## Database schema

Applied automatically on first compose-up via `/docker-entrypoint-initdb.d/`:

| File | Contents | Applied? |
|---|---|---|
| `database/init.sql` | `site_config`, `properties`, `guests`, `reservations`, `payments`, `activity_log`, `ical_sync_log`, `sessions` + the overlap and cross-property exclusivity triggers | yes |
| `database/02-email-sync.sql` | `email_sync_state`, `emails` | yes |
| `database/03-rate-calendar.sql` | `rate_seasons`, `property_rates` + `resolve_season`, `is_weekend_night`, `resolve_nightly_rate`, `quote_stay`, `required_min_nights` | **NOT YET** |
| `database/04-winter-2026-27-rates.sql` | the proposed winter ladder + minNights and beds fixes | **NOT YET** |

`03` is structure only and changes no price. It falls back to `properties.pricing` for any night no
season covers, so it is safe to apply at any time. `04` is the decision.

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
| `/listings/[id]` | dynamic | per-SKU detail |
| `/llms.txt` | dynamic | **new.** Agent brief, generated from the same rows the site reads |
| `/robots.txt`, `/sitemap.xml` | **new** | |
| `/api/availability`, `/api/auth/[action]`, `/api/admin/bookings`, `/api/admin/blocks`, `/api/ical/[token]` | route handlers | |

All pages carry a schema.org `@graph`: `LodgingBusiness` + three `VacationRental` nodes with 11
seasonal `Offer` nodes each (once `03`/`04` are applied) and `eligibleQuantity` minimum stay. The
three-SKU exclusion constraint is written out in plain language in every node description, because
no vacation-rental schema can express it.

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

1. **`wcl-crm` does not build.** Missing `./pages/GuestDetail` import. Either restore the file
   (it may be on the Pintea-Ubuntu disk) or remove the reference. Its Cloudflare route is deleted
   until it builds.
2. **The photo layer is stubs.** `website/lib/photos.js`, `PhotoHero.js`, `PhotoGallery.js`,
   `FullBleedImage.js` are tracked as of 2026-08-25 so `main` builds, but they are stubs written on
   migration day. Real versions are on the dead disk. Alt text and dimensions are placeholders.
3. **~58 photos missing.** 142 of roughly 200 recovered. Find the gaps empirically: load the site
   with DevTools open, filter Network by status 404, and note the filenames the code expects.
4. **Six recovered photos may be HEIC** (from the `iOS/` subfolder). Convert if rendering fails.
5. **Unverified since 2026-05-26** (no Docker reachable from a Cowork session, so these need a
   human at the machine): whether Microsoft OAuth re-auth happened and email-sync stopped 401ing;
   whether iCal sync is populating bookings; whether `init.sql` seeded the three properties with
   their Airbnb iCal URLs.

---

## Open tasks, most leverage first

1. **Recover the Pintea-Ubuntu disk.** A $15 USB-to-SATA/NVMe adapter. It holds the real photo
   components, the complete photo set, the original `.env`, and a 1011K `pg_dump` with booking and
   CRM history. Still the single highest-leverage action in this project.
2. **Run `backup-wcl-assets.ps1`.** `website/public` (519 MB, 142 photos), `cloudflared/` and
   `.env` are the only copies in existence and they sit inside a git working tree. The script
   copies them to `C:\wcl-assets`, outside git, and points at rclone for offsite. Use a personal
   B2/S3 remote, not the corporate Drive Gearbox uses; guest data has different residency
   requirements. This is the local half of `MIGRATION-NOTES.md` item 6.
3. **Decide the winter rate level, then apply `03` and `04`.** The gating input is last winter's
   occupancy:
   ```
   docker exec wcl-database psql -U wolfcreek -d wolfcreek -c "SELECT property_id, count(*) AS bookings, sum(check_out - check_in) AS nights FROM reservations WHERE status NOT IN ('cancelled','no_show') AND check_in < '2026-04-01' AND check_out > '2025-12-01' GROUP BY property_id;"
   ```
   At or above 55 percent, apply the ladder as written. Between 40 and 55, apply it and take
   another 8 to 10 percent off Sun-Thu in January core and late winter. Below 40, the level is
   wrong and not just the shape: cut base winter 15 to 20 percent and keep the peak premiums.
   The most contestable single number is the 4-night minimum on the Christmas corridor; the
   published valley norm is a flat 2 nights, and 3 is the defensible retreat.
4. **Rotate the two exposed secrets.** `MICROSOFT_CLIENT_SECRET` and `ANTHROPIC_API_KEY` were
   pasted through a chat as a Parsec-clipboard workaround on migration day and have not been
   rotated. `MIGRATION-NOTES.md` has the exact steps.
5. **Fix `wcl-crm`**, then re-add its Cloudflare route.
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
