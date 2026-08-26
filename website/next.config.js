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
    ];
  },
};

module.exports = nextConfig;
