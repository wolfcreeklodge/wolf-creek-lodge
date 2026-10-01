import pool from '../../../../lib/db.js';

/**
 * GET /api/ical/{ical_export_token}
 *
 * Returns an iCal (RFC 5545) feed of blocked dates for a property,
 * looked up by its ical_export_token. Airbnb/VRBO import this URL.
 */
export async function GET(request, { params }) {
  const { token } = await params;

  try {
    // 1. Look up property by ical_export_token
    const { rows: propRows } = await pool.query(
      `SELECT id, title FROM properties WHERE ical_export_token = $1`,
      [token]
    );

    if (propRows.length === 0) {
      return new Response('Not found', { status: 404 });
    }

    const property = propRows[0];

    // 2. Everything that closes this property's dates. effective_blocks()
    // (database/08-calendar-blocks.sql) applies the exclusivity rule. This feed
    // matters most: Airbnb imports it, so a Retreat mirror of an Apartment
    // booking exported on the House's feed used to close the House on Airbnb.
    const { rows: reservations } = await pool.query(
      `SELECT reservation_id AS id, check_in, check_out, partial
       FROM effective_blocks($1, NULL, NULL)
       ORDER BY check_in`,
      [property.id]
    );

    // 3. Generate iCal. A clipped mirror can come back as several ranges of
    // one reservation, so those UIDs carry their start date to stay unique.
    const now = formatDateTimeUTC(new Date());
    const events = reservations.map(r => [
      'BEGIN:VEVENT',
      `UID:${r.id}${r.partial ? `-${formatDateOnly(r.check_in)}` : ''}@wolfcreeklodge.us`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${formatDateOnly(r.check_in)}`,
      `DTEND;VALUE=DATE:${formatDateOnly(r.check_out)}`,
      'SUMMARY:Reserved',
      'END:VEVENT',
    ].join('\r\n'));

    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wolf Creek Lodge//Availability//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${property.title} Availability`,
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    return new Response(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('iCal export error:', err);
    return new Response('Internal server error', { status: 500 });
  }
}

function formatDateOnly(date) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function formatDateTimeUTC(date) {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${mo}${d}T${h}${mi}${s}Z`;
}
