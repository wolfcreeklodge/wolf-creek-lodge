#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Email sender -- drains the outbound_emails outbox.
//
// The website and the CRM never send mail themselves. They INSERT a row with
// a kind, a recipient and a payload; this worker renders it from
// email-templates.mjs and hands it to the provider. That keeps the provider
// key in one container, makes every message retryable, and means the CRM can
// show exactly what went out.
//
// EMAIL_PROVIDER
//   log      (default) render and record, send nothing. Rows end 'logged'.
//            Safe to run before a provider exists; the whole flow is testable.
//   resend   send through Resend (https://resend.com). Needs RESEND_API_KEY,
//            and EMAIL_FROM on a domain verified there.
//
// Reply-To is the Outlook mailbox, whatever the From address is, so replies
// land in the inbox that sync-email.mjs already pulls into the CRM.
//
// Runs once per invocation and exits; Dockerfile.email-send loops it every
// 30 seconds, the same shape as the two sync workers.
// ---------------------------------------------------------------------------

import pg from 'pg';
import { render } from './email-templates.mjs';

const {
  DATABASE_URL,
  EMAIL_PROVIDER = 'log',
  RESEND_API_KEY = '',
  EMAIL_FROM = 'Wolfcreek Lodge <stay@wolfcreeklodge.us>',
  EMAIL_REPLY_TO = 'wolfcreeklodge@outlook.com',
  SITE_URL = 'https://wolfcreeklodge.us',
  CRM_URL = 'https://crm.wolfcreeklodge.us',
  POSTAL_ADDRESS = '17 Lucky Louie Rd, Winthrop, WA 98862',
} = process.env;

// Per run. At one run every 30 seconds that is 40 a minute -- plenty for a
// promotion to a few hundred people, and well inside provider rate limits.
const BATCH = 20;
// With the exponential backoff below, six attempts span about an hour.
const MAX_ATTEMPTS = 6;

// Addresses in container logs are masked. docker logs is not a place for a
// guest list.
function mask(addr) {
  const [user, domain] = String(addr).split('@');
  return domain ? `${user.slice(0, 1)}***@${domain}` : '***';
}

async function sendViaResend({ to, subject, html, text, headers }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
      text,
      reply_to: EMAIL_REPLY_TO,
      headers,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  return data.id || null;
}

function providerReady() {
  if (EMAIL_PROVIDER === 'log') return true;
  if (EMAIL_PROVIDER === 'resend') return Boolean(RESEND_API_KEY);
  return false;
}

// One row, one short transaction. Claim it with SKIP LOCKED so a second
// sender can never take the same message, send, record, commit. The only
// window for a duplicate is a crash between the provider accepting the
// message and the COMMIT -- milliseconds, and far better than holding a whole
// batch open across twenty network calls.
async function processOne(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT e.*, g.first_name AS guest_first_name,
              g.marketing_consent, g.unsubscribe_token
         FROM outbound_emails e
         LEFT JOIN guests g ON g.id = e.guest_id
        WHERE e.status = 'queued' AND e.next_attempt_at <= now()
        ORDER BY e.next_attempt_at
        LIMIT 1
        FOR UPDATE OF e SKIP LOCKED`
    );
    const row = rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return false;
    }

    // Consent is re-checked here, not trusted from when the row was queued.
    // Someone who unsubscribes after a promotion is queued but before it is
    // sent does not get it.
    // Tests go to Bo's own address and have no guest row, so no consent to
    // check; the CRM only ever marks its own test sends this way.
    const isTest = row.payload?.test === true;
    if (row.kind === 'promotion' && !isTest && row.marketing_consent !== 'opted_in') {
      await client.query(
        `UPDATE outbound_emails SET status = 'skipped', last_error = 'not opted in at send time'
          WHERE id = $1`,
        [row.id]
      );
      await client.query('COMMIT');
      console.log(`  skipped ${row.kind} -> ${mask(row.to_email)} (not opted in)`);
      return true;
    }

    const unsubscribeUrl = row.unsubscribe_token
      ? `${SITE_URL}/unsubscribe?t=${row.unsubscribe_token}`
      : `${SITE_URL}/unsubscribe`;
    const payload = { firstName: row.guest_first_name, ...row.payload };
    const msg = render(row.kind, payload, {
      siteUrl: SITE_URL,
      crmUrl: CRM_URL,
      postalAddress: POSTAL_ADDRESS,
      unsubscribeUrl,
    });

    // One-click unsubscribe (RFC 8058) on marketing only. Gmail and Yahoo
    // require it of bulk senders; it points at the POST endpoint, never at a
    // GET that a link scanner could trigger.
    const headers =
      row.kind === 'promotion' && row.unsubscribe_token
        ? {
            'List-Unsubscribe': `<${SITE_URL}/api/unsubscribe?t=${row.unsubscribe_token}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }
        : undefined;

    try {
      let providerId = null;
      if (EMAIL_PROVIDER === 'resend') {
        providerId = await sendViaResend({ to: row.to_email, ...msg, headers });
      }
      await client.query(
        `UPDATE outbound_emails
            SET status = $2, subject = $3, body_text = $4, provider = $5,
                provider_message_id = $6, attempts = attempts + 1,
                last_error = NULL, sent_at = now()
          WHERE id = $1`,
        [
          row.id,
          EMAIL_PROVIDER === 'log' ? 'logged' : 'sent',
          msg.subject,
          msg.text,
          EMAIL_PROVIDER,
          providerId,
        ]
      );
      await client.query('COMMIT');
      console.log(`  ${EMAIL_PROVIDER === 'log' ? 'logged' : 'sent'} ${row.kind} -> ${mask(row.to_email)}`);
    } catch (err) {
      const attempts = row.attempts + 1;
      const giveUp = attempts >= MAX_ATTEMPTS;
      await client.query(
        `UPDATE outbound_emails
            SET attempts = $2, last_error = $3, subject = $4,
                status = CASE WHEN $5 THEN 'failed' ELSE 'queued' END,
                next_attempt_at = now() + (interval '1 minute' * power(2, $2))
          WHERE id = $1`,
        [row.id, attempts, String(err.message).slice(0, 500), msg.subject, giveUp]
      );
      await client.query('COMMIT');
      console.error(
        `  ${giveUp ? 'FAILED' : 'retry'} ${row.kind} -> ${mask(row.to_email)} ` +
          `(attempt ${attempts}): ${err.message}`
      );
    }
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  if (!providerReady()) {
    // A misconfiguration, not a send failure: leave everything queued rather
    // than burning attempts on a key that is simply not there yet.
    console.error(
      `EMAIL_PROVIDER=${EMAIL_PROVIDER} is not usable ` +
        (EMAIL_PROVIDER === 'resend' ? '(RESEND_API_KEY is empty)' : '(unknown provider)') +
        '. Nothing sent; the queue is untouched.'
    );
    return;
  }

  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });
  try {
    let handled = 0;
    while (handled < BATCH && (await processOne(pool))) handled++;
    if (handled) console.log(`[${new Date().toISOString()}] ${handled} processed via ${EMAIL_PROVIDER}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('send-email failed:', err);
  process.exit(1);
});
