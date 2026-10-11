import { NextResponse } from 'next/server';
import { MARKDOWN_PATH_HEADER, MARKDOWN_RENDER_HEADER } from './lib/agent-metadata.js';

// ---------------------------------------------------------------------------
// Markdown for agents.
//
// Cloudflare's edge feature for this is not on this zone's plan, so the site
// does it itself: a page request whose Accept header prefers text/markdown is
// rewritten to /api/agent/markdown, which renders the same page as HTML and
// converts it. Browsers never send text/markdown, so they always get HTML,
// unchanged. There is no second copy of any page to keep in sync.
//
// Pages only. The API, Next assets, analytics, the /.well-known/ documents
// and anything with a file extension (robots.txt, llms.txt, images) are never
// touched.
// ---------------------------------------------------------------------------

// True when text/markdown is acceptable (q > 0) and wanted at least as much as
// text/html.
function prefersMarkdown(accept) {
  if (!accept || !accept.toLowerCase().includes('text/markdown')) return false;
  let markdown = -1;
  let html = -1;
  for (const part of accept.split(',')) {
    const [type, ...params] = part.split(';').map((s) => s.trim().toLowerCase());
    const qParam = params.find((p) => p.startsWith('q='));
    const parsed = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
    const q = Number.isFinite(parsed) ? parsed : 1;
    if (type === 'text/markdown') markdown = Math.max(markdown, q);
    if (type === 'text/html') html = Math.max(html, q);
  }
  return markdown > 0 && markdown >= html;
}

export function middleware(request) {
  if (request.headers.get(MARKDOWN_RENDER_HEADER) === '1') return NextResponse.next();
  if (!prefersMarkdown(request.headers.get('accept'))) return NextResponse.next();

  // The page path rides in a request header: the query string of a rewrite
  // target does not reliably reach the route handler.
  const headers = new Headers(request.headers);
  headers.set(MARKDOWN_PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  const target = request.nextUrl.clone();
  target.pathname = '/api/agent/markdown';
  target.search = '';
  return NextResponse.rewrite(target, { request: { headers } });
}

export const config = {
  matcher: ['/((?!api/|_next/|stats/|\\.well-known/|.*\\.[A-Za-z0-9]+$).*)'],
};
