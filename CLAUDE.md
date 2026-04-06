# Wolf Creek Lodge — Project Context

## What This Is

An open-source, agent-driven vacation rental platform replacing Airbnb/VRBO. Two physical properties at Wolf Ridge Resort in Winthrop, WA, sold as three bookable SKUs.

**Owner:** Bo Pintea (@bopintea)
**Domain:** https://wolfcreeklodge.us
**MCP endpoint:** https://mcp.wolfcreeklodge.us/sse
**Repo:** https://github.com/wolfcreeklodge/wolf-creek-lodge
**Target launch:** May 2026
**Revenue goal:** $45,000–$50,000/year net

## Properties (Three SKUs)

| SKU | Bedrooms | Description |
|-----|----------|-------------|
| The House | 3 | Main house with full kitchen and mountain views |
| The Apartment | 1 | Private suite above the garage |
| The Retreat | 4 | Both units combined as a single booking |

**Booking constraint:** These are mutually exclusive. Booking the House or Apartment blocks the Retreat for those dates, and vice versa. The system must enforce this in real time.

## Infrastructure

- **Server:** Pintea-Ubuntu, on-premises at the property
- **LAN IP:** 192.168.1.155 (static via DHCP reservation, MAC a4:ae:12:69:fe:77)
- **Tailscale IP:** 100.65.136.20
- **Docker:** 28.2.2 with NVIDIA T4 GPU (CUDA 13.0)
- **OS:** Ubuntu with unattended-upgrades enabled
- **Networking:** Cloudflare tunnel "wolfcreek" routes traffic to the server
  - wolfcreeklodge.us → localhost:8080 (website)
  - mcp.wolfcreeklodge.us → localhost:8081 (MCP server)

### Cloudflare Tunnel Config

The tunnel config lives at `/etc/cloudflared/config.yml`. There is NO Nginx or Caddy reverse proxy. The dashboard alone is insufficient — the local config file must also be edited. More-specific hostnames go before less-specific ones. Restart with `sudo systemctl restart cloudflared` after edits.

## Running Services (Docker Compose)

| Container | Port | Image | Status |
|-----------|------|-------|--------|
| wcl-website | 8080 → 3000 | Next.js 14 | ✅ Running |
| wcl-mcp-server | 8081 → 8081 | Python SSE | ✅ Running |
| wcl-database | 5432 | PostgreSQL 16 Alpine | ✅ Running |

Start everything: `docker compose up -d --build website database mcp-server`

The CRM container exists in docker-compose.yml but has a build error (missing `./pages/GuestDetail` import). Skip it for now.

## Tech Stack

- **Website:** Next.js 14 (App Router), React 18
- **Database:** PostgreSQL 16
- **MCP Server:** Python with SSE transport
- **Containerization:** Docker + Docker Compose
- **Styling:** Custom CSS with earth-tone design system (no Tailwind)
- **Fonts:** Playfair Display (display), Source Sans 3 (body)
- **Auth:** OAuth 2.0 (Google, Microsoft) — not yet implemented

## Design System

Methow Valley-inspired warm earth tones:

```css
--color-timber: #2C1810;    /* darkest brown */
--color-saddle: #5C3A21;    /* dark brown */
--color-rawhide: #A67B5B;   /* medium brown */
--color-wheat: #D4B896;     /* light tan */
--color-parchment: #F2E8D9; /* off-white warm */
--color-snow: #FAF7F2;      /* background */
--color-pine: #2D4A3E;      /* dark green */
--color-creek: #4A7C6F;     /* teal green */
--color-dusk: #8B4E6A;      /* plum accent */
--color-ember: #C7522A;     /* rust/orange */
--color-gold: #D4A333;      /* gold accent */
```

## MCP Server Tools (7 tools)

- `search_properties` — list available properties
- `get_property_details` — details for a specific SKU
- `get_pricing` — dynamic pricing for dates
- `check_availability` — real-time availability check
- `get_area_info` — Methow Valley activities and info
- `get_host_info` — about the host
- `get_booking_link` — direct booking URL

## Website Routes

- `/` — Home (featured Retreat + property cards)
- `/listings/wolf-creek-retreat-combo` — 4BR Retreat detail
- `/listings/wolf-creek-lodge` — 3BR House detail
- `/listings/wolf-creek-apartment` — 1BR Apartment detail
- `/area` — Methow Valley activities
- `/about` — Host profile
- `/contact` — Contact form

## Static Assets

The `website/public/` directory is currently empty (just `.gitkeep`). Images need to be added for property photos, hero banners, and gallery pages.

## Git Workflow

- Push from whichever machine has changes (server or Yoga laptop)
- Server needs a GitHub Personal Access Token for pushing (no SSH keys set up)
- The Yoga laptop (Windows, PowerShell) has git configured under user `bopintea`
- Note: PowerShell `curl` is an alias for `Invoke-WebRequest` — use `curl.exe` for real curl behavior

## Architecture Philosophy

There is no traditional frontend/backend split. The system is:
1. A single database (ground truth)
2. A collection of specialized agents that read/write to the database
3. A human-facing website (one interface to the data)
4. An MCP endpoint (another interface, for AI agents)

## Planned Agents (not yet built)

- **Guardian** — booking validation, rate limiting, abuse detection
- **Pricing (Scout)** — dynamic pricing based on competitor supply/demand
- **Manager** — orchestrates agents toward revenue target
- **Finance** — tracks expenses, forecasts revenue
- **Marketing Orchestrator** — monitors local news/events, assigns content campaigns
- **Content Personalities:**
  - The Wrangler (rodeo, Wild West, summer)
  - The Trailblazer (hiking, biking, PCT, summer/fall)
  - The Powder Hound (skiing, snowshoeing, winter)
- **CRM** — guest intelligence, booking history, lead generation
- **Documentation** — maintains docs, engages dev community

## Marketing Strategy (priority order)

1. Programmatic SEO — targeted landing pages for "best X for Y" queries
2. Answer engine optimization — structured content for AI-generated answers
3. MCP server as distribution channel (already live)
4. Free tool — e.g. Methow Valley trip planner
5. Niche newsletter acquisition
6. Content automation via personality agents
7. Shareable output moments

## Key Learnings / Gotchas

- Cloudflare tunnel requires BOTH dashboard config AND `/etc/cloudflared/config.yml` edit
- More-specific hostnames must come before less-specific in ingress rules
- `service: http_status:404` is always the last catch-all rule
- PowerShell `curl` ≠ real curl. Use `curl.exe` on Windows.
- Empty directories don't survive git — use `.gitkeep`
- Docker multi-stage builds fail if COPY references missing dirs — use glob patterns (e.g., `COPY --from=builder /app/public* ./public/`)
- The server auto-restarts on power loss (BIOS: State After G3 = S0)

## What's Next

- Add property photos to the website
- Build booking schema and availability calendar
- Implement payment processing
- Guest accounts with OAuth
- Build the Guardian agent
- iCal sync with Airbnb/VRBO for transition period
- Programmatic SEO pages for the blog

## Full PRD

See `wolf-creek-lodge-prd.md` in the project root for complete product requirements.
