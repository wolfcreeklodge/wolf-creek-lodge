// ---------------------------------------------------------------------------
// /robots.txt
//
// A route handler rather than app/robots.js: Next's typed robots helper has no
// field for custom directives, and Content-Signal is one. Exactly one robots
// source may exist; app/robots.js was removed when this replaced it, with
// every rule it had carried over unchanged.
//
// Content-Signal (https://contentsignals.org) says what crawlers may do with
// what they fetch. The owner's policy, 2026-10-10:
//   search=yes    appear in search results
//   ai-input=yes  be read and cited by assistants answering a traveller in
//                 real time -- the answer-engine channel this site is built for
//   ai-train=no   not used to train models
//
// The availability check is allowed although /api/ is not: under RFC 9309 the
// longest matching rule wins, and listing the Allow first also satisfies older
// first-match parsers. It is read-only and returns no guest data, and agents
// are pointed at it as the site's public API.
// ---------------------------------------------------------------------------

export const dynamic = 'force-static';

const BODY = [
  'User-Agent: *',
  'Content-Signal: search=yes, ai-input=yes, ai-train=no',
  'Allow: /',
  'Allow: /api/booking-requests/check',
  'Disallow: /api/',
  'Disallow: /availability/admin',
  // /arrival/* carries the exact route to the house and is token-gated.
  // The pages also send robots: noindex, this is belt and braces.
  'Disallow: /arrival/',
  '',
  'Host: https://wolfcreeklodge.us',
  'Sitemap: https://wolfcreeklodge.us/sitemap.xml',
  '',
].join('\n');

export function GET() {
  return new Response(BODY, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
