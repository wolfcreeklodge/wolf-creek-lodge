import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/reservations
router.get('/', async (req, res) => {
  try {
    const {
      property,
      status,
      payment_status,
      from,
      to,
      guest_id,
      sort = 'check_in',
      order = 'desc',
      page = 1,
      limit = 25,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const offset = (pageNum - 1) * limitNum;
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];
    let paramIdx = 0;

    if (property) {
      paramIdx++;
      conditions.push(`r.property_id = $${paramIdx}`);
      params.push(property);
    }
    if (status) {
      paramIdx++;
      conditions.push(`r.status = $${paramIdx}`);
      params.push(status);
    }
    if (payment_status) {
      paramIdx++;
      conditions.push(`r.payment_status = $${paramIdx}`);
      params.push(payment_status);
    }
    if (from) {
      paramIdx++;
      conditions.push(`r.check_in >= $${paramIdx}`);
      params.push(from);
    }
    if (to) {
      paramIdx++;
      conditions.push(`r.check_in <= $${paramIdx}`);
      params.push(to);
    }
    if (guest_id) {
      paramIdx++;
      conditions.push(`r.guest_id = $${paramIdx}::uuid`);
      params.push(guest_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSorts = ['check_in', 'check_out', 'total_amount', 'created_at', 'property_id', 'status'];
    const sortField = allowedSorts.includes(sort) ? `r.${sort}` : 'r.check_in';
    const orderClause = `ORDER BY ${sortField} ${sortOrder}`;

    // Count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM reservations r ${whereClause}`, params
    );
    const total = parseInt(countResult.rows[0].total);

    // Fetch
    const limitParam = paramIdx + 1;
    const offsetParam = paramIdx + 2;
    const sql = `
      SELECT r.*,
        g.first_name as guest_first_name,
        g.last_name as guest_last_name,
        g.email as guest_email,
        (r.check_out - r.check_in) as num_nights,
        GREATEST(0, r.total_amount - r.amount_paid) as outstanding_balance
      FROM reservations r
      JOIN guests g ON g.id = r.guest_id
      ${whereClause}
      ${orderClause}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const { rows: reservations } = await pool.query(sql, [...params, limitNum, offset]);

    res.json({ reservations, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('GET /api/reservations error:', err);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// POST /api/reservations
router.post('/', async (req, res) => {
  try {
    const {
      guest_id, property_id, check_in, check_out, num_guests,
      nightly_rate, total_amount, amount_paid, payment_status,
      payment_method, booking_channel, channel_conf_code,
      calendar_link, status, notes
    } = req.body;

    // Validate required fields
    if (!guest_id || !property_id || !check_in || !check_out) {
      return res.status(400).json({ error: 'guest_id, property_id, check_in, and check_out are required' });
    }

    // Validate guest exists
    const { rows: guestRows } = await pool.query(
      'SELECT id FROM guests WHERE id = $1 AND deleted_at IS NULL', [guest_id]
    );
    if (guestRows.length === 0) {
      return res.status(400).json({ error: 'Guest not found' });
    }

    // Validate property exists
    const { rows: propRows } = await pool.query(
      'SELECT id FROM properties WHERE id = $1', [property_id]
    );
    if (propRows.length === 0) {
      return res.status(400).json({ error: 'Invalid property_id. Check the properties table for valid IDs.' });
    }

    // Validate dates
    if (check_out <= check_in) {
      return res.status(400).json({ error: 'check_out must be after check_in' });
    }

    // Check for overlapping reservations (warn, don't block)
    const { rows: overlaps } = await pool.query(`
      SELECT id, check_in, check_out FROM reservations
      WHERE property_id = $1 AND status != 'cancelled'
        AND check_in < $2::date AND check_out > $3::date
    `, [property_id, check_out, check_in]);

    const numNights = Math.max(1, Math.ceil((new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24)));

    const validChannels = ['airbnb', 'vrbo', 'direct', 'phone', 'other'];
    const validStatuses = ['confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'];
    const validPaymentStatuses = ['unpaid', 'advance', 'paid_in_full', 'refunded'];

    const { rows } = await pool.query(`
      INSERT INTO reservations (
        guest_id, property_id, check_in, check_out, num_guests, nightly_rate,
        total_amount, amount_paid, payment_status, payment_method,
        booking_channel, channel_conf_code, calendar_link, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      guest_id, property_id, check_in, check_out,
      num_guests || null,
      nightly_rate || null,
      total_amount || 0,
      amount_paid || 0,
      validPaymentStatuses.includes(payment_status) ? payment_status : 'unpaid',
      payment_method || null,
      validChannels.includes(booking_channel) ? booking_channel : 'other',
      channel_conf_code || null,
      calendar_link || null,
      validStatuses.includes(status) ? status : 'confirmed',
      notes || null
    ]);

    const reservation = rows[0];

    // Log activity
    await pool.query(`
      INSERT INTO activity_log (user_email, entity_type, entity_id, action, diff)
      VALUES ($1, 'reservation', $2, 'created', $3)
    `, [req.user.email, reservation.id, JSON.stringify(req.body)]);

    const response = { ...reservation, num_nights: numNights };
    if (overlaps.length > 0) {
      response.warnings = [{
        type: 'overlap',
        message: `This reservation overlaps with ${overlaps.length} existing reservation(s) on ${property_id}`,
        overlapping_ids: overlaps.map(o => o.id),
      }];
    }

    res.status(201).json(response);
  } catch (err) {
    console.error('POST /api/reservations error:', err);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// GET /api/reservations/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*,
        g.first_name as guest_first_name,
        g.last_name as guest_last_name,
        g.email as guest_email,
        g.phone as guest_phone,
        (r.check_out - r.check_in) as num_nights,
        GREATEST(0, r.total_amount - r.amount_paid) as outstanding_balance
      FROM reservations r
      JOIN guests g ON g.id = r.guest_id
      WHERE r.id = $1
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = rows[0];
    const { rows: payments } = await pool.query(
      'SELECT * FROM payments WHERE reservation_id = $1 ORDER BY paid_at DESC', [req.params.id]
    );
    reservation.payments = payments;

    res.json(reservation);
  } catch (err) {
    console.error('GET /api/reservations/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

// PUT /api/reservations/:id
router.put('/:id', async (req, res) => {
  try {
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM reservations WHERE id = $1', [req.params.id]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    const existing = existingRows[0];

    const allowedFields = [
      'property_id', 'check_in', 'check_out', 'num_guests', 'nightly_rate',
      'total_amount', 'amount_paid', 'payment_status', 'payment_method',
      'booking_channel', 'channel_conf_code', 'calendar_link', 'status', 'notes'
    ];

    const updates = [];
    const values = [];
    const diff = {};
    let paramIdx = 0;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const value = req.body[field];
        if (existing[field] !== value) {
          diff[field] = { from: existing[field], to: value };
        }
        paramIdx++;
        updates.push(`${field} = $${paramIdx}`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = now()');
    paramIdx++;
    values.push(req.params.id);

    await pool.query(
      `UPDATE reservations SET ${updates.join(', ')} WHERE id = $${paramIdx}`, values
    );

    // Log activity
    if (Object.keys(diff).length > 0) {
      await pool.query(`
        INSERT INTO activity_log (user_email, entity_type, entity_id, action, diff)
        VALUES ($1, 'reservation', $2, 'updated', $3)
      `, [req.user.email, req.params.id, JSON.stringify(diff)]);
    }

    const { rows: updatedRows } = await pool.query(`
      SELECT r.*,
        (r.check_out - r.check_in) as num_nights,
        GREATEST(0, r.total_amount - r.amount_paid) as outstanding_balance
      FROM reservations r WHERE r.id = $1
    `, [req.params.id]);

    res.json(updatedRows[0]);
  } catch (err) {
    console.error('PUT /api/reservations/:id error:', err);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

export default router;
