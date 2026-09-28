import { NextResponse } from 'next/server';
import {
  createBookingRequest,
  hashClientAddress,
  validateContact,
} from '../../../lib/booking.js';

export const dynamic = 'force-dynamic';

// Public write endpoint behind the request form. Three defences, none of them
// a CAPTCHA:
//   - a honeypot field real guests never see (below),
//   - a per-address hourly limit, enforced in createBookingRequest,
//   - server-side validation of every field, repeated from the client.
// If spam gets through anyway, Cloudflare Turnstile is the next step: free,
// and the site already sits behind Cloudflare.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Could not read that request.' }, { status: 400 });
  }

  // Honeypot. The field is visually hidden and labelled so a person would
  // leave it alone; a form-filling bot fills it. Answer as if it worked, so
  // the bot learns nothing, and write nothing.
  //
  // Logged, because the failure mode is silent: a false positive is a real
  // guest who saw "Request sent" and whose request was thrown away. No names
  // or addresses in the log -- just enough to tell a bot from a person. If
  // hits keep showing a well-formed email and a real property id, the
  // honeypot is catching people; check `docker compose logs website`.
  if (typeof body.hpTrap === 'string' && body.hpTrap.trim() !== '') {
    const emailLooksReal = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(body.email || ''));
    console.warn(
      `booking-request honeypot hit: ip=${hashClientAddress(request.headers).slice(0, 8)} ` +
        `property=${String(body.propertyId).slice(0, 40)} email_looks_real=${emailLooksReal}`
    );
    return NextResponse.json({ ok: true, status: 'pending', reference: 'RECEIVED' });
  }

  const contact = validateContact(body);
  if (contact.error) return NextResponse.json(contact, { status: 422 });

  try {
    const result = await createBookingRequest({
      stayInput: {
        propertyId: body.propertyId,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
      },
      contact,
      ipHash: hashClientAddress(request.headers),
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 422 });
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      reference: result.reference,
      alternatives: result.check.alternatives,
    });
  } catch (err) {
    console.error('POST /api/booking-requests error:', err);
    return NextResponse.json(
      { error: 'Something went wrong on our side. Please email us your dates instead.' },
      { status: 500 }
    );
  }
}
