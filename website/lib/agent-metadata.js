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
  ['get_booking_link', 'The Airbnb listing links for a property and the other two.'],
];

// Public read-only availability and quote for one stay. No auth, no guest
// data. Allowed in robots.txt although the rest of /api/ is not.
export const AVAILABILITY_API_PATH = '/api/booking-requests/check';
export const AVAILABILITY_API_URL = `${ORIGIN}${AVAILABILITY_API_PATH}`;

export const PROPERTY_IDS = ['wolf-creek-lodge', 'wolf-creek-apartment', 'wolf-creek-retreat-combo'];

// Same wording as /llms.txt, so agents reading either get one answer.
export const SR20_NOTE =
  'The North Cascades Highway (SR 20) is closed every winter, roughly December to late April. ' +
  'Guests driving from Seattle in winter must take the southern route via I-90 or US 2. ' +
  'Do not quote a summer drive time for a winter stay.';

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
