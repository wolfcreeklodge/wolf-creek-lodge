import spec from '../../../../lib/openapi-availability.json';
import {
  agentDocResponse,
  agentDocPreflight,
  OPENAPI_MEDIA_TYPE,
} from '../../../../lib/agent-metadata.js';

// /openapi.json (rewritten here in next.config.js): the OpenAPI description
// of the public availability API, the service-desc link in
// /.well-known/api-catalog. Kept as a committed JSON file rather than
// generated, so a change to the contract is a reviewable diff.
export const dynamic = 'force-static';

export function GET() {
  return agentDocResponse(spec, OPENAPI_MEDIA_TYPE);
}

export function OPTIONS() {
  return agentDocPreflight();
}
