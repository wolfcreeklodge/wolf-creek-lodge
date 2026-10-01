import { NextResponse } from 'next/server';
import pool from '../../../lib/db.js';
import { getSession } from '../../../lib/auth.js';
import { BLOCK_GUEST_ID } from '../../../lib/constants.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const months = Math.min(12, Math.max(1, parseInt(searchParams.get('months')) || 6));

  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Check if admin is logged in
  let isAdmin = false;
  try {
    const session = await getSession();
    isAdmin = !!session.user;
  } catch { /* not admin */ }

  try {
    const { rows: properties } = await pool.query(
      `SELECT id, title FROM properties ORDER BY sort_order, id`
    );

    const result = [];

    for (const prop of properties) {
      // effective_blocks() (database/08-calendar-blocks.sql) owns the
      // exclusivity rule, including that a Retreat "Not available" mirror of
      // an Apartment booking does not block the House.
      // Admin gets enriched data with guest names, notes, reservation IDs
      const sql = isAdmin
        ? `SELECT r.id as reservation_id, b.check_in, b.check_out, b.property_id,
             r.guest_id, r.notes, r.booking_channel, r.status,
             g.first_name as guest_first_name, g.last_name as guest_last_name
           FROM effective_blocks($1, $2::date, $3::date) b
           JOIN reservations r ON r.id = b.reservation_id
           JOIN guests g ON g.id = r.guest_id
           ORDER BY b.check_in`
        : `SELECT check_in, check_out, property_id
           FROM effective_blocks($1, $2::date, $3::date)
           ORDER BY check_in`;

      const { rows: ranges } = await pool.query(sql, [prop.id, startDate, endDate]);

      const blockedRanges = ranges.map(r => {
        const range = {
          start: r.check_in.toISOString().split('T')[0],
          end: r.check_out.toISOString().split('T')[0],
          crossBlock: r.property_id !== prop.id,
        };
        if (isAdmin) {
          range.reservation_id = r.reservation_id;
          range.guest_name = r.guest_id === BLOCK_GUEST_ID
            ? 'BLOCK' : `${r.guest_first_name} ${r.guest_last_name}`;
          range.notes = r.notes;
          range.booking_channel = r.booking_channel;
          range.is_block = r.guest_id === BLOCK_GUEST_ID;
          range.status = r.status;
        }
        return range;
      });

      result.push({ id: prop.id, title: prop.title, blockedRanges });
    }

    return NextResponse.json({ properties: result, startDate, endDate, isAdmin });
  } catch (err) {
    console.error('GET /api/availability error:', err);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}
