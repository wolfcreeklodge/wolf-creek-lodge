import { Router } from 'express';
import pool from '../db.js';

// ---------------------------------------------------------------------------
// Booking requests and the waitlist.
//
// The waitlist is not its own table: it is the requests whose status is
// 'waitlisted'. Every list here carries now_available, computed live from
// stay_is_available(), so a waitlisted request whose dates have come free
// (a cancellation, an Airbnb booking dropping out of the iCal feed) shows up
// as actionable without anyone having to go and look.
//
// Nothing here notifies a waitlisted guest automatically. The iCal feed does
// flicker -- Airbnb's rolling availability window alone cancels and recreates
// a block every day -- and an automatic "your dates are free" on a flicker
// would promise a guest something that is not true. Bo clicks Offer.
// ---------------------------------------------------------------------------

const router = Router();

const OPEN_STATUSES = ['pending', 'waitlisted', 'offered'];
const ALL_STATUSES = ['pending', 'waitlisted', 'offered', 'confirmed', 'declined', 'withdrawn'];

const SELECT_REQUEST = `
  SELECT br.*,
         p.title AS property_title,
         (br.check_out - br.check_in) AS nights,
         stay_is_available(br.property_id, br.check_in, br.check_out) AS now_available,
         g.marketing_consent
    FROM booking_requests br
    JOIN properties p ON p.id = br.property_id
    LEFT JOIN guests g ON g.id = br.guest_id`;

function payloadFor(row) {
  return {
    requestId: row.id,
    reference: row.id.slice(0, 8).toUpperCase(),
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    checkIn: row.check_in.toISOString().slice(0, 10),
    checkOut: row.check_out.toISOString().slice(0, 10),
    nights: row.nights,
    numGuests: row.num_guests,
    quotedTotal: row.quoted_total,
  };
}

async function loadRequest(client, id) {
  const { rows } = await client.query(`${SELECT_REQUEST} WHERE br.id = $1`, [id]);
  return rows[0] || null;
}

// GET /api/booking-requests?status=open|waitlisted|...
router.get('/', async (req, res) => {
  try {
    const status = req.query.status || 'open';
    let where;
    let params;
    if (status === 'open') {
      where = 'WHERE br.status = ANY($1)';
      params = [OPEN_STATUSES];
    } else if (status === 'all') {
      where = '';
      params = [];
    } else if (status === 'closed') {
      where = "WHERE br.status IN ('declined', 'withdrawn')";
      params = [];
    } else if (ALL_STATUSES.includes(status)) {
      where = 'WHERE br.status = $1';
      params = [status];
    } else {
      return res.status(400).json({ error: 'Unknown status filter' });
    }
    // Soonest stay first for open work; most recent first for history.
    const order = status === 'open' || status === 'waitlisted' || status === 'pending'
      ? 'ORDER BY br.check_in ASC, br.created_at ASC'
      : 'ORDER BY br.updated_at DESC';
    const { rows } = await pool.query(`${SELECT_REQUEST} ${where} ${order} LIMIT 200`, params);
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /api/booking-requests error:', err);
    res.status(500).json({ error: 'Failed to load booking requests' });
  }
});

