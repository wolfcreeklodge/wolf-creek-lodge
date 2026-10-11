import { getSkill } from '../../../../../lib/agent-skills.js';
import { AGENT_DOC_HEADERS, agentDocPreflight } from '../../../../../lib/agent-metadata.js';

// /.well-known/agent-skills/<name>/SKILL.md (rewritten here in next.config.js).
// Serves the exact bytes the skills index hashed; see lib/agent-skills.js.
export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { name } = await params;
  const skill = getSkill(name);
  if (!skill) return new Response('Not found', { status: 404 });
  return new Response(skill.body, {
    headers: { ...AGENT_DOC_HEADERS, 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

export function OPTIONS() {
  return agentDocPreflight();
}
