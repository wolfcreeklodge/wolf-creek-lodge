import {
  AGENT_DOC_HEADERS,
  AGENT_GUIDE_URL,
  API_CATALOG_URL,
  AVAILABILITY_API_URL,
  HEALTH_URL,
  MCP_SSE_URL,
  OPENAPI_MEDIA_TYPE,
  OPENAPI_URL,
  SERVER_CARD_MEDIA_TYPE,
  SERVER_CARD_URL,
} from '../../../../lib/agent-metadata.js';

// ---------------------------------------------------------------------------
// /.well-known/api-catalog (rewritten here in next.config.js). RFC 9727.
//
// Two APIs, both public and read-only: the HTTP availability check, described
// by the committed OpenAPI document and with a health endpoint for status, and
// the MCP server, described by its server card. Every href answers 200 today.
// Relation values are arrays of link objects, never bare strings (erratum
// 9009 corrects the RFC's own example on exactly that).
// ---------------------------------------------------------------------------

const LINKSET = {
  linkset: [
    {
      anchor: AVAILABILITY_API_URL,
      'service-desc': [{ href: OPENAPI_URL, type: OPENAPI_MEDIA_TYPE }],
      'service-doc': [{ href: AGENT_GUIDE_URL, type: 'text/html' }],
      status: [{ href: HEALTH_URL, type: 'application/json' }],
    },
    {
      anchor: MCP_SSE_URL,
      'service-desc': [{ href: SERVER_CARD_URL, type: SERVER_CARD_MEDIA_TYPE }],
      'service-doc': [{ href: AGENT_GUIDE_URL, type: 'text/html' }],
    },
  ],
};

const BODY = JSON.stringify(LINKSET, null, 2);

const HEADERS = {
  ...AGENT_DOC_HEADERS,
  'Content-Type': 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
  // RFC 9727 section 2: a HEAD request must get this Link back.
  Link: `<${API_CATALOG_URL}>; rel="api-catalog"`,
};

export const dynamic = 'force-static';

export function GET() {
  return new Response(BODY, { headers: HEADERS });
}

export function HEAD() {
  return new Response(null, { headers: HEADERS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS });
}
