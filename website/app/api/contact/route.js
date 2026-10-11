import { NextResponse } from 'next/server';
import pool from '../../../lib/db.js';
import { getSiteConfig } from '../../../lib/data.js';
import { hashClientAddress } from '../../../lib/booking.js';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST /api/contact -- the /contact form.
//
// Until 2026-10-11 that form sent nothing: it showed a thank-you and dropped
// the message. Now the message is queued in outbound_emails as a
// 'contact_message' to the owner's address, with Reply-To set to the sender,
// and scripts/send-email.mjs delivers it. The queued row is the record, so a
// message is never lost even when sending is down.
//
// Same defences as the booking request form: a honeypot, a per-address hourly
// limit, and server-side validation of every field.
// ---------------------------------------------------------------------------

const SUBJECTS = {
  general: 'General inquiry',
  booking: 'Booking question',
  retreat: 'Group / retreat inquiry',
};
const PER_HOUR = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Could not read that message.' }, { status: 400 });
  }

  // Honeypot: answer as if it worked and write nothing. Logged without names
  // or addresses, so a false positive (a real person) can still be spotted.
  if (typeof body.hpTrap === 'string' && body.hpTrap.trim() !== '') {
    console.log(`contact honeypot hit: email_looks_real=${EMAIL_RE.test(String(body.email || ''))}`);
    return NextResponse.json({ ok: true });
  }

  const name = clean(body.name, 100);
  const email = clean(body.email, 200).toLowerCase();
  const subjectKey = clean(body.subject, 20);
  const dates = clean(body.dates, 100);
  const message = clean(body.message, 5000);
  const guestsRaw = clean(body.guests, 3);
  const guests = guestsRaw === '' ? null : Number.parseInt(guestsRaw, 10);

  if (!name) return NextResponse.json({ error: 'Please add your name.' }, { status: 422 });
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please check your email address.' }, { status: 422 });
  }
  if (!SUBJECTS[subjectKey]) {
    return NextResponse.json({ error: 'Please choose a subject.' }, { status: 422 });
  }
  if (guests !== null && (!Number.isInteger(guests) || guests < 1 || guests > 50)) {
    return NextResponse.json({ error: 'Please check the number of guests.' }, { status: 422 });
  }
  if (!message) return NextResponse.json({ error: 'Please add a message.' }, { status: 422 });

  const ipHash = hashClientAddress(request.headers);

  try {
    const { rows: recent } = await pool.query(
      `SELECT count(*)::int AS n FROM outbound_emails
        WHERE kind = 'contact_message' AND payload->>'ipHash' = $1
          AND created_at > now() - interval '1 hour'`,
      [ipHash]
    );
    if (recent[0].n >= PER_HOUR) {
      return NextResponse.json(
        { error: 'That is a lot of messages in a short time. Please email us directly instead.' },
        { status: 429 }
      );
    }

    const siteConfig = await getSiteConfig();
    const ownerEmail = siteConfig?.contactEmail || 'wolfcreeklodge@outlook.com';
    await pool.query(
      `INSERT INTO outbound_emails (kind, to_email, payload)
       VALUES ('contact_message', $1, $2::jsonb)`,
      [
        ownerEmail,
        JSON.stringify({
          name,
          email,
          replyTo: email,
          subject: SUBJECTS[subjectKey],
          dates: dates || null,
          guests,
          message,
          ipHash,
        }),
      ]
    );
  } catch (err) {
    console.error('POST /api/contact failed:', err.message);
    return NextResponse.json(
      { error: 'Something went wrong on our side. Please email us directly.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
