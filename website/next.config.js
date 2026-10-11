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
      { source: '/.well-known/api-catalog', destination: '/api/agent/api-catalog' },
      { source: '/.well-known/mcp/server-card.json', destination: '/api/agent/mcp-server-card' },
      { source: '/.well-known/agent-skills/index.json', destination: '/api/agent/skills-index' },
    ];
  },
};

module.exports = nextConfig;
