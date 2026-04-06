import { Router } from 'express';
import { stringify } from 'csv-stringify/sync';
import pool from '../db.js';

const router = Router();

// GET /api/export
router.get('/', async (req, res) => {
  try {
    const format = (req.query.format || 'json').toLowerCase();

    // Fetch all non-deleted guests with aggregated reservation data
    const { rows: guests } = await pool.query(`
      SELECT g.*,
        COUNT(DISTINCT r.id) as reservation_count,
        COALESCE(SUM(r.total_amount), 0) as total_revenue,
        COALESCE(SUM(r.amount_paid), 0) as total_paid,
        MAX(r.check_in) as last_stay,
        MIN(CASE WHEN r.check_in >= CURRENT_DATE THEN r.check_in END) as next_stay
      FROM guests g
      LEFT JOIN reservations r ON r.guest_id = g.id AND r.status != 'cancelled'
      WHERE g.deleted_at IS NULL
      GROUP BY g.id
      ORDER BY g.last_name, g.first_name
    `);

    if (format === 'csv') {
      // Flatten for CSV
      const csvData = guests.map(g => ({
        id: g.id,
        first_name: g.first_name,
        last_name: g.last_name,
        email: g.email || '',
        phone: g.phone || '',
        city: g.city || '',
        state_province: g.state_province || '',
        country: g.country || '',
        instagram: g.instagram || '',
        whatsapp: g.whatsapp || '',
        facebook: g.facebook || '',
        linkedin: g.linkedin || '',
        source: g.source,
        tags: JSON.stringify(g.tags || []),
        notes: g.notes || '',
        reservation_count: g.reservation_count,
        total_revenue: g.total_revenue,
        total_paid: g.total_paid,
        last_stay: g.last_stay || '',
        next_stay: g.next_stay || '',
        created_at: g.created_at,
      }));

      const csv = stringify(csvData, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="wolf-creek-lodge-guests.csv"');
      return res.send(csv);
    }

    // JSON format: include full reservation and payment data
    const guestsWithReservations = [];
    for (const g of guests) {
      const { rows: reservations } = await pool.query(
        'SELECT * FROM reservations WHERE guest_id = $1 ORDER BY check_in DESC', [g.id]
      );

      for (const r of reservations) {
        const { rows: payments } = await pool.query(
          'SELECT * FROM payments WHERE reservation_id = $1 ORDER BY paid_at DESC', [r.id]
        );
        r.payments = payments;
      }

      guestsWithReservations.push({ ...g, reservations });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="wolf-creek-lodge-guests.json"');
    res.json(guestsWithReservations);
  } catch (err) {
    console.error('GET /api/export error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;
