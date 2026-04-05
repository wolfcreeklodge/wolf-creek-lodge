# Wolf Creek Lodge — Product Requirements Document

## Project Overview

Wolf Creek Lodge is an open-source, agent-driven vacation rental platform that serves both human visitors and AI booking agents. The platform manages two properties at Wolf Ridge Resort in Winthrop, WA, with a roadmap to expand across the 17-property HOA. The system replaces dependency on Airbnb/VRBO with a self-hosted, intelligent booking infrastructure.

**Owner:** Bo Pintea
**Location:** Wolf Ridge Resort, Winthrop, WA (Methow Valley)
**Target Launch:** May 2026
**Financial Goal:** $45,000–$50,000 annual net profit
**License:** Fully open source (GitHub)
**Hosting:** Self-hosted Ubuntu server with NVIDIA T4 GPU, on-premises at the property

---

## Properties

The platform manages three bookable SKUs derived from two physical units:

| SKU | Description | Bedrooms |
|-----|-------------|----------|
| **House** | Three-bedroom main house | 3 |
| **Apartment** | One-bedroom apartment above garage | 1 |
| **Wolf Creek Lodge (Retreat)** | Combined house + apartment as a single booking | 4 |

### Booking Constraint Logic

These three SKUs share a mutual exclusion constraint:

- If the **House** is booked → the **Retreat** (combined) must be blocked for overlapping dates
- If the **Apartment** is booked → the **Retreat** (combined) must be blocked for overlapping dates
- If the **Retreat** is booked → both **House** and **Apartment** must be blocked for overlapping dates
- The system must enforce these constraints in real time before confirming any booking

---

## Architecture

### Philosophy

There is no traditional frontend/backend split. The system consists of:

1. **A single database** (the ground truth) containing bookings, guest records, pricing, and configuration
2. **A collection of specialized agents** that read from and write to the database
3. **A human-facing website** (also served from the system) that is one of many interfaces to the same data
4. **An MCP endpoint** that allows external AI agents to discover, query, and book properties

### Container Architecture

Each major concern runs in its own container, orchestrated via Docker Compose (or similar):

| Container | Purpose |
|-----------|---------|
| **database** | PostgreSQL — single source of truth for bookings, guests, pricing, content |
| **website** | Human-facing web application (property info, booking flow, blog, guest accounts) |
| **mcp-server** | MCP (Model Context Protocol) endpoint for AI agent discovery and booking |
| **guardian-agent** | Vets incoming bookings, authenticates guests, detects abuse |
| **pricing-agent** | Dynamic pricing based on regional demand signals |
| **manager-agent** | Orchestrates all agents toward the $45–50K annual profit target |
| **finance-agent** | Tracks expenses, forecasts revenue, reports financial health |
| **marketing-orchestrator** | Monitors news/events, assigns campaigns to personality agents |
| **content-agents** | Multiple personality-driven agents for content creation and social engagement |
| **documentation-agent** | Maintains project docs, engages developer community |
| **message-bus** | Inter-agent communication (Redis Pub/Sub, RabbitMQ, or similar) |

### Inter-Agent Communication

Agents communicate asynchronously through a message bus. Candidates to evaluate:

- **Redis Pub/Sub** — lightweight, good for low-to-medium volume
- **RabbitMQ** — more robust routing and queuing
- **Kafka** — likely overkill for initial scale, but consider for future multi-property expansion

All agents read from and write to the PostgreSQL database. The message bus handles coordination, event notifications, and task delegation — not data persistence.

### Backup Strategy

- Automated database snapshots on a schedule
- Offsite backup to cloud storage (S3, Backblaze B2, or similar)
- Critical requirement: the on-premises server is a single point of failure — offsite backups are non-negotiable

---

## Agent Specifications

### 1. Guardian Agent

**Role:** Security and booking validation

**Capabilities:**
- Validates all incoming booking requests (from both humans and AI agents)
- Rate-limits requests to prevent abuse
- Verifies requesting agent legitimacy (for AI-to-AI bookings)
- Detects anomalous booking patterns (suspicious dates, repeated failed attempts, potential scams)
- Enforces the three-SKU mutual exclusion constraint
- Can require OAuth authentication (Google or Microsoft) if a request is flagged as suspicious
- Ensures no agent-to-agent negotiation results in unauthorized discounts or terms

**Design Principle:** Defensive by default. Assume incoming agents may attempt to exploit pricing, double-book, or extract unauthorized deals.

### 2. Pricing Agent (Scout)

**Role:** Dynamic pricing optimization

**Capabilities:**
- Monitors competitor property availability across the Methow Valley corridor (Winthrop, Mazama, Twisp) and Lake Chelan (~45 min away)
- Adjusts nightly rates based on regional supply/demand signals
- When regional inventory is scarce → increase prices
- When regional inventory has slack → lower prices or trigger promotions
- Feeds pricing recommendations to the manager agent for approval

**Data Sources (TO DO — requires further investigation):**
- Airbnb/VRBO public listing calendars (iCal feeds or scraping — legal/technical constraints TBD)
- Methow Valley reservation services
- Local event calendars (rodeos, festivals, ski season)
- Historical booking data from own database

