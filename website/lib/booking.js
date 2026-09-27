// ---------------------------------------------------------------------------
// Booking requests: validation, availability, and the write.
//
// The site used to book by mailto: link, so nothing looked at a guest's dates
// until Bo read the mail. This is the server half of the request form: the
// availability answer comes from stay_is_available() in the database (see
// database/07-booking-requests.sql), the price from quoteStay(), and the write
// is one transaction that records the request and queues its emails.
//
// A request is not a reservation and does not hold dates. "Available" means
// available at the moment of asking; Airbnb can still sell the dates before
// Bo confirms, and the iCal sync will then show them taken. The form copy
// says so, and the CRM re-checks before confirming.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import pool from './db.js';
import { quoteStay, requiredMinNights } from './pricing.js';

// Off by default, and deliberately. The form writes a request to the
// database and queues the emails, but until scripts/send-email.mjs has a real
// provider (EMAIL_PROVIDER), those emails are only logged -- so neither the
// guest nor Bo would hear about a request unless someone opened the CRM.
// "Email to Book" goes straight to the inbox Bo watches, so it stays the
// default until the form can do at least as well. Turn on with
// BOOKING_FORM_ENABLED=true in .env and docker compose up -d --force-recreate website.
export function bookingFormEnabled() {
  return process.env.BOOKING_FORM_ENABLED === 'true';
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Deliberately loose. The real check is whether mail arrives; this only
// catches typos a guest would want caught.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MAX_NIGHTS = 60;
const MAX_MONTHS_AHEAD = 18;
// Per client address, per hour. A family planning a trip might try three or
// four date ranges; a script tries hundreds.
const RATE_LIMIT_PER_HOUR = 5;

// The property is in Winthrop, so "today" is Pacific. A guest in Seattle at
// 11pm should not be told tomorrow is in the past because UTC rolled over.
export function todayPacific() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
}

function parseDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  // Rejects 2026-02-30, which Date would silently roll into March.
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : d;
}

function nightsBetween(checkIn, checkOut) {
  return Math.round((parseDate(checkOut) - parseDate(checkIn)) / 86400000);
}

function addMonths(isoDate, months) {
  const d = parseDate(isoDate);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

async function loadProperties() {
  const { rows } = await pool.query(
    'SELECT id, title, max_guests FROM properties ORDER BY sort_order, id'
  );
  return rows;
}

// Shared by the live check and the submit, so the two can never disagree
// about whether a date range is acceptable. Returns { error } or the parsed
// stay.
async function validateStay({ propertyId, checkIn, checkOut }) {
  const properties = await loadProperties();
  const property = properties.find((p) => p.id === propertyId);
  if (!property) return { error: 'Choose one of the three places to stay.' };

  if (!parseDate(checkIn) || !parseDate(checkOut)) {
    return { error: 'Choose a check-in and a check-out date.' };
  }
  const today = todayPacific();
  if (checkIn < today) return { error: 'Check-in cannot be in the past.' };
  if (checkOut <= checkIn) return { error: 'Check-out has to be after check-in.' };

  const nights = nightsBetween(checkIn, checkOut);
  if (nights > MAX_NIGHTS) {
    return { error: `For stays longer than ${MAX_NIGHTS} nights, email us directly.` };
  }
  if (checkIn > addMonths(today, MAX_MONTHS_AHEAD)) {
    return { error: `We take requests up to ${MAX_MONTHS_AHEAD} months ahead.` };
  }

  return { property, properties, nights };
}

// The whole answer the form needs while a guest is still choosing dates:
// is it free, what does it cost, does it meet the minimum stay, and if it is
// taken, which of the other two places is open instead.
export async function checkStay({ propertyId, checkIn, checkOut }) {
  const stay = await validateStay({ propertyId, checkIn, checkOut });
  if (stay.error) return stay;

  const { rows } = await pool.query(
    `SELECT id, stay_is_available(id, $1::date, $2::date) AS available
       FROM properties`,
    [checkIn, checkOut]
  );
  const availability = Object.fromEntries(rows.map((r) => [r.id, r.available]));
  const available = availability[propertyId] === true;

  const minNightsRequired = await requiredMinNights(propertyId, checkIn, checkOut);
  const quote = await quoteStay(propertyId, checkIn, checkOut).catch(() => null);

  // Only offered when the one they asked for is taken. The House and the
  // Apartment do not block each other, so "the House is booked but the
  // Apartment is free" is a real and common answer.
  const alternatives = available
    ? []
    : stay.properties
        .filter((p) => p.id !== propertyId && availability[p.id])
        .map((p) => ({ propertyId: p.id, title: p.title, maxGuests: p.max_guests }));

  return {
    propertyId,
    title: stay.property.title,
    maxGuests: stay.property.max_guests,
    checkIn,
    checkOut,
    nights: stay.nights,
    available,
    minNightsRequired,
    meetsMinNights: stay.nights >= minNightsRequired,
    quote: quote && !quote.error
      ? {
          displayTotal: quote.displayTotal,
          displayNightlyAverage: quote.displayNightlyAverage,
          lengthDiscount: quote.lengthDiscount,
        }
      : null,
    alternatives,
  };
}

// HMAC, not a bare hash: the address space is small enough that an unkeyed
// SHA-256 of an IPv4 address is reversible by brute force in seconds.
export function hashClientAddress(headers) {
  const raw =
    headers.get('cf-connecting-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const secret = process.env.WEBSITE_AUTH_SECRET || 'wcl-booking';
  return crypto.createHmac('sha256', secret).update(`booking-ip:${raw}`).digest('hex').slice(0, 32);
}

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanMessage(value) {
  if (typeof value !== 'string') return '';
  // Keep line breaks -- people write paragraphs about their trip -- but not
  // runs of them.
  return value.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 2000);
}

export function validateContact(body) {
  const firstName = clean(body.firstName, 80);
  const lastName = clean(body.lastName, 80);
  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.phone, 40);
  const message = cleanMessage(body.message);
  const numGuests = Number.parseInt(body.numGuests, 10);

  if (!firstName || !lastName) return { error: 'Tell us your first and last name.' };
  if (!EMAIL_RE.test(email)) return { error: 'That email address does not look right.' };
  if (!Number.isInteger(numGuests) || numGuests < 1) return { error: 'How many guests?' };

  return {
    firstName,
    lastName,
    email,
    phone: phone || null,
    message: message || null,
    numGuests,
    marketingOptIn: body.marketingOptIn === true,
  };
}

