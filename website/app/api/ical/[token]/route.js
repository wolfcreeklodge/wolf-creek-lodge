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
      `SELECT id, title, is_combo_listing, combined_listings
       FROM properties WHERE ical_export_token = $1`,
      [token]
    );

    if (propRows.length === 0) {
      return new Response('Not found', { status: 404 });
    }

    const property = propRows[0];

    // 2. Determine which property IDs block this property
    const blockingIds = [property.id];

    if (property.is_combo_listing && Array.isArray(property.combined_listings)) {
      // Retreat: also blocked by its component listings
      blockingIds.push(...property.combined_listings);
    } else {
      // Individual unit: also blocked by any combo that includes it
      const { rows: combos } = await pool.query(
        `SELECT id FROM properties
         WHERE is_combo_listing = true AND combined_listings ? $1`,
        [property.id]
      );
      blockingIds.push(...combos.map(c => c.id));
    }

    // 3. Query active reservations for all blocking properties
    const { rows: reservations } = await pool.query(
      `SELECT id, check_in, check_out
       FROM reservations
       WHERE property_id = ANY($1)
         AND status NOT IN ('cancelled', 'no_show')
       ORDER BY check_in`,
      [blockingIds]
    );

    // 4. Generate iCal
    const now = formatDateTimeUTC(new Date());
    const events = reservations.map(r => [
      'BEGIN:VEVENT',
      `UID:${r.id}@wolfcreeklodge.us`,
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
