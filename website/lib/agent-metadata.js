// ---------------------------------------------------------------------------
// One source of truth for the agent-facing documents: the /agents guide, the
// /.well-known/ files and the Link header. Several documents repeating the
// same URLs by hand would drift; these are projected from here instead.
//
// Rule for anything added: it must return 200 from the public internet on the
// day it is published. A discovery document that points at a 404 teaches
// agents, and the registries that cache them, that this origin is wrong.
// ---------------------------------------------------------------------------

export const ORIGIN = 'https://wolfcreeklodge.us';

// The human- and LLM-readable guide; rel="service-doc" in the Link header.
export const AGENT_GUIDE_PATH = '/agents';
export const AGENT_GUIDE_URL = `${ORIGIN}${AGENT_GUIDE_PATH}`;

// MCP server. SSE transport, served at /sse; 404 at / and /mcp.
export const MCP_SSE_URL = 'https://mcp.wolfcreeklodge.us/sse';

// Must match the live server exactly (mcp-server/server.py). Checked against
// a real MCP client on 2026-10-10. A document naming a tool the server does
// not expose is worse than no document.
export const MCP_TOOLS = [
  ['search_properties', 'The three bookable configurations with capacity, amenities and pricing, optionally filtered by party size.'],
  ['get_property_details', 'Full details for one property: rooms, amenities, house rules, highlights, pricing, reviews.'],
  ['get_pricing', 'A date-aware quote from the seasonal rate calendar; pass check_in and check_out.'],
  ['check_availability', 'Whether a property is free from check_in to check_out, with the exclusivity rule applied.'],
  ['get_rate_calendar', 'The published seasonal rate ladder: dated windows, tier, minimum stay, nightly rates.'],
  ['get_area_info', 'Winthrop and the Methow Valley: activities by season, wellness, getting around.'],
  ['get_winter_info', 'Winter specifics: the trail network and grooming, pass prices, the ski bowl, winter road access.'],
  ['get_host_info', 'About the host: Superhost status, years hosting, ratings, co-host.'],
  ['get_booking_link', 'Where a guest books directly (the request form), optionally checking dates in the same call; Airbnb only as a fallback.'],
];

// MCP server card (SEP-2127, merged 2026-10-06; wire format in
// modelcontextprotocol/ext-server-card). The spec reserves no path for an SSE
// server; this is the one scanners probe and the catalogs point at.
export const SERVER_CARD_URL = `${ORIGIN}/.well-known/mcp/server-card.json`;
export const SERVER_CARD_MEDIA_TYPE = 'application/mcp-server-card+json';
// Exactly what the server negotiates: mcp 1.30.0's SUPPORTED_PROTOCOL_VERSIONS,
// read from the running container 2026-10-11. Update on an SDK upgrade.
export const MCP_PROTOCOL_VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'];

export const API_CATALOG_URL = `${ORIGIN}/.well-known/api-catalog`;
// ARD v0.91 moved the manifest to ard.json; ai-catalog.json is its predecessor
// and what the AI Catalog spec and current scanners still read. Same bytes at
// both.
export const ARD_URL = `${ORIGIN}/.well-known/ard.json`;
export const AI_CATALOG_URL = `${ORIGIN}/.well-known/ai-catalog.json`;
export const SKILLS_INDEX_URL = `${ORIGIN}/.well-known/agent-skills/index.json`;
export const skillUrl = (name) => `${ORIGIN}/.well-known/agent-skills/${name}/SKILL.md`;

// Public read-only availability and quote for one stay. No auth, no guest
// data. Allowed in robots.txt although the rest of /api/ is not.
export const AVAILABILITY_API_PATH = '/api/booking-requests/check';
export const AVAILABILITY_API_URL = `${ORIGIN}${AVAILABILITY_API_PATH}`;

// OpenAPI description of that API (committed: lib/openapi-availability.json)
// and its status endpoint; service-desc and status in the api-catalog.
export const OPENAPI_URL = `${ORIGIN}/openapi.json`;
export const OPENAPI_MEDIA_TYPE = 'application/vnd.oai.openapi+json;version=3.1';
export const HEALTH_URL = `${ORIGIN}/api/health`;

export const PROPERTY_IDS =['wolf-creek-lodge', 'wolf-creek-apartment', 'wolf-creek-retreat-combo'];

// Direct quotes are before tax; the owner confirmed 2026-10-11 that taxes are
// added to direct bookings and reported. Same sentence as TAX_NOTE in
// mcp-server/server.py.
export const TAX_NOTE =
  'Prices are before tax. Washington State sales tax and local lodging tax are added to the ' +
  'booking total.';

// Same wording as /llms.txt, so agents reading either get one answer.
export const SR20_NOTE =
  'The North Cascades Highway (SR 20) is closed every winter, roughly December to late April. ' +
  'Guests driving from Seattle in winter must take the southern route via I-90 or US 2. ' +
  'Do not quote a summer drive time for a winter stay.';

// Markdown for agents (middleware.js + /api/agent/markdown). The converter's
// internal HTML fetch carries this header, so a page being rendered for
// conversion is never diverted back into the converter.
export const MARKDOWN_RENDER_HEADER = 'x-wcl-markdown-render';
// Carries the requested page path from the middleware to the converter.
export const MARKDOWN_PATH_HEADER = 'x-wcl-markdown-path';

// Every /.well-known/ document is public metadata by construction, so any
// origin may read it (ARD requires the CORS header). One hour, so caches pick
// up a deploy the same day.
export const AGENT_DOC_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Cache-Control': 'public, max-age=3600',
};

export function agentDocResponse(body, contentType) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body, null, 2), {
    headers: { ...AGENT_DOC_HEADERS, 'Content-Type': contentType },
  });
}

export function agentDocPreflight() {
  return new Response(null, { status: 204, headers: AGENT_DOC_HEADERS });
}