**Design Principle:** Configurable aggressiveness dial for competitive intelligence gathering.

### 3. Manager Agent

**Role:** Revenue orchestration and agent coordination

**Capabilities:**
- Sets and tracks progress toward the annual $45–50K net profit goal
- Coordinates all other agents: adjusts pricing strategy, marketing intensity, and booking policies based on current financial trajectory
- Monitors seasonal patterns and ensures readiness for peak periods (winter ski season, Memorial Day rodeo, Labor Day rodeo)
- Escalates decisions that require human judgment
- Balances revenue maximization with property safety constraints

### 4. Finance Agent

**Role:** Financial tracking and forecasting

**Capabilities:**
- Tracks all revenue and expenses
- Forecasts monthly and annual revenue based on current booking pace
- Reports financial health to the manager agent
- Alerts when revenue is behind target (triggers marketing/pricing adjustments)
- Initially a reporting/forecasting tool — gradually takes on more automation over time

**Note:** Bo's wife (an accountant) will handle payment processing and financial operations initially. The finance agent starts as her assistant and progressively assumes more responsibility as trust is established. Detailed financial requirements will be developed collaboratively with her.

### 5. Marketing Orchestrator Agent

**Role:** Campaign coordination and news monitoring

**Capabilities:**
- Monitors Methow Valley News, City of Winthrop website, local event calendars, and social media
- Identifies content opportunities and assigns them to the appropriate personality agent
- Ensures personality agents don't overlap or contradict each other
- Tracks engagement metrics across all channels (website, Instagram, TikTok)
- When calendar has slack → triggers promotional campaigns using CRM guest list
- Feeds engagement data back to personality agents so they learn what content resonates

### 6. Content/Personality Agents (Marketing Team)

**Role:** Authentic content creation and social media engagement

Three distinct personality agents, each with a unique voice:

| Agent | Personality | Domain | Season Focus |
|-------|------------|--------|--------------|
| **The Wrangler** | Passionate about horses, rodeo, Wild West culture, country accent | Rodeo events, western heritage, Winthrop town life | Summer (Memorial Day → Labor Day) |
| **The Trailblazer** | Outdoor adventure enthusiast | Hiking, climbing, Pacific Crest Trail, mountain biking, trail running | Summer/Fall |
| **The Powder Hound** | Winter sports expert | Cross-country skiing, downhill skiing, snowshoeing, winter activities | Winter |

**Capabilities (all agents):**
- Create blog posts for the website from recycled/curated local content
- Generate Instagram and TikTok content
- Engage with relevant posts from other accounts (like, comment, share) to drive traffic
- Read and respond to comments on own posts
- Learn from engagement metrics — create more of what resonates
- Maintain authentic, consistent voice within their personality

**Moderation:** Human review and approval of social media comments before posting (at least initially). Configurable aggressiveness dial for outbound engagement.

### 7. CRM/Marketing Harvester Agent

**Role:** Guest intelligence and lead generation

