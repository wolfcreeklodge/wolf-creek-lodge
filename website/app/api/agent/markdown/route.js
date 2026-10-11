import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import {
  ORIGIN,
  MARKDOWN_PATH_HEADER,
  MARKDOWN_RENDER_HEADER,
} from '../../../../lib/agent-metadata.js';

// ---------------------------------------------------------------------------
// /api/agent/markdown -- reached through middleware.js when a request for a
// page prefers text/markdown; the page path arrives in MARKDOWN_PATH_HEADER.
//
// Renders the page as the site itself would serve it (an internal request to
// this same server, never another host), keeps the <main> content, and
// converts it with turndown. Navigation, footer and scripts are outside <main>
// or removed; forms are replaced with a note that one is on the page, since a
// form means nothing in Markdown. Links and images become absolute URLs, so
// the Markdown stands on its own. The status code passes through, so a
// missing page is still a 404.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// The address this server listens on. Next's standalone server binds to
// HOSTNAME (the container's own hostname here), not 127.0.0.1, so the
// internal request has to use the same name.
const SELF = `http://${process.env.HOSTNAME || '127.0.0.1'}:${process.env.PORT || 3000}`;

function decodeEntities(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function absolute(href, pageUrl) {
  if (!href) return href;
  if (/^(mailto|tel):/i.test(href)) return href;
  try {
    return new URL(href, pageUrl).toString();
  } catch {
    return href;
  }
}

// next/image serves /_next/image?url=<original>&w=..; point at the original.
function imageUrl(src, pageUrl) {
  if (src && src.startsWith('/_next/image')) {
    const original = new URL(src, ORIGIN).searchParams.get('url');
    if (original) return absolute(original, pageUrl);
  }
  return absolute(src, pageUrl);
}

function converter(pageUrl) {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
  });
  td.use(gfm);
  td.remove(['script', 'style', 'noscript', 'iframe', 'svg', 'template', 'dialog', 'button']);
  td.addRule('forms', {
    filter: 'form',
    replacement: () => '\n\n*(An interactive form is here on the web page.)*\n\n',
  });
  td.addRule('links', {
    filter: (node) => node.nodeName === 'A' && Boolean(node.getAttribute('href')),
    replacement: (content, node) => {
      const text = content.replace(/\s+/g, ' ').trim();
      return text ? `[${text}](${absolute(node.getAttribute('href'), pageUrl)})` : '';
    },
  });
  td.addRule('images', {
    filter: 'img',
    replacement: (_content, node) => {
      const alt = (node.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
      return alt ? `![${alt}](${imageUrl(node.getAttribute('src'), pageUrl)})` : '';
    },
  });
  return td;
}

export async function GET(request) {
  const path = request.headers.get(MARKDOWN_PATH_HEADER) || '/';
  // A site-relative path only: no scheme, no protocol-relative //host, no
  // backslashes, no API. The request goes to this server and nowhere else.
  if (!/^\/(?![\/\\])[^\s\\]*$/.test(path) || path.startsWith('/api/')) {
    return new Response('Not found', { status: 404 });
  }

  let upstream;
  try {
    upstream = await fetch(`${SELF}${path}`, {
      headers: { accept: 'text/html', [MARKDOWN_RENDER_HEADER]: '1' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.error('markdown render failed:', err.message);
    return new Response('Could not render this page as Markdown.', { status: 502 });
  }

  const html = await upstream.text();
  const pageUrl = `${ORIGIN}${path}`;
  const title = decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim();
  const description = decodeEntities(
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1] || ''
  ).trim();
  const start = html.search(/<main[\s>]/i);
  const end = html.lastIndexOf('</main>');
  const main = start >= 0 && end > start ? html.slice(start, end + 7) : html;

  const body = converter(pageUrl)
    .turndown(main)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const yaml = (s) => JSON.stringify(s);
  const markdown =
    `---\ntitle: ${yaml(title)}\n` +
    (description ? `description: ${yaml(description)}\n` : '') +
    `url: ${yaml(pageUrl)}\n---\n\n${body}\n`;

  return new Response(markdown, {
    status: upstream.status,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: 'Accept',
      // A rough count (about four characters a token), the same header
      // Cloudflare's edge feature sends, so an agent can budget before reading.
      'x-markdown-tokens': String(Math.ceil(markdown.length / 4)),
      'Cache-Control': 'no-store',
    },
  });
}
