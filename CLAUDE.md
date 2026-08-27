# Wolf Creek Lodge - project context

**Read `STATUS.md` first.** It is the live implementation state. This file is the stable stuff:
host, stack, conventions, and the traps.

## What this is

An open-source, agent-driven vacation rental platform replacing Airbnb/VRBO dependence. Two
physical properties at Wolfridge Resort in Winthrop, WA, sold as three bookable SKUs.

**Owner:** Bo Pintea (@bopintea)
**Public brand:** Wolfcreek Lodge (the name on the sign at the house, and the name on the
Google Business Profile as of 2026-08-26). Renamed from "Wolfridge Retreats", which was one
word from **Wolfridge Resort** -- the neighbouring business, a claimed 3-star hotel listing.
That resort is a separate company at 14 Lucky Louie Road; keep the two identities distinct.
**Domain:** https://wolfcreeklodge.us
**MCP endpoint:** https://mcp.wolfcreeklodge.us/sse
**Repo:** https://github.com/wolfcreeklodge/wolf-creek-lodge
**Revenue goal:** $45,000 - $50,000/year net

## Properties (three SKUs)

| SKU | id | Bedrooms | Sleeps |
|-----|----|----------|--------|
| The House | `wolf-creek-lodge` | 3 | 9 |
| The Apartment | `wolf-creek-apartment` | 1 | 2 |
| The Retreat | `wolf-creek-retreat-combo` | 4 | 10 |

**Booking constraint:** mutually exclusive. Booking the House or Apartment blocks the Retreat for
those dates and vice versa. Enforced in the database by the `check_cross_property_overlap` trigger,
not by application code. A conflicting insert raises, it does not silently succeed.

This constraint is the single fact most likely to be got wrong by anything reading the data, and no
vacation-rental schema can express it, so it is also written out in plain language in the JSON-LD
descriptions, in `/llms.txt`, and in the MCP server instructions.

## Infrastructure

- **Host:** ThinkPad X1 in Seattle. Windows + Docker Desktop. Repo at `C:\wolf-creek-lodge`.
- **Not** on-premises at the property any more. The previous host (Pintea-Ubuntu, Ubuntu + NVIDIA
  T4, physically at Wolfridge) died on 2026-05-26 from a kernel panic consistent with multi-bit RAM
  failure. Its disk is still unrecovered. Anything in older docs about that machine, its LAN
  address, or its GPU is historical.
- **Cohabits Docker Desktop with the Gearbox stack** at `C:\gearbox`. They do not collide:
  Gearbox owns 5432 / 8000 / 5173, this project owns 8080 / 8081 / 8082 and publishes no database
  port at all. Compose project names are pinned in both (`wolf-creek-lodge`, `gearbox`) so a folder
  rename cannot orphan a volume.
- **Networking:** Cloudflare tunnel `wolfcreek` is the only path in. Every HTTP service binds
  `127.0.0.1`, so Tailscale peers cannot reach them directly.

### Cloudflare tunnel: dashboard-managed

Routes live at one.dash.cloudflare.com -> Networks -> Tunnels -> wolfcreek -> Public Hostname.
They are stored server-side and pushed to the agent at connection time, **overriding the local
`cloudflared/config.yml`**. To change routing, edit the dashboard. The local file is documentation
and backup only.

Routes must target the compose **service name** (`website:3000`, `mcp-server:8081`). Inside the
cloudflared container, `localhost` is that container.

Earlier revisions of this file claimed the local config was also required. That was wrong and the
May migration disproved it.

## Tech stack

- **Website:** Next.js 14 App Router, React 18, `output: standalone`
- **Database:** PostgreSQL 16 Alpine
- **MCP server:** Python, FastMCP, SSE transport
- **Sync workers:** Node ESM scripts in `scripts/` (`sync-ical.mjs`, `sync-email.mjs`)
- **Styling:** hand-written CSS with an earth-tone design system, no Tailwind
- **Fonts:** Playfair Display (display), Source Sans 3 (body)
- **Auth:** Microsoft OAuth via `@azure/msal-node` + `iron-session`

## Design system

Methow Valley warm earth tones, defined at the top of `website/app/globals.css`. Use the tokens,
do not introduce new literals.

```css
--color-timber: #2C1810;    --color-pine: #2D4A3E;
--color-saddle: #5C3A21;    --color-creek: #4A7C6F;
--color-rawhide: #A67B5B;   --color-dusk: #8B4E6A;
--color-wheat: #D4B896;     --color-ember: #C7522A;
--color-parchment: #F2E8D9; --color-gold: #D4A333;
--color-snow: #FAF7F2;
```

## Pricing model

