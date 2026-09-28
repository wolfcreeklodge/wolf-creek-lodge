import { Router } from 'express';
import pool from '../db.js';

// ---------------------------------------------------------------------------
// Promotions: draft, preview the audience, test, send.
//
// Sending does not send. It queues one outbound_emails row per recipient and
// scripts/send-email.mjs delivers them, adding the unsubscribe link and the
// postal address itself. The audience is exactly the guests whose
// marketing_consent is 'opted_in' -- not 'unknown', which is the default and
// means nobody has asked. Consent is checked again by the sender, so someone
// who unsubscribes after a promotion is queued is still spared it.
// ---------------------------------------------------------------------------

const router = Router();

// One row per address, not per guest: the same person can exist twice (a Vrbo
// import and a direct request) and should get one email, not two.
const AUDIENCE_SQL = `
  SELECT DISTINCT ON (lower(email)) id, first_name, last_name, email
    FROM guests
   WHERE deleted_at IS NULL
     AND marketing_consent = 'opted_in'
     AND email IS NOT NULL AND btrim(email) <> ''
   ORDER BY lower(email), updated_at DESC NULLS LAST`;

function clean(body) {
  const subject = typeof body.subject === 'string' ? body.subject.replace(/\s+/g, ' ').trim() : '';
  const text = typeof body.body === 'string' ? body.body.replace(/\r\n?/g, '\n').trim() : '';
  if (!subject || subject.length > 150) return { error: 'Subject is required, 150 characters at most.' };
  if (!text || text.length > 10000) return { error: 'Body is required, 10,000 characters at most.' };
  return { subject, body: text };
}

// GET /api/promotions -- with delivery counts per promotion from the outbox.
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*,
             count(e.id) FILTER (WHERE e.status = 'sent')::int    AS sent,
             count(e.id) FILTER (WHERE e.status = 'logged')::int  AS logged,
             count(e.id) FILTER (WHERE e.status = 'queued')::int  AS queued,
             count(e.id) FILTER (WHERE e.status = 'skipped')::int AS skipped,
             count(e.id) FILTER (WHERE e.status = 'failed')::int  AS failed
        FROM promotions p
        LEFT JOIN outbound_emails e ON e.promotion_id = p.id AND NOT coalesce((e.payload->>'test')::boolean, false)
       GROUP BY p.id
       ORDER BY p.created_at DESC`);
    res.json({ data: rows });
  } catch (err) {
    console.error('GET /api/promotions error:', err);
    res.status(500).json({ error: 'Failed to load promotions' });
  }
});

// GET /api/promotions/audience -- who a promotion would go to right now.
router.get('/audience', async (_req, res) => {
  try {
    const { rows } = await pool.query(AUDIENCE_SQL);
    const { rows: tally } = await pool.query(`
      SELECT marketing_consent, count(*)::int AS n
        FROM guests
       WHERE deleted_at IS NULL AND email IS NOT NULL AND btrim(email) <> ''
       GROUP BY marketing_consent`);
    res.json({
      count: rows.length,
      recipients: rows,
      byConsent: Object.fromEntries(tally.map((t) => [t.marketing_consent, t.n])),
    });
  } catch (err) {
    console.error('GET /api/promotions/audience error:', err);
    res.status(500).json({ error: 'Failed to load audience' });
  }
});

// POST /api/promotions -- new draft.
router.post('/', async (req, res) => {
  const input = clean(req.body || {});
  if (input.error) return res.status(400).json(input);
  try {
    const { rows } = await pool.query(
      `INSERT INTO promotions (subject, body, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [input.subject, input.body, req.user.email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/promotions error:', err);
    res.status(500).json({ error: 'Failed to save promotion' });
  }
});

// PUT /api/promotions/:id -- edit a draft. A sent promotion is history.
router.put('/:id', async (req, res) => {
  const input = clean(req.body || {});
  if (input.error) return res.status(400).json(input);
  try {
    const { rows } = await pool.query(
      `UPDATE promotions SET subject = $2, body = $3
        WHERE id = $1 AND status = 'draft' RETURNING *`,
      [req.params.id, input.subject, input.body]
    );
    if (!rows[0]) return res.status(409).json({ error: 'Only drafts can be edited.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /api/promotions/:id error:', err);
    res.status(500).json({ error: 'Failed to save promotion' });
  }
});

// DELETE /api/promotions/:id -- drafts only. A draft's only outbox rows are
// its test sends, which go with it.
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT status FROM promotions WHERE id = $1 FOR UPDATE', [req.params.id]
    );
    if (!rows[0] || rows[0].status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Only drafts can be deleted.' });
    }
    await client.query('DELETE FROM outbound_emails WHERE promotion_id = $1', [req.params.id]);
    await client.query('DELETE FROM promotions WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('DELETE /api/promotions/:id error:', err);
    res.status(500).json({ error: 'Failed to delete promotion' });
  } finally {
    client.release();
  }
});

// POST /api/promotions/:id/test -- one copy to Bo's own address, marked as a
// test so it is sent regardless of consent and left out of the counts.
router.post('/:id/test', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM promotions WHERE id = $1', [req.params.id]);
    const promo = rows[0];
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });
    const { rows: cfg } = await pool.query('SELECT contact_email FROM site_config WHERE id = 1');
    const to = cfg[0]?.contact_email || req.user.email;
    await pool.query(
      `INSERT INTO outbound_emails (kind, to_email, promotion_id, payload)
       VALUES ('promotion', $1, $2, $3)`,
      [to, promo.id, { subject: `[TEST] ${promo.subject}`, body: promo.body, test: true }]
    );
    res.json({ ok: true, to });
  } catch (err) {
    console.error('POST /api/promotions/:id/test error:', err);
    res.status(500).json({ error: 'Failed to queue test' });
  }
});

// POST /api/promotions/:id/send { expectedCount }
// expectedCount is the number the owner saw on screen. If the audience has
// changed since -- someone opted in or out -- the send is refused and the
// page shows the new number, so nobody sends to a list they did not look at.
router.post('/:id/send', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT * FROM promotions WHERE id = $1 FOR UPDATE', [req.params.id]
    );
    const promo = rows[0];
    if (!promo) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Promotion not found' });
    }
    if (promo.status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This promotion has already been sent.' });
    }

    const { rows: audience } = await client.query(AUDIENCE_SQL);
    if (Number(req.body?.expectedCount) !== audience.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `The audience changed: it is now ${audience.length}. Check it and send again.`,
        count: audience.length,
      });
    }
    if (audience.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Nobody has opted in yet, so there is nobody to send to.' });
    }

    for (const g of audience) {
      await client.query(
        `INSERT INTO outbound_emails (kind, to_email, guest_id, promotion_id, payload)
         VALUES ('promotion', $1, $2, $3, $4)`,
        [g.email, g.id, promo.id, { subject: promo.subject, body: promo.body, firstName: g.first_name }]
      );
    }
    const { rows: updated } = await client.query(
      `UPDATE promotions SET status = 'sent', sent_at = now(), recipient_count = $2
        WHERE id = $1 RETURNING *`,
      [promo.id, audience.length]
    );
    await client.query('COMMIT');
    res.json({ ok: true, promotion: updated[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /api/promotions/:id/send error:', err);
    res.status(500).json({ error: 'Failed to send promotion' });
  } finally {
    client.release();
  }
});

export default router;
