export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/availability/admin'],
      },
    ],
    sitemap: 'https://wolfcreeklodge.us/sitemap.xml',
    host: 'https://wolfcreeklodge.us',
  };
}
