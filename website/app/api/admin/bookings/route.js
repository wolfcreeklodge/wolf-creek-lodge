import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { requireAdmin } from '../../../../lib/auth.js';

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { property_id, check_in, check_out, guest_first_name, guest_last_name,
          guest_email, guest_phone, notes, booking_channel, num_guests } = body;

  if (!property_id || !check_in || !check_out || !guest_first_name || !guest_last_name) {
    return NextResponse.json({ error: 'property_id, check_in, check_out, guest_first_name, guest_last_name required' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find or create guest
    let guestId;
    if (guest_email) {
      const { rows: existing } = await client.query(
        'SELECT id FROM guests WHERE email = $1 AND deleted_at IS NULL LIMIT 1',
        [guest_email.toLowerCase()]
      );
      if (existing.length > 0) {
        guestId = existing[0].id;
      }
    }

    if (!guestId) {
      const { rows } = await client.query(
        `INSERT INTO guests (first_name, last_name, email, phone, source)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [guest_first_name, guest_last_name, guest_email?.toLowerCase() || null,
         guest_phone || null, booking_channel === 'airbnb' ? 'airbnb' : 'direct']
      );
      guestId = rows[0].id;
    }

    const { rows: reservation } = await client.query(
      `INSERT INTO reservations (guest_id, property_id, check_in, check_out,
        num_guests, booking_channel, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7) RETURNING *`,
      [guestId, property_id, check_in, check_out,
       num_guests || null, booking_channel || 'direct', notes || null]
    );

    await client.query(
      `INSERT INTO activity_log (user_email, entity_type, entity_id, action, diff)
       VALUES ($1, 'reservation', $2, 'created', $3)`,
      [admin.email, reservation[0].id, JSON.stringify(body)]
    );

    await client.query('COMMIT');
    return NextResponse.json(reservation[0], { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.message.includes('overlap') || err.message.includes('exclusivity')) {
      return NextResponse.json({ error: 'These dates conflict with an existing booking.' }, { status: 409 });
    }
    console.error('Create booking error:', err);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reservation_id, notes } = await request.json();
  if (!reservation_id) {
    return NextResponse.json({ error: 'reservation_id required' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE reservations SET notes = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [notes, reservation_id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    await pool.query(
      `INSERT INTO activity_log (user_email, entity_type, entity_id, action, diff)
       VALUES ($1, 'reservation', $2, 'updated', $3)`,
      [admin.email, reservation_id, JSON.stringify({ notes })]
    );

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('Update booking error:', err);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}