// GET /api/booking-requests/counts -- for the nav badge and the dashboard.
router.get('/counts', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        count(*) FILTER (WHERE status = 'pending')::int    AS pending,
        count(*) FILTER (WHERE status = 'waitlisted')::int AS waitlisted,
        count(*) FILTER (WHERE status = 'offered')::int    AS offered,
        count(*) FILTER (WHERE status = 'waitlisted'
                           AND stay_is_available(property_id, check_in, check_out))::int
                                                           AS waitlisted_now_available
      FROM booking_requests`);
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/booking-requests/counts error:', err);
    res.status(500).json({ error: 'Failed to load counts' });
  }
});

// POST /api/booking-requests/:id/confirm
// Turns a request into a real reservation. The INSERT is what the overlap
// triggers police, so if the dates went in the meantime -- Airbnb, or another
// request confirmed first -- Postgres refuses it and this returns 409 rather
// than double-booking.
router.post('/:id/confirm', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = await loadRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }
    if (!['pending', 'offered', 'waitlisted'].includes(request.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `This request is already ${request.status}.` });
    }
    if (!request.guest_id) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This request has no guest record to book against.' });
    }

    const total = request.quoted_total != null ? Number(request.quoted_total) : 0;
    const nightly = total && request.nights ? Math.round((total / request.nights) * 100) / 100 : null;

    let reservation;
    try {
      const { rows } = await client.query(
        `INSERT INTO reservations
           (guest_id, property_id, check_in, check_out, num_guests,
            nightly_rate, total_amount, booking_channel, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'direct', 'confirmed', $8)
         RETURNING *`,
        [
          request.guest_id, request.property_id, request.check_in, request.check_out,
          request.num_guests, nightly, total,
          `From booking request ${request.id.slice(0, 8).toUpperCase()}` +
            (request.message ? `\n\nGuest wrote: ${request.message}` : ''),
        ]
      );
      reservation = rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      if (/overlap|conflict/i.test(err.message)) {
        return res.status(409).json({
          error: 'Those dates are no longer free. Someone else has them now -- decline this one, or leave it on the waitlist.',
        });
      }
      throw err;
    }

    await client.query(
      `UPDATE booking_requests
          SET status = 'confirmed', reservation_id = $2, updated_at = now()
        WHERE id = $1`,
      [request.id, reservation.id]
    );
    await client.query(
      `INSERT INTO activity_log (user_email, entity_type, entity_id, action, diff)
       VALUES ($1, 'reservation', $2, 'created', $3)`,
      [req.user.email, reservation.id,
        JSON.stringify({ from_booking_request: request.id })]
    );
    await client.query('COMMIT');
    res.json({ ok: true, reservation });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /api/booking-requests/:id/confirm error:', err);
    res.status(500).json({ error: 'Failed to confirm request' });
  } finally {
    client.release();
  }
});

// POST /api/booking-requests/:id/offer
// For a waitlisted request whose dates are free again: email the guest and
// mark it offered. Refuses if the dates are still taken, so Bo cannot tell
// someone a weekend is open when the calendar says it is not.
router.post('/:id/offer', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = await loadRequest(client, req.params.id);
    if (!request) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }
    if (request.status !== 'waitlisted') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Only waitlisted requests can be offered; this one is ${request.status}.` });
    }
    if (!request.now_available) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Those dates are still booked.' });
    }
    await client.query(
      `INSERT INTO outbound_emails (kind, to_email, guest_id, booking_request_id, payload)
       VALUES ('dates_available', $1, $2, $3, $4)`,
      [request.email, request.guest_id, request.id, payloadFor(request)]
    );
    await client.query(
      `UPDATE booking_requests SET status = 'offered', offered_at = now(), updated_at = now()
        WHERE id = $1`,
      [request.id]
    );
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /api/booking-requests/:id/offer error:', err);
    res.status(500).json({ error: 'Failed to offer dates' });
  } finally {
    client.release();
  }
});

// POST /api/booking-requests/:id/status { status: 'declined' | 'withdrawn' | 'waitlisted' }
// Closing a request, or putting an offered one back on the list if the guest
// did not answer. No email: declining is a conversation Bo has himself.
router.post('/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!['declined', 'withdrawn', 'waitlisted'].includes(status)) {
    return res.status(400).json({ error: 'status must be declined, withdrawn or waitlisted' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE booking_requests SET status = $2, updated_at = now()
        WHERE id = $1 AND status = ANY($3)
        RETURNING id, status`,
      [req.params.id, status, OPEN_STATUSES]
    );
    if (!rows[0]) {
      return res.status(409).json({ error: 'That request is not open, or does not exist.' });
    }
    res.json({ ok: true, ...rows[0] });
  } catch (err) {
    console.error('POST /api/booking-requests/:id/status error:', err);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

export default router;