Stored rates are **Airbnb parity**. The site quotes direct guests at parity plus `DIRECT_MARKUP`
(10 percent), defined once in `website/lib/pricing.js`. Never reintroduce a bare `1.1` in a page
component; that is how the Retreat weekend rate ended up advertised $105 below the model.

Seasonal rates resolve through `rate_seasons` + `property_rates` with a deterministic precedence
rule. Everything degrades to `properties.pricing` when the rate calendar is absent, so the site
renders whether or not the migration has been applied. Both the site and the MCP server read
through the same resolver, so a human and an agent always see the same number.

## Architecture philosophy

There is no frontend/backend split. The system is:

1. A single database (ground truth)
2. Specialized agents that read and write to it
3. A human-facing website, which is one interface to the data
4. An MCP endpoint, which is another interface, for agents

The website is not privileged over the MCP endpoint. If a fact is only reachable by parsing HTML,
that is a bug.

## Conventions and traps

- **ASCII only in generated source and SQL.** PowerShell `Set-Content` writes Windows-1252, so any
  em dash or smart quote becomes an invalid UTF-8 byte and webpack's Rust-based SWC rejects the
  file. If you must write from PowerShell:
  `[System.IO.File]::WriteAllText($abs, $text, (New-Object System.Text.UTF8Encoding $false))`.
  Note .NET file APIs ignore PowerShell's working directory, so pass absolute paths.
- **`curl` in PowerShell is `Invoke-WebRequest`.** Use `curl.exe`.
- **`core.autocrlf` is unset**, so `git status` reports 80-plus modified files that are pure line
  endings. Use `git diff --ignore-all-space` to see real changes until this is fixed. Files
  committed from 2026-08-25 onward are LF.
- **This repo has a deny-list** at `.claude/settings.local.json`: `git clean`, `git restore`,
  `git reset --hard`, `rm -rf`, and Docker volume destruction are denied. This is not bureaucracy.
  `website/public` holds 519 MB of photos that exist nowhere else, `cloudflared/` holds the tunnel
  credentials, and `.env` was reconstructed by hand; all three are untracked or gitignored inside
  this working tree, so a single `git clean -fdx` ends the project. Branch-switching
  `git checkout <branch>` is deliberately still allowed.
- **Empty directories do not survive git.** Use `.gitkeep`.
- **Docker multi-stage builds fail if COPY references a missing dir.** Use glob patterns, e.g.
  `COPY --from=builder /app/public* ./public/`.
- **One project per session.** Do not connect both this folder and `C:\gearbox` to the same agent
  session. See `TWO-STACKS-OPERATING-GUIDE.md` in the Claude project.

## Common commands

```powershell
cd C:\wolf-creek-lodge

# Bring up the whole stack (crm builds and runs again as of 2026-08-25)
docker compose up -d

docker compose ps
docker compose logs --tail 30 <service>
docker compose up -d --build website          # after a code change
docker compose up -d --force-recreate website # after a .env change

docker exec wcl-database psql -U wolfcreek -d wolfcreek
docker exec wcl-database psql -U wolfcreek -d wolfcreek -c "\dt"

# Apply a migration
docker exec -i wcl-database psql -U wolfcreek -d wolfcreek < database\03-rate-calendar.sql

# Protect the irreplaceable assets
powershell -ExecutionPolicy Bypass -File .\backup-wcl-assets.ps1
```

## Git workflow

Single machine now, so no cross-host push dance. `main` tracks
`github.com/wolfcreeklodge/wolf-creek-lodge`; pushing needs a GitHub PAT, there are no SSH keys.
The Gearbox repo has no remote at all, so there is no token to confuse between the two projects.

## Planned agents (not built)

Guardian (booking validation, rate limiting, abuse detection), Pricing/Scout (competitor
supply-demand), Manager (orchestrates toward the revenue target), Finance, Marketing Orchestrator,
and three content personalities: The Wrangler (rodeo, Wild West, summer), The Trailblazer (hiking,
biking, summer/fall), The Powder Hound (skiing, winter). Plus CRM and Documentation agents.

Blog infrastructure does not exist yet (no posts table, no `/blog` route), so the personality agents
have nowhere to publish. `/winter` carries seasonal content in the meantime.

## Marketing strategy, priority order

1. Programmatic SEO, targeted landing pages for "best X for Y" queries
2. Answer engine optimization, structured content for AI-generated answers
3. The MCP server as a distribution channel (already live)
4. A free tool, e.g. a Methow Valley trip planner
5. Niche newsletter acquisition
6. Content automation via the personality agents
7. Shareable output moments

## Full PRD

`wolf-creek-lodge-prd.md` at the project root.
