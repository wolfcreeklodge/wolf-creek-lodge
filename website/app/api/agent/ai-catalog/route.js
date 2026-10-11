import { SKILLS } from '../../../../lib/agent-skills.js';
import {
  AGENT_GUIDE_URL,
  OPENAPI_URL,
  SERVER_CARD_MEDIA_TYPE,
  SERVER_CARD_URL,
  agentDocPreflight,
  agentDocResponse,
  skillUrl,
} from '../../../../lib/agent-metadata.js';

// ---------------------------------------------------------------------------
// /.well-known/ard.json and /.well-known/ai-catalog.json, the same bytes at
// both (rewritten here in next.config.js).
//
// ARD v0.91 reads ard.json; the AI Catalog spec it builds on, and current
// scanners, read ai-catalog.json. specVersion is the AI Catalog version.
// Nothing at the top level beyond specVersion, host and entries: the
// predecessor schema forbids extra members. The /agents guide is
// host.documentationUrl rather than an entry, since neither spec defines an
// entry type for an HTML page.
//
// Every url below answers 200 today. representativeQueries are the
// embedding surface registries match on, so they are what a traveller would
// actually ask, and true: the largest configuration sleeps 10.
// ---------------------------------------------------------------------------

const QUERIES = {
  'book-wolf-creek-lodge': [
    'book a vacation rental in Winthrop Washington directly',
    'Methow Valley house for a cross-country ski week',
    'whole property for a family of 10 in the Methow Valley',
  ],
  'methow-valley-trip-planning': [
    'where to stay in Winthrop when the North Cascades Highway is closed',
    'Methow Valley cross-country ski pass prices',
    'what to do in Winthrop Washington in winter',
  ],
};

const CATALOG = {
  specVersion: '1.0',
  host: {
    displayName: 'Wolfcreek Lodge',
    identifier: 'wolfcreeklodge.us',
    documentationUrl: AGENT_GUIDE_URL,
  },
  entries: [
    {
      identifier: 'urn:air:wolfcreeklodge.us:mcp:lodge',
      displayName: 'Wolfcreek Lodge MCP server',
      type: SERVER_CARD_MEDIA_TYPE,
      url: SERVER_CARD_URL,
      description:
        'Availability, seasonal quotes and direct booking links for three vacation-rental ' +
        'configurations in Winthrop, WA, plus Methow Valley area and winter information. Read-only.',
      representativeQueries: [
        'vacation rental near Winthrop Washington that sleeps 9',
        'Methow Valley lodging with ski-in ski-out cross-country trail access',
        'is a cabin near Winthrop free over Presidents Day weekend',
        'book a whole property for a family reunion in the Methow Valley',
      ],
    },
    {
      identifier: 'urn:air:wolfcreeklodge.us:api:availability',
      displayName: 'Wolfcreek Lodge availability API',
      type: 'application/vnd.oai.openapi+json',
      url: OPENAPI_URL,
      description:
        'Read-only HTTP check of availability, minimum stay and the before-tax direct price for ' +
        'one stay, with the exclusivity between the three configurations applied.',
      representativeQueries: [
        'check availability for a Methow Valley vacation rental',
        'price of a 3 night stay near Winthrop WA',
      ],
    },
    ...SKILLS.map((s) => ({
      identifier: `urn:air:wolfcreeklodge.us:skill:${s.name}`,
      displayName: s.name
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      type: 'application/agent-skills+md',
      url: skillUrl(s.name),
      description: s.description,
      representativeQueries: QUERIES[s.name],
    })),
  ],
};

export const dynamic = 'force-static';

export function GET() {
  return agentDocResponse(CATALOG, 'application/json');
}

export function OPTIONS() {
  return agentDocPreflight();
}
