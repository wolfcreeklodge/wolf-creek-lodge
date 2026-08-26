export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /arrival/* carries the exact route to the house and is token-gated.
        // The pages also send robots: noindex, this is belt and braces.
        disallow: ['/api/', '/availability/admin', '/arrival/'],
      },
    ],
    sitemap: 'https://wolfcreeklodge.us/sitemap.xml',
    host: 'https://wolfcreeklodge.us',
  };
}