// The whole write, in one transaction: find or create the guest, record the
// request, queue the guest's email and Bo's. Either all of it lands or none
// of it does, so there is never a request nobody was told about.
export async function createBookingRequest({ stayInput, contact, ipHash }) {
  const check = await checkStay(stayInput);
  if (check.error) return check;

  if (contact.numGuests > check.maxGuests) {
    return { error: `${check.title} sleeps ${check.maxGuests}.` };
  }
  if (!check.meetsMinNights) {
    return {
      error: `The minimum stay for these dates is ${check.minNightsRequired} nights.`,
    };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: recent } = await client.query(
      `SELECT count(*)::int AS n FROM booking_requests
        WHERE ip_hash = $1 AND created_at > now() - interval '1 hour'`,
      [ipHash]
    );
    if (recent[0].n >= RATE_LIMIT_PER_HOUR) {
      await client.query('ROLLBACK');
      return {
        error: 'You have sent several requests in the last hour. Email us and we will sort it out.',
        status: 429,
      };
    }

    // Never update an existing guest from a public form beyond consent: it
    // would let anyone who knows an address rewrite that guest's record.
    const { rows: existing } = await client.query(
      `SELECT id FROM guests
        WHERE lower(email) = $1 AND deleted_at IS NULL
        ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
      [contact.email]
    );

    let guestId;
    if (existing.length) {
      guestId = existing[0].id;
      if (contact.marketingOptIn) {
        await client.query(
          `UPDATE guests
              SET marketing_consent = 'opted_in', marketing_consent_at = now(),
                  marketing_consent_source = 'booking_form', updated_at = now()
            WHERE id = $1`,
          [guestId]
        );
      }
    } else {
      const { rows } = await client.query(
        `INSERT INTO guests (first_name, last_name, email, phone, source,
                             marketing_consent, marketing_consent_at, marketing_consent_source)
         VALUES ($1, $2, $3, $4, 'direct', $5, $6, $7)
         RETURNING id`,
        [
          contact.firstName,
          contact.lastName,
          contact.email,
          contact.phone,
          contact.marketingOptIn ? 'opted_in' : 'unknown',
          contact.marketingOptIn ? new Date() : null,
          contact.marketingOptIn ? 'booking_form' : null,
        ]
      );
      guestId = rows[0].id;
    }

    const status = check.available ? 'pending' : 'waitlisted';
    const { rows: requestRows } = await client.query(
      `INSERT INTO booking_requests
         (property_id, check_in, check_out, num_guests, guest_id,
          first_name, last_name, email, phone, message,
          status, available_when_requested, quoted_total, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        check.propertyId, check.checkIn, check.checkOut, contact.numGuests, guestId,
        contact.firstName, contact.lastName, contact.email, contact.phone, contact.message,
        status, check.available, check.quote?.displayTotal ?? null, ipHash,
      ]
    );
    const requestId = requestRows[0].id;

    const payload = {
      requestId,
      reference: requestId.slice(0, 8).toUpperCase(),
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      message: contact.message,
      propertyId: check.propertyId,
      propertyTitle: check.title,
      checkIn: check.checkIn,
      checkOut: check.checkOut,
      nights: check.nights,
      numGuests: contact.numGuests,
      quotedTotal: check.quote?.displayTotal ?? null,
      status,
      alternatives: check.alternatives,
      marketingOptIn: contact.marketingOptIn,
    };

    const { rows: cfg } = await client.query('SELECT contact_email FROM site_config WHERE id = 1');
    const ownerEmail = cfg[0]?.contact_email || 'wolfcreeklodge@outlook.com';

    await client.query(
      `INSERT INTO outbound_emails (kind, to_email, guest_id, booking_request_id, payload)
       VALUES ($1, $2, $3, $4, $5), ('owner_new_request', $6, $3, $4, $5)`,
      [
        status === 'pending' ? 'request_received' : 'request_waitlisted',
        contact.email, guestId, requestId, payload, ownerEmail,
      ]
    );

    await client.query('COMMIT');
    return { ok: true, requestId, reference: payload.reference, status, check };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
