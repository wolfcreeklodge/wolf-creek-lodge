import { SKILLS } from '../../../../lib/agent-skills.js';
import { agentDocPreflight, agentDocResponse, skillUrl } from '../../../../lib/agent-metadata.js';

// ---------------------------------------------------------------------------
// /.well-known/agent-skills/index.json (rewritten here in next.config.js).
// Agent Skills Discovery RFC v0.2.0.
//
// digest is "sha256:" plus lowercase hex over the exact bytes each SKILL.md
// route serves. Both come from the same string in lib/agent-skills.js, so a
// skill edit changes the digest in the same deploy; nothing is hand-hashed.
// ---------------------------------------------------------------------------

const INDEX = {
  $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
  skills: SKILLS.map((s) => ({
    name: s.name,
    type: 'skill-md',
    description: s.description,
    url: skillUrl(s.name),
    digest: `sha256:${s.sha256}`,
  })),
};

export const dynamic = 'force-static';

export function GET() {
  return agentDocResponse(INDEX, 'application/json');
}

export function OPTIONS() {
  return agentDocPreflight();
}
