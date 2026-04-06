import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/emails
router.get('/', async (req, res) => {
  try {
    const { guest_id, reservation_id, page = 1, limit = 25 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 25));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];
    let paramIdx = 0;

    if (guest_id) {
      paramIdx++;
      conditions.push(`e.guest_id = $${paramIdx}`);
      params.push(guest_id);
    }

    if (reservation_id) {
      paramIdx++;
      conditions.push(`e.reservation_id = $${paramIdx}`);
      params.push(reservation_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM emails e ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Fetch emails
    const limitParam = paramIdx + 1;
    const offsetParam = paramIdx + 2;
    const sql = `
      SELECT e.*
      FROM emails e
      ${whereClause}
      ORDER BY e.received_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;
    const { rows: emails } = await pool.query(sql, [...params, limitNum, offset]);

    res.json({ emails, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('GET /api/emails error:', err);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// GET /api/emails/sync-status
router.get('/sync-status', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT last_sync_at,
        (access_token IS NOT NULL AND access_token != '') as has_tokens
      FROM email_sync_state
      ORDER BY last_sync_at DESC NULLS LAST
      LIMIT 1`
    );

    if (rows.length === 0) {
      return res.json({ last_sync_at: null, has_tokens: false });
    }

    res.json({
      last_sync_at: rows[0].last_sync_at,
      has_tokens: rows[0].has_tokens,
    });
  } catch (err) {
    console.error('GET /api/emails/sync-status error:', err);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

export default router;
