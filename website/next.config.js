/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/crm/:path*',
        destination: 'http://crm:3000/:path*',
      },
      {
        source: '/crm',
        destination: 'http://crm:3000/',
      },
    ];
  },
};

module.exports = nextConfig;
