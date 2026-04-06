import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { requireAdmin } from '../../../../lib/auth.js';
import { BLOCK_GUEST_ID } from '../../../../lib/constants.js';

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { property_id, check_in, check_out, notes } = await request.json();
  if (!property_id || !check_in || !check_out) {
    return NextResponse.json({ error: 'property_id, check_in, check_out required' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO reservations (guest_id, property_id, check_in, check_out,
        booking_channel, status, total_amount, notes)
       VALUES ($1, $2, $3, $4, 'direct', 'confirmed', 0, $5) RETURNING *`,
      [BLOCK_GUEST_ID, property_id, check_in, check_out, notes || 'Owner block']
    );

    await pool.query(
      `INSERT INTO activity_log (user_email, entity_type, entity_id, action, diff)
       VALUES ($1, 'reservation', $2, 'created', $3)`,
      [admin.email, rows[0].id, JSON.stringify({ type: 'block', property_id, check_in, check_out, notes })]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    if (err.message.includes('overlap') || err.message.includes('exclusivity')) {
      return NextResponse.json({ error: 'These dates conflict with an existing booking.' }, { status: 409 });
    }
    console.error('Create block error:', err);
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reservation_id } = await request.json();
  if (!reservation_id) {
    return NextResponse.json({ error: 'reservation_id required' }, { status: 400 });
  }

  try {
    // Only allow deleting blocks, not real bookings
    const { rows } = await pool.query(
      `UPDATE reservations SET status = 'cancelled', updated_at = now()
       WHERE id = $1 AND guest_id = $2 RETURNING *`,
      [reservation_id, BLOCK_GUEST_ID]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Block not found (or is a real booking)' }, { status: 404 });
    }

    await pool.query(
      `INSERT INTO activity_log (user_email, entity_type, entity_id, action, diff)
       VALUES ($1, 'reservation', $2, 'deleted', $3)`,
      [admin.email, reservation_id, JSON.stringify({ type: 'block_removed' })]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Delete block error:', err);
    return NextResponse.json({ error: 'Failed to remove block' }, { status: 500 });
  }
}
