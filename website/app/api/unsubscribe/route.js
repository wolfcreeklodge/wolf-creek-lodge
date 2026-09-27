import { NextResponse } from 'next/server';
import pool from '../../../lib/db.js';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Two callers, one effect:
//   1. The button on /unsubscribe, which posts from=page and expects to land
//      back on a "done" page.
//   2. A mail client acting on the List-Unsubscribe-Post header (RFC 8058),
//      which posts List-Unsubscribe=One-Click and expects a bare 200.
//
// There is deliberately no GET. Mail security scanners and Outlook SafeLinks
// fetch every link in a message; an unsubscribe on GET would opt people out
// without them ever clicking.
//
// The response is the same whether or not the token matched a guest, so the
// endpoint cannot be used to test which tokens exist.
export async function POST(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('t') || '';

  let fromPage = false;
  try {
    const form = await request.formData();
    fromPage = form.get('from') === 'page';
  } catch {
    // One-click clients may send no body we can parse; that is fine.
  }

  if (UUID_RE.test(token)) {
    try {
      const { rows } = await pool.query(
        `UPDATE guests
            SET marketing_consent = 'opted_out', marketing_consent_at = now(),
                marketing_consent_source = 'unsubscribe_link', updated_at = now()
          WHERE unsubscribe_token = $1::uuid
          RETURNING id`,
        [token]
      );
      if (rows[0]) {
        // Anything already queued for them stops here too. The sender
        // re-checks consent before each promotion anyway; this just makes the
        // CRM's outbox say so straight away.
        await pool.query(
          `UPDATE outbound_emails SET status = 'skipped', last_error = 'unsubscribed'
            WHERE guest_id = $1 AND kind = 'promotion' AND status = 'queued'`,
          [rows[0].id]
        );
      }
    } catch (err) {
      console.error('POST /api/unsubscribe error:', err);
      return NextResponse.json({ error: 'Could not unsubscribe just now.' }, { status: 500 });
    }
  }

  if (fromPage) {
    // Relative on purpose. Behind the Cloudflare tunnel the container sees
    // plain http, so an absolute URL built from request.url would bounce the
    // guest to http://. A relative Location resolves against what the
    // browser actually used.
    return new NextResponse(null, { status: 303, headers: { Location: '/unsubscribe?done=1' } });
  }
  return new NextResponse('Unsubscribed', { status: 200 });
}
