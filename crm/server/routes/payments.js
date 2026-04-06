import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// POST /api/reservations/:id/payments
router.post('/reservations/:id/payments', async (req, res) => {
  try {
    const reservationId = req.params.id;

    // Verify reservation exists
    const { rows: resRows } = await pool.query(
      'SELECT * FROM reservations WHERE id = $1', [reservationId]
    );
    if (resRows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    const reservation = resRows[0];

    const { amount, method, date, notes } = req.body;

    if (!amount || !method || !date) {
      return res.status(400).json({ error: 'amount, method, and date are required' });
    }

    const validMethods = ['credit_card', 'bank_transfer', 'paypal', 'venmo', 'cash', 'stripe', 'airbnb', 'vrbo', 'other'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}` });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Insert payment
    const { rows: paymentRows } = await pool.query(`
      INSERT INTO payments (reservation_id, amount, method, paid_at, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [reservationId, amount, method, date, notes || null]);

    const payment = paymentRows[0];

    // Recalculate amount_paid
    const { rows: sumRows } = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE reservation_id = $1',
      [reservationId]
    );
    const totalPaid = parseFloat(sumRows[0].total_paid);

    // Determine payment status
    let paymentStatus = 'unpaid';
    if (totalPaid <= 0) {
      paymentStatus = 'unpaid';
    } else if (totalPaid >= parseFloat(reservation.total_amount)) {
      paymentStatus = 'paid_in_full';
    } else {
      paymentStatus = 'advance';
    }

    // Update reservation
    await pool.query(`
      UPDATE reservations SET amount_paid = $1, payment_status = $2, updated_at = now()
      WHERE id = $3
    `, [totalPaid, paymentStatus, reservationId]);

    // Log activity
    await pool.query(`
      INSERT INTO activity_log (user_email, entity_type, entity_id, action, diff)
      VALUES ($1, 'payment', $2, 'created', $3)
    `, [req.user.email, payment.id, JSON.stringify({
      reservation_id: reservationId,
      amount,
      method,
      date,
      new_total_paid: totalPaid,
      new_payment_status: paymentStatus,
    })]);

    const { rows: updatedRes } = await pool.query(
      'SELECT * FROM reservations WHERE id = $1', [reservationId]
    );

    res.status(201).json({ payment, reservation: updatedRes[0] });
  } catch (err) {
    console.error('POST /api/reservations/:id/payments error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// GET /api/reservations/:id/payments
router.get('/reservations/:id/payments', async (req, res) => {
  try {
    const reservationId = req.params.id;

    const { rows: resRows } = await pool.query(
      'SELECT id FROM reservations WHERE id = $1', [reservationId]
    );
    if (resRows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const { rows: payments } = await pool.query(
      'SELECT * FROM payments WHERE reservation_id = $1 ORDER BY paid_at DESC', [reservationId]
    );

    res.json({ payments });
  } catch (err) {
    console.error('GET /api/reservations/:id/payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

export default router;
