import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/guests
router.get('/', async (req, res) => {
  try {
    const {
      search,
      property,
      channel,
      tag,
      has_balance,
      sort = 'name',
      order = 'asc',
      page = 1,
      limit = 25,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const offset = (pageNum - 1) * limitNum;
    const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const conditions = ['g.deleted_at IS NULL'];
    const params = [];
    let paramIdx = 0;

    if (search) {
      paramIdx++;
      const p = paramIdx;
      conditions.push(`(g.first_name ILIKE $${p} OR g.last_name ILIKE $${p} OR g.email ILIKE $${p} OR g.phone ILIKE $${p})`);
      params.push(`%${search}%`);
    }

    if (tag) {
      paramIdx++;
      conditions.push(`g.tags::text ILIKE $${paramIdx}`);
      params.push(`%${tag}%`);
    }

    let joinClause = '';
    const needsReservationJoin = property || channel || has_balance === 'true' || sort === 'last_stay' || sort === 'revenue' || sort === 'stays';

    if (needsReservationJoin) {
      joinClause = 'LEFT JOIN reservations r ON r.guest_id = g.id';

      if (property) {
        paramIdx++;
        conditions.push(`r.property_id = $${paramIdx}`);
        params.push(property);
      }

      if (channel) {
        paramIdx++;
        conditions.push(`r.booking_channel = $${paramIdx}`);
        params.push(channel);
      }

      if (has_balance === 'true') {
        conditions.push('r.amount_paid < r.total_amount AND r.total_amount > 0');
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderClause;
    switch (sort) {
      case 'last_stay':
        orderClause = `ORDER BY MAX(r.check_in) ${sortOrder} NULLS LAST`;
        break;
      case 'revenue':
        orderClause = `ORDER BY COALESCE(SUM(r.total_amount), 0) ${sortOrder}`;
        break;
      case 'stays':
        orderClause = `ORDER BY COUNT(DISTINCT r.id) ${sortOrder}`;
        break;
      case 'name':
      default:
        orderClause = `ORDER BY g.last_name ${sortOrder}, g.first_name ${sortOrder}`;
        break;
    }

    const groupBy = needsReservationJoin ? 'GROUP BY g.id' : '';

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT g.id) as total FROM guests g ${joinClause} ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Fetch guests
    const limitParam = paramIdx + 1;
    const offsetParam = paramIdx + 2;
    const sql = `
      SELECT g.*,
        ${needsReservationJoin ? `
          COUNT(DISTINCT r.id) as reservation_count,
          COALESCE(SUM(r.total_amount), 0) as total_revenue,
          MAX(r.check_in) as last_stay_date
        ` : `
          0 as reservation_count,
          0 as total_revenue,
          NULL as last_stay_date
        `}
      FROM guests g ${joinClause}
      ${whereClause}
      ${groupBy}
      ${orderClause}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;
    const { rows: guests } = await pool.query(sql, [...params, limitNum, offset]);

    // Stats
    const statsResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM guests WHERE deleted_at IS NULL) as total_guests,
        (SELECT COUNT(*) FROM reservations WHERE check_in >= CURRENT_DATE AND status = 'confirmed') as upcoming_reservations,
        (SELECT COALESCE(SUM(total_amount - amount_paid), 0) FROM reservations WHERE amount_paid < total_amount AND total_amount > 0) as outstanding_balances,
        (SELECT COUNT(*) FROM (SELECT guest_id FROM reservations GROUP BY guest_id HAVING COUNT(*) > 1) sub) as repeat_guests
    `);
    const stats = statsResult.rows[0];

    res.json({ guests, total, page: pageNum, limit: limitNum, stats });
  } catch (err) {
    console.error('GET /api/guests error:', err);
    res.status(500).json({ error: 'Failed to fetch guests' });
  }
});

// POST /api/guests
router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, city, state_province, country,
      instagram, whatsapp, facebook, linkedin, source, tags, notes
    } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'first_name and last_name are required' });
    }

    const validSources = ['airbnb', 'vrbo', 'direct', 'referral', 'other'];
    const guestSource = validSources.includes(source) ? source : 'other';
    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : (tags || '[]');

    const { rows } = await pool.query(`
      INSERT INTO guests (first_name, last_name, email, phone, city, state_province, country,
        instagram, whatsapp, facebook, linkedin, source, tags, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      first_name, last_name, email || null, phone || null,
      city || null, state_province || null, country || 'US',
      instagram || null, whatsapp || null, facebook || null, linkedin || null,
      guestSource, tagsJson, notes || null
    ]);

    const guest = rows[0];

    // Log activity
    await pool.query(`
      INSERT INTO activity_log (user_email, entity_type, entity_id, action, diff)
      VALUES ($1, 'guest', $2, 'created', $3)
    `, [req.user.email, guest.id, JSON.stringify(req.body)]);

    res.status(201).json(guest);
  } catch (err) {
    console.error('POST /api/guests error:', err);
    res.status(500).json({ error: 'Failed to create guest' });
  }
});

// GET /api/guests/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows: guestRows } = await pool.query(
      'SELECT * FROM guests WHERE id = $1 AND deleted_at IS NULL', [req.params.id]
    );
    if (guestRows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    const guest = guestRows[0];

    // Get reservations with payments
    const { rows: reservations } = await pool.query(
      'SELECT * FROM reservations WHERE guest_id = $1 ORDER BY check_in DESC', [req.params.id]
    );

    for (const r of reservations) {
      const { rows: payments } = await pool.query(
        'SELECT * FROM payments WHERE reservation_id = $1 ORDER BY paid_at DESC', [r.id]
      );
      r.payments = payments;
      r.num_nights = Math.max(1, Math.ceil((new Date(r.check_out) - new Date(r.check_in)) / (1000 * 60 * 60 * 24)));
      r.outstanding_balance = Math.max(0, parseFloat(r.total_amount) - parseFloat(r.amount_paid));
    }

    // Compute lifetime stats
    const completedReservations = reservations.filter(r => r.status !== 'cancelled');
    const totalStays = completedReservations.length;
    const totalRevenue = completedReservations.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
    const avgNightlyRate = completedReservations.length > 0
      ? completedReservations.reduce((sum, r) => sum + parseFloat(r.nightly_rate || 0), 0) / completedReservations.length
      : 0;
    const avgPartySize = completedReservations.length > 0
      ? completedReservations.reduce((sum, r) => sum + (r.num_guests || 0), 0) / completedReservations.length
      : 0;

    // Preferred property
    const propertyCounts = {};
    completedReservations.forEach(r => {
      propertyCounts[r.property_id] = (propertyCounts[r.property_id] || 0) + 1;
    });
    const preferredProperty = Object.entries(propertyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Last and next stay
    const now = new Date().toISOString().split('T')[0];
    const pastStays = completedReservations.filter(r => r.check_in <= now);
    const futureStays = completedReservations.filter(r => r.check_in > now && r.status === 'confirmed');
    const lastStayDate = pastStays.length > 0 ? pastStays[0].check_in : null;
    const nextStayDate = futureStays.length > 0 ? futureStays[futureStays.length - 1].check_in : null;

    res.json({
      ...guest,
      reservations,
      lifetime_stats: {
        total_stays: totalStays,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        avg_nightly_rate: Math.round(avgNightlyRate * 100) / 100,
        preferred_property: preferredProperty,
        avg_party_size: Math.round(avgPartySize * 10) / 10,
        last_stay_date: lastStayDate,
        next_stay_date: nextStayDate,
      },
    });
  } catch (err) {
    console.error('GET /api/guests/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch guest' });
  }
});

// PUT /api/guests/:id
router.put('/:id', async (req, res) => {
  try {
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM guests WHERE id = $1 AND deleted_at IS NULL', [req.params.id]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    const existing = existingRows[0];

    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'city', 'state_province',
      'country', 'instagram', 'whatsapp', 'facebook', 'linkedin', 'source', 'tags', 'notes'
    ];

    const updates = [];
    const values = [];
    const diff = {};
    let paramIdx = 0;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];
        if (field === 'tags' && Array.isArray(value)) {
          value = JSON.stringify(value);
        }
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

    await pool.query(`UPDATE guests SET ${updates.join(', ')} WHERE id = $${paramIdx}`, values);

    // Log activity
    if (Object.keys(diff).length > 0) {
      await pool.query(`
        INSERT INTO activity_log (user_email, entity_type, entity_id, action, diff)
        VALUES ($1, 'guest', $2, 'updated', $3)
      `, [req.user.email, req.params.id, JSON.stringify(diff)]);
    }

    const { rows: updatedRows } = await pool.query('SELECT * FROM guests WHERE id = $1', [req.params.id]);

    res.json(updatedRows[0]);
  } catch (err) {
    console.error('PUT /api/guests/:id error:', err);
    res.status(500).json({ error: 'Failed to update guest' });
  }
});

// DELETE /api/guests/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM guests WHERE id = $1 AND deleted_at IS NULL', [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    await pool.query(
      'UPDATE guests SET deleted_at = now(), updated_at = now() WHERE id = $1', [req.params.id]
    );

    await pool.query(`
      INSERT INTO activity_log (user_email, entity_type, entity_id, action, diff)
      VALUES ($1, 'guest', $2, 'deleted', NULL)
    `, [req.user.email, req.params.id]);

    res.json({ ok: true, message: 'Guest soft-deleted' });
  } catch (err) {
    console.error('DELETE /api/guests/:id error:', err);
    res.status(500).json({ error: 'Failed to delete guest' });
  }
});

export default router;
