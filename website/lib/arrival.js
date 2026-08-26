import pool from './db.js';

// ---------------------------------------------------------------------------
// Arrival lookup.
//
// The /arrival/{token} page hands out the exact route to the house, which is
// deliberately not public. Access is by unguessable token only, the same
// pattern properties.ical_export_token already uses. See
// database/05-arrival-tokens.sql.
//
// A cancelled or no-show reservation resolves to null, so revoking access is
// just a status change -- no separate revocation step to forget.
// ---------------------------------------------------------------------------
export async function getReservationByArrivalToken(token) {
  if (!token || typeof token !== 'string') return null;

  const { rows } = await pool.query(
    `SELECT r.id,
            r.check_in,
            r.check_out,
            r.num_guests,
            r.status,
            p.id    AS property_id,
            p.title AS property_title,
            g.first_name
       FROM reservations r
       JOIN properties p ON p.id = r.property_id
       LEFT JOIN guests g ON g.id = r.guest_id
      WHERE r.arrival_token = $1
        AND r.status NOT IN ('cancelled', 'no_show')`,
    [token]
  );

  if (!rows[0]) return null;
  const r = rows[0];

  const asDate = (d) =>
    d instanceof Date ? d.toISOString().slice(0, 10) : String(d);

  return {
    id: r.id,
    checkIn: asDate(r.check_in),
    checkOut: asDate(r.check_out),
    numGuests: r.num_guests,
    status: r.status,
    propertyId: r.property_id,
    propertyTitle: r.property_title,
    firstName: r.first_name || null,
  };
}
