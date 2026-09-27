import { NextResponse } from 'next/server';
import { checkStay } from '../../../../lib/booking.js';

export const dynamic = 'force-dynamic';

// Live answer for the request form while a guest is still choosing dates:
// free or taken, the direct price, the minimum stay, and which other place is
// open if theirs is not. Read-only, so it needs no rate limit beyond what the
// tunnel already does; it writes nothing and returns nothing private.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  try {
    const result = await checkStay({
      propertyId: searchParams.get('property'),
      checkIn: searchParams.get('checkIn'),
      checkOut: searchParams.get('checkOut'),
    });
    return NextResponse.json(result, {
      status: result.error ? 422 : 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('GET /api/booking-requests/check error:', err);
    return NextResponse.json({ error: 'Could not check those dates.' }, { status: 500 });
  }
}
