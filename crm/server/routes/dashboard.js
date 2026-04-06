import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Upcoming check-ins (7 days)
    const { rows: upcoming7d } = await pool.query(`
      SELECT r.*, g.first_name, g.last_name, g.email, g.phone,
        (r.check_out - r.check_in) as num_nights
      FROM reservations r
      JOIN guests g ON g.id = r.guest_id
      WHERE r.check_in >= $1 AND r.check_in <= $2
        AND r.status IN ('confirmed', 'checked_in')
      ORDER BY r.check_in ASC
    `, [today, in7days]);

    // Group by property
    const upcoming7dByProperty = {};
    for (const r of upcoming7d) {
      if (!upcoming7dByProperty[r.property_id]) upcoming7dByProperty[r.property_id] = [];
      upcoming7dByProperty[r.property_id].push(r);
    }

    // Upcoming check-ins (30 days)
    const { rows: upcoming30d } = await pool.query(`
      SELECT r.*, g.first_name, g.last_name, g.email, g.phone,
        (r.check_out - r.check_in) as num_nights
      FROM reservations r
      JOIN guests g ON g.id = r.guest_id
      WHERE r.check_in >= $1 AND r.check_in <= $2
        AND r.status IN ('confirmed', 'checked_in')
      ORDER BY r.check_in ASC
    `, [today, in30days]);

    const upcoming30dByProperty = {};
    for (const r of upcoming30d) {
      if (!upcoming30dByProperty[r.property_id]) upcoming30dByProperty[r.property_id] = [];
      upcoming30dByProperty[r.property_id].push(r);
    }

    // Outstanding balances
    const { rows: outstandingBalances } = await pool.query(`
      SELECT r.id, r.property_id, r.check_in, r.check_out, r.total_amount, r.amount_paid,
        (r.total_amount - r.amount_paid) as balance,
        g.first_name, g.last_name, g.email
      FROM reservations r
      JOIN guests g ON g.id = r.guest_id
      WHERE r.amount_paid < r.total_amount AND r.total_amount > 0
        AND r.status != 'cancelled'
      ORDER BY r.check_in ASC
    `);

    // Recent activity
    const { rows: recentActivity } = await pool.query(
      'SELECT * FROM activity_log ORDER BY logged_at DESC LIMIT 20'
    );

    // Revenue MTD by property
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const yearStart = `${now.getFullYear()}-01-01`;

    const { rows: revenueMtd } = await pool.query(`
      SELECT property_id, COALESCE(SUM(amount_paid), 0) as revenue, COUNT(*) as bookings
      FROM reservations
      WHERE check_in >= $1 AND status != 'cancelled'
      GROUP BY property_id
    `, [monthStart]);

    // Revenue YTD by property
    const { rows: revenueYtd } = await pool.query(`
      SELECT property_id, COALESCE(SUM(amount_paid), 0) as revenue, COUNT(*) as bookings
      FROM reservations
      WHERE check_in >= $1 AND status != 'cancelled'
      GROUP BY property_id
    `, [yearStart]);

    // Occupancy: current month and next month
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0];

    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysInNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();

    // Get property IDs for occupancy
    const { rows: propRows } = await pool.query('SELECT id FROM properties ORDER BY id');
    const propertyIds = propRows.map(r => r.id);

    async function getOccupancy(startDate, endDate, totalDays) {
      const result = {};
      for (const propId of propertyIds) {
        const { rows: bookings } = await pool.query(`
          SELECT check_in, check_out FROM reservations
          WHERE property_id = $1 AND status != 'cancelled'
            AND check_in < $2::date AND check_out > $3::date
        `, [propId, endDate, startDate]);

        let bookedNights = 0;
        const periodStart = new Date(startDate);
        const periodEnd = new Date(endDate);

        for (const b of bookings) {
          const bStart = new Date(b.check_in) < periodStart ? periodStart : new Date(b.check_in);
          const bEnd = new Date(b.check_out) > periodEnd ? periodEnd : new Date(b.check_out);
          const nights = Math.max(0, Math.ceil((bEnd - bStart) / (1000 * 60 * 60 * 24)));
          bookedNights += nights;
        }

        result[propId] = {
          booked_nights: bookedNights,
          total_nights: totalDays,
          occupancy_rate: totalDays > 0 ? Math.round((bookedNights / totalDays) * 100) : 0,
        };
      }
      return result;
    }

    const occupancy = {
      current_month: await getOccupancy(monthStart, currentMonthEnd, daysInCurrentMonth),
      next_month: await getOccupancy(nextMonthStart, nextMonthEnd, daysInNextMonth),
    };

    res.json({
      upcoming_checkins_7d: upcoming7dByProperty,
      upcoming_checkins_30d: upcoming30dByProperty,
      outstanding_balances: outstandingBalances,
      recent_activity: recentActivity,
      revenue_mtd: revenueMtd,
      revenue_ytd: revenueYtd,
      occupancy,
    });
  } catch (err) {
    console.error('GET /api/dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