**Capabilities:**
- Maintains a mini-CRM of all past guests (contact info, booking history, preferences, pricing history)
- Stores direct booking contacts (guests who book through Bo's wife directly)
- Harvests potential leads from public sources: competitor property reviews, Methow Trails website activity, social media engagement
- Segments guests for targeted campaigns
- Remembers what each guest was charged previously (solves Bo's current pain point)

**Aggressiveness Dial:** Configurable from passive (only store guests who book with us) to active (scan reviews, social media, trail forums for high-intent visitors). Adjustable based on business needs and legal comfort.

### 8. Documentation Agent

**Role:** Project documentation and developer community

**Personality:** Curious and helpful

**Capabilities:**
- Keeps README, setup guides, and API documentation current
- Writes tutorials for new contributors
- Monitors GitHub issues and discussions for common questions
- Identifies documentation gaps (if multiple people ask the same question, auto-generates a doc)
- Engages with the developer community in a welcoming, exploratory tone
- Proactively explores edge cases in the codebase and flags them

---

## Website Requirements

### Human-Facing Interface

The website serves as one interface to the booking system (agents being the other).

**Core Pages/Features:**
- Property showcase (house, apartment, retreat) with photos, amenities, descriptions
- Real-time availability calendar reflecting the three-SKU constraint logic
- Booking flow with payment processing
- Guest account creation and login (OAuth via Google/Microsoft — no password management)
- Reservation management (guests can view, modify their bookings — a feature Airbnb lacks)
- Blog section with fresh, locally-sourced content (generated by personality agents)
- About page with Winthrop/Methow Valley context and Wild West theming

### Conversational AI Interface

**Vision (from the XPrivo concept, circa 2012–2013):**
- Visitors are greeted by an animated character/conversational agent
- The character's personality varies based on context: season, time of year, visitor profile
- Rodeo season → western/country persona
- Ski season → winter sports enthusiast
- The character can answer questions, recommend activities, and guide booking
- Returning visitors are recognized and greeted personally

### A/B Testing Framework

- Built-in capability to serve different experiences to different visitors
- Track engagement metrics: clicks, time on site, booking conversion rate, bounce rate
- Test different personalities, layouts, content strategies
- Feed results back to agents for continuous optimization

### Guest Recognition

- Recognize returning visitors/agents
- Remember past booking details and pricing
- Personalized pricing and loyalty incentives for repeat guests
- Privacy policy that is transparent about tracking and personalization ("we remember you — that's a feature, not a bug")

---

## MCP (Model Context Protocol) Endpoint

The MCP server exposes the following capabilities to external AI agents:

| Tool | Description |
|------|-------------|
| `search_properties` | Return available properties with descriptions, amenities, photos |
| `check_availability` | Real-time availability check for specific dates and SKU |
| `get_pricing` | Dynamic pricing for specific dates (reflects current market conditions) |
| `create_booking` | Submit a booking request (subject to guardian agent validation) |
| `check_booking_status` | Look up an existing reservation |
| `cancel_booking` | Request cancellation (subject to cancellation policy) |

**Security:**
- All booking requests pass through the guardian agent before confirmation
- Agent legitimacy verification
- Rate limiting per requesting agent
- Anomaly detection for suspicious patterns
- Optional OAuth escalation for flagged requests

---

## Calendar Synchronization

### Transition Period (Airbnb/VRBO still active)

During the summer 2026 validation period, listings remain active on Airbnb and VRBO.

**Sync Strategy:**
- Import iCal feeds from Airbnb and VRBO into the local database
- Export local bookings as iCal feeds back to Airbnb/VRBO
- Polling interval: evaluate acceptable lag (iCal is not real-time)
- Three-SKU constraint logic must account for bookings originating from any platform

**Future Consideration:**
- Evaluate channel manager APIs (Hostaway, Hosthub) for real-time sync if iCal lag proves problematic ($20–50/month)
- Long-term goal: migrate off Airbnb/VRBO entirely once direct booking volume is sufficient

---

## Expansion Roadmap

### Phase 1: Summer 2026 (Current Scope)
- Launch with Bo's two properties (three SKUs)
- Validate agent architecture with real bookings and revenue
- Prove the model generates target revenue

### Phase 2: Fall/Winter 2026
- Offer platform to Wolf Ridge Resort HOA (17 properties total)
- Payment processing with configurable platform fee
- Scout agent aggregates pricing intelligence across all HOA properties
- Shared marketing and content generation

### Phase 3: Future
- White-label platform for other property owners/HOAs
- Community-driven open source development
- Expanded agent capabilities based on learnings

---

## Technical Stack (Preliminary)

| Component | Technology |
|-----------|-----------|
| **Database** | PostgreSQL |
| **Message Bus** | Redis Pub/Sub or RabbitMQ (evaluate during build) |
| **Agent Runtime** | Python (likely with Claude API or local LLM on T4 GPU) |
| **Website** | TBD — likely a lightweight framework (Next.js, SvelteKit, or similar) |
| **MCP Server** | Python or Node.js implementing Model Context Protocol |
| **Containerization** | Docker + Docker Compose |
| **CI/CD** | GitHub Actions |
| **Backup** | Automated snapshots → S3 or Backblaze B2 |
| **Auth** | OAuth 2.0 (Google, Microsoft) |
| **Hosting** | Ubuntu server with NVIDIA T4, on-premises at property |

---

## Open Source & Community

- **Repository:** Public GitHub repo
- **License:** TBD (fully open — MIT, Apache 2.0, or similar)
- **CI/CD:** GitHub Actions for automated testing and deployment
- **Community:** GitHub Discussions or Discord for contributor collaboration
- **Documentation:** Maintained by the documentation agent (curious personality)
- **Contributions:** Open to anyone — property owners, developers, AI enthusiasts

---

## Open Questions & To-Dos

1. **Scout Agent Data Sources:** Investigate legal/technical options for gathering competitor availability and pricing data across the Methow Valley and Lake Chelan corridor
2. **Finance Agent Scope:** Collaborate with Bo's wife on detailed financial requirements and the handoff plan from manual to automated financial operations
3. **Message Bus Selection:** Evaluate Redis Pub/Sub vs RabbitMQ vs alternatives during initial build
4. **Content Agent Social APIs:** Investigate Instagram and TikTok API access for posting and engagement metrics
5. **Conversational AI Implementation:** Evaluate frameworks for animated character interface (WebGL, Rive, or similar)
6. **Privacy/Legal:** Draft privacy policy covering guest tracking, personalization, and lead harvesting
7. **Lilo Property (Reference):** Keep GitHub project `lilo-property/mcp-server` as a reference for MCP vacation rental patterns and guest risk scoring
8. **iCal Sync Lag:** Test acceptable polling intervals during transition period with Airbnb/VRBO active
9. **Winthrop Historical Context:** Research Owen Wister's "The Virginian" (1902) — the novel that inspired Winthrop's Wild West identity — for authentic content theming
10. **A/B Testing Framework:** Select or build tooling for serving variant experiences and tracking conversion metrics
