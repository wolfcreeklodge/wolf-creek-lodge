import { Router } from 'express';
import pool from '../db.js';

// Read-only view of outbound_emails: what went out, what is waiting, what
// failed and why. In EMAIL_PROVIDER=log mode this is also the only place a
// "sent" message can be read, since nothing actually leaves.
const router = Router();

router.get('/', async (req, res) => {
  try {
    const params = [];
    const where = [];
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`e.status = $${params.length}`);
    }
    if (req.query.kind) {
      params.push(req.query.kind);
      where.push(`e.kind = $${params.length}`);
    }
    const { rows } = await pool.query(
      `SELECT e.id, e.kind, e.to_email, e.status, e.subject, e.attempts, e.last_error,
              e.provider, e.created_at, e.sent_at, e.booking_request_id, e.promotion_id,
              coalesce((e.payload->>'test')::boolean, false) AS is_test
         FROM outbound_emails e
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY e.created_at DESC
        LIMIT 200`,
      params
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /api/outbox error:', err);
    res.status(500).json({ error: 'Failed to load outbox' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM outbound_emails WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/outbox/:id error:', err);
    res.status(500).json({ error: 'Failed to load message' });
  }
});

export default router;
