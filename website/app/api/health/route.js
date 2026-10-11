import pool from '../../../lib/db.js';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/health -- the "status" link in /.well-known/api-catalog.
//
// Says whether the public API can answer: the site is up and the database it
// reads availability from responds. 200 when it can, 503 when it cannot.
// Never cached, since a stale "ok" is the one wrong answer a status endpoint
// can give.
// ---------------------------------------------------------------------------

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

export async function GET() {
  try {
    await pool.query('SELECT 1');
    return Response.json(
      { status: 'ok', database: 'ok', time: new Date().toISOString() },
      { headers: HEADERS }
    );
  } catch {
    return Response.json(
      { status: 'unavailable', database: 'unreachable', time: new Date().toISOString() },
      { status: 503, headers: HEADERS }
    );
  }
}
