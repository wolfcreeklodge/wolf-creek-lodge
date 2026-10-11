import crypto from 'node:crypto';
import {
  ORIGIN,
  MCP_SSE_URL,
  MCP_PROTOCOL_VERSIONS,
  SERVER_CARD_MEDIA_TYPE,
} from '../../../../lib/agent-metadata.js';

// ---------------------------------------------------------------------------
// /.well-known/mcp/server-card.json (rewritten here in next.config.js).
//
// MCP Server Card, SEP-2127 (merged 2026-10-06; wire format in
// modelcontextprotocol/ext-server-card). Identity and how to connect, nothing
// more: tools, resources and prompts are deliberately not in the card and stay
// discoverable only at runtime, so a card cannot advertise a tool the server
// does not have. Declares the transport the server actually speaks, SSE, and
// the protocol versions its SDK actually negotiates.
// ---------------------------------------------------------------------------

const CARD = {
  $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
  name: 'us.wolfcreeklodge/lodge',
  version: '1.0.0',
  title: 'Wolfcreek Lodge',
  description: 'Availability, seasonal quotes and direct booking links for Wolfcreek Lodge in Winthrop, WA.',
  websiteUrl: ORIGIN,
  remotes: [
    {
      type: 'sse',
      url: MCP_SSE_URL,
      supportedProtocolVersions: MCP_PROTOCOL_VERSIONS,
    },
  ],
};

if (CARD.description.length > 100) {
  throw new Error('MCP server card description must be 100 characters or fewer');
}

const BODY = JSON.stringify(CARD, null, 2);
const ETAG = `"${crypto.createHash('sha256').update(BODY).digest('hex').slice(0, 32)}"`;

// The CORS set SEP-2127 requires, plus a cache the spec recommends.
const HEADERS = {
  'Content-Type': SERVER_CARD_MEDIA_TYPE,
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
  'Cache-Control': 'public, max-age=3600',
  ETag: ETAG,
};

// Dynamic only to read If-None-Match; the body is fixed per build.
export const dynamic = 'force-dynamic';

export function GET(request) {
  // Compare ignoring a weak-validator prefix: an edge that compresses the
  // response may weaken the ETag it passes on.
  const sent = (request.headers.get('if-none-match') || '').replace(/^W\//, '');
  if (sent && sent === ETAG) {
    return new Response(null, { status: 304, headers: HEADERS });
  }
  return new Response(BODY, { headers: HEADERS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS });
}
