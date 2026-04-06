import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/activity
router.get('/', async (req, res) => {
  try {
    const {
      entity_type,
      entity_id,
      page = 1,
      limit = 50,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];
    let paramIdx = 0;

    if (entity_type) {
      paramIdx++;
      conditions.push(`entity_type = $${paramIdx}`);
      params.push(entity_type);
    }

    if (entity_id) {
      paramIdx++;
      conditions.push(`entity_id = $${paramIdx}`);
      params.push(entity_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM activity_log ${whereClause}`, params
    );
    const total = parseInt(countResult.rows[0].total);

    const limitParam = paramIdx + 1;
    const offsetParam = paramIdx + 2;
    const { rows: entries } = await pool.query(`
      SELECT * FROM activity_log
      ${whereClause}
      ORDER BY logged_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `, [...params, limitNum, offset]);

    res.json({ entries, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('GET /api/activity error:', err);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

export default router;
