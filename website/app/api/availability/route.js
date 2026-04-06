import { NextResponse } from 'next/server';
import pool from '../../../lib/db.js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/availability?months=6
 * Returns blocked date ranges for all three properties,
 * including cross-property blocking (House/Apartment ↔ Retreat).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const months = Math.min(12, Math.max(1, parseInt(searchParams.get('months')) || 6));

  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // Fetch all properties
    const { rows: properties } = await pool.query(
      `SELECT id, title, is_combo_listing, combined_listings FROM properties ORDER BY sort_order, id`
    );

    const result = [];

    for (const prop of properties) {
      // Determine which property IDs effectively block this property
      let blockingIds;
      if (prop.is_combo_listing && Array.isArray(prop.combined_listings)) {
        // Retreat: blocked by its own bookings + any individual unit booking
        blockingIds = [prop.id, ...prop.combined_listings];
      } else {
        // Individual unit: blocked by its own bookings + any combo booking that includes it
        const { rows: combos } = await pool.query(
          `SELECT id FROM properties WHERE is_combo_listing = true AND combined_listings ? $1`,
          [prop.id]
        );
        blockingIds = [prop.id, ...combos.map(c => c.id)];
      }

      const { rows: ranges } = await pool.query(`
        SELECT check_in, check_out, property_id
        FROM reservations
        WHERE property_id = ANY($1)
          AND status NOT IN ('cancelled', 'no_show')
          AND check_out > $2::date
          AND check_in < $3::date
        ORDER BY check_in
      `, [blockingIds, startDate, endDate]);

      result.push({
        id: prop.id,
        title: prop.title,
        blockedRanges: ranges.map(r => ({
          start: r.check_in.toISOString().split('T')[0],
          end: r.check_out.toISOString().split('T')[0],
          crossBlock: r.property_id !== prop.id,
        })),
      });
    }

    return NextResponse.json({ properties: result, startDate, endDate });
  } catch (err) {
    console.error('GET /api/availability error:', err);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}
