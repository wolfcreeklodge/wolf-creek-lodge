/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Serve Umami from our own origin. Two reasons: no second public hostname to
  // route through the tunnel, and requests to /stats/* are not on any tracker
  // blocklist, so the numbers are not quietly wrong by whatever share of
  // visitors run an ad blocker. umami:3000 is the compose service.
  async rewrites() {
    return [
      { source: '/stats/script.js', destination: 'http://umami:3000/script.js' },
      { source: '/stats/api/send', destination: 'http://umami:3000/api/send' },

      // Agent discovery documents. Route handlers rather than files in
      // public/: several need media types no file extension implies
      // (/.well-known/api-catalog has no extension and must be
      // application/linkset+json), and a dot-folder inside app/ is not
      // reliably routed. Each handler lands in its own phase; until then the
      // path is a plain 404, as it was before. Shared URLs and headers live in
      // lib/agent-metadata.js.
      { source: '/.well-known/ai-catalog.json', destination: '/api/agent/ai-catalog' },
      { source: '/.well-known/ard.json', destination: '/api/agent/ai-catalog' },
      { source: '/.well-known/api-catalog', destination: '/api/agent/api-catalog' },
      { source: '/.well-known/mcp/server-card.json', destination: '/api/agent/mcp-server-card' },
      { source: '/.well-known/agent-skills/index.json', destination: '/api/agent/skills-index' },
      { source: '/.well-known/agent-skills/:name/SKILL.md', destination: '/api/agent/skill/:name' },
      // OpenAPI description of the public availability API (service-desc in
      // the api-catalog), at a path robots.txt does not disallow.
      { source: '/openapi.json', destination: '/api/agent/openapi' },
    ];
  },

  // RFC 8288 Link header on every page, pointing agents at the API catalog,
  // the guide and the plain-text summary without their having to parse HTML.
  // Only registered relation types (api-catalog is RFC 9727's), and only
  // targets that answer 200. The ARD manifest's own rel values are not
  // registered, so they are <link> elements in the page head instead
  // (app/layout.js).
  async headers() {
    return [
      {
        // Pages only: not the API, assets, analytics, or the /.well-known/
        // documents, which set their own Link where a spec asks for one.
        source: '/((?!api/|_next/|stats/|\\.well-known/).*)',
        headers: [
          {
            key: 'Link',
            value:
              '</.well-known/api-catalog>; rel="api-catalog", ' +
              '</agents>; rel="service-doc", ' +
              '</llms.txt>; rel="describedby"; type="text/plain"',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
