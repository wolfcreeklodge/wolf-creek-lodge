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
//   graph    send as the lodge's own Outlook mailbox through Microsoft Graph,
//            with the refresh token the CRM stores for the email sync. Needs
//            the mailbox connected once with send permission, at
//            /auth/login?mailbox=1 in the CRM. Mail comes from MAILBOX_EMAIL
//            (EMAIL_FROM does not apply) and lands in its Sent Items.
//            Outlook.com caps sending per day, so this provider holds back
//            past GRAPH_DAILY_LIMIT and lets the queue drain over days.
//
// Reply-To is the Outlook mailbox, whatever the From address is, so replies
// land in the inbox that sync-email.mjs already pulls into the CRM.
//
// Runs once per invocation and exits; Dockerfile.email-send loops it every
// 30 seconds, the same shape as the two sync workers.
// ---------------------------------------------------------------------------

import pg from 'pg';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { render } from './email-templates.mjs';

const {
  DATABASE_URL,
  EMAIL_PROVIDER = 'log',
  RESEND_API_KEY = '',
  MICROSOFT_CLIENT_ID = '',
  MICROSOFT_CLIENT_SECRET = '',
  MICROSOFT_TENANT_ID = 'common',
  MAILBOX_EMAIL = 'wolfcreeklodge@outlook.com',
  GRAPH_DAILY_LIMIT = '250',
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

async function sendViaResend({ to, subject, html, text, headers, replyTo }) {
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
      reply_to: replyTo || EMAIL_REPLY_TO,
      headers,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  return data.id || null;
}

// ---------------------------------------------------------------------------
// graph: send as the lodge's Outlook mailbox
// ---------------------------------------------------------------------------
const GRAPH = 'https://graph.microsoft.com/v1.0';
let graphToken = null; // set once per run by connectGraph()

// MSAL keeps refresh tokens in its cache rather than on the result (see the
// note in crm/server/auth.js). Microsoft rotates them on use; the new one is
// written back so the stored token stays fresh for this worker and the sync.
function rotatedRefreshToken(cca) {
  try {
    const cache = JSON.parse(cca.getTokenCache().serialize());
    const entry = Object.values(cache.RefreshToken || {})[0];
    return entry?.secret || null;
  } catch {
    return null;
  }
}

// Token for Mail.Send, from the refresh token in email_sync_state, then the
// same check sync-email.mjs makes: the token must open MAILBOX_EMAIL. A
// token for any other account never sends anything.
async function connectGraph(pool) {
  const { rows } = await pool.query('SELECT refresh_token FROM email_sync_state WHERE id = 1');
  const refreshToken = rows[0]?.refresh_token;
  if (!refreshToken) {
    throw new Error('no refresh token stored; connect the mailbox at /auth/login?mailbox=1 in the CRM');
  }
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: MICROSOFT_CLIENT_ID,
      clientSecret: MICROSOFT_CLIENT_SECRET,
      authority: `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}`,
    },
  });
  const result = await cca.acquireTokenByRefreshToken({
    refreshToken,
    scopes: ['https://graph.microsoft.com/Mail.Send', 'https://graph.microsoft.com/User.Read'],
  });
  const rotated = rotatedRefreshToken(cca);
  if (rotated && rotated !== refreshToken) {
    await pool.query(
      'UPDATE email_sync_state SET refresh_token = $1, updated_at = now() WHERE id = 1',
      [rotated]
    );
  }
  const me = await graphCall('GET', '/me?$select=mail,userPrincipalName', result.accessToken);
  const expected = MAILBOX_EMAIL.trim().toLowerCase();
  if (![me.mail, me.userPrincipalName].filter(Boolean).some((a) => a.toLowerCase() === expected)) {
    throw new Error(`the stored token is not for ${MAILBOX_EMAIL}; sign in to the CRM as that account`);
  }
  return result.accessToken;
}

async function graphCall(method, path, token, body) {
  const res = await fetch(`${GRAPH}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Graph ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.status === 202 || res.status === 204 ? null : res.json();
}

// Graph sends one HTML body (Outlook derives the plain-text part) and accepts
// only X- custom headers, so List-Unsubscribe cannot be set this way. Every
// promotion still carries the unsubscribe link and postal address in its
// footer, which is what CAN-SPAM requires; the header is a bulk-sender rule at
// volumes this list will not reach.
async function sendViaGraph({ to, subject, html, replyTo }) {
  const message = {
    subject,
    body: { contentType: 'HTML', content: html },
    toRecipients: [{ emailAddress: { address: to } }],
  };
  const reply = replyTo || EMAIL_REPLY_TO;
  if (reply && reply.toLowerCase() !== MAILBOX_EMAIL.toLowerCase()) {
    message.replyTo = [{ emailAddress: { address: reply } }];
  }
  await graphCall('POST', '/me/sendMail', graphToken, { message, saveToSentItems: true });
  return null; // sendMail returns 202 with no message id
}

function providerReady() {
  if (EMAIL_PROVIDER === 'log') return true;
  if (EMAIL_PROVIDER === 'resend') return Boolean(RESEND_API_KEY);
  if (EMAIL_PROVIDER === 'graph') return Boolean(MICROSOFT_CLIENT_ID && MICROSOFT_CLIENT_SECRET);
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
      // A per-message Reply-To, e.g. the sender of a contact-form message, so
      // the owner answers them with a plain reply.
      const replyTo = row.payload?.replyTo || undefined;
      if (EMAIL_PROVIDER === 'resend') {
        providerId = await sendViaResend({ to: row.to_email, ...msg, headers, replyTo });
      } else if (EMAIL_PROVIDER === 'graph') {
        providerId = await sendViaGraph({ to: row.to_email, ...msg, replyTo });
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
    const why = {
      resend: '(RESEND_API_KEY is empty)',
      graph: '(MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET is empty)',
    }[EMAIL_PROVIDER] || '(unknown provider)';
    console.error(`EMAIL_PROVIDER=${EMAIL_PROVIDER} is not usable ${why}. Nothing sent; the queue is untouched.`);
    return;
  }

  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });
  try {
    let limit = BATCH;
    if (EMAIL_PROVIDER === 'graph') {
      // Only talk to Microsoft when there is something to send.
      const { rows: due } = await pool.query(
        `SELECT count(*)::int AS n FROM outbound_emails
          WHERE status = 'queued' AND next_attempt_at <= now()`
      );
      if (!due[0].n) return;

      const { rows: sent } = await pool.query(
        `SELECT count(*)::int AS n FROM outbound_emails
          WHERE provider = 'graph' AND status = 'sent' AND sent_at > now() - interval '24 hours'`
      );
      limit = Math.min(BATCH, Number(GRAPH_DAILY_LIMIT) - sent[0].n);
      if (limit <= 0) {
        console.log(`Daily Outlook limit (${GRAPH_DAILY_LIMIT}) reached; ${due[0].n} left queued for later.`);
        return;
      }

      // Like a missing key: a mailbox problem leaves the queue untouched
      // instead of spending each message's retries on it.
      try {
        graphToken = await connectGraph(pool);
      } catch (err) {
        console.error(`Outlook sending unavailable: ${err.message}. Nothing sent; the queue is untouched.`);
        return;
      }
    }

    let handled = 0;
    while (handled < limit && (await processOne(pool))) handled++;
    if (handled) console.log(`[${new Date().toISOString()}] ${handled} processed via ${EMAIL_PROVIDER}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('send-email failed:', err);
  process.exit(1);
});
