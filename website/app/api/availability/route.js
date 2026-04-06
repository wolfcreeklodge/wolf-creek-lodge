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
      `SELECT id, title, is_combo_listing, combined_listings FROM properties ORDER BY sort_order, id`
    );

    const result = [];

    for (const prop of properties) {
      let blockingIds;
      if (prop.is_combo_listing && Array.isArray(prop.combined_listings)) {
        blockingIds = [prop.id, ...prop.combined_listings];
      } else {
        const { rows: combos } = await pool.query(
          `SELECT id FROM properties WHERE is_combo_listing = true AND combined_listings ? $1`,
          [prop.id]
        );
        blockingIds = [prop.id, ...combos.map(c => c.id)];
      }

      // Admin gets enriched data with guest names, notes, reservation IDs
      const sql = isAdmin
        ? `SELECT r.id as reservation_id, r.check_in, r.check_out, r.property_id,
             r.guest_id, r.notes, r.booking_channel, r.status,
             g.first_name as guest_first_name, g.last_name as guest_last_name
           FROM reservations r
           JOIN guests g ON g.id = r.guest_id
           WHERE r.property_id = ANY($1)
             AND r.status NOT IN ('cancelled', 'no_show')
             AND r.check_out > $2::date AND r.check_in < $3::date
           ORDER BY r.check_in`
        : `SELECT check_in, check_out, property_id
           FROM reservations
           WHERE property_id = ANY($1)
             AND status NOT IN ('cancelled', 'no_show')
             AND check_out > $2::date AND check_in < $3::date
           ORDER BY check_in`;

      const { rows: ranges } = await pool.query(sql, [blockingIds, startDate, endDate]);

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
