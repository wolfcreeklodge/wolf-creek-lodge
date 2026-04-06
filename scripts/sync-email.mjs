#!/usr/bin/env node

/**
 * Email Sync for Wolf Creek Lodge
 *
 * Fetches emails from the wolfcreeklodge@outlook.com mailbox via Microsoft
 * Graph API and stores metadata in PostgreSQL, matching emails to guests
 * and reservations.
 *
 * Environment:
 *   DATABASE_URL            — PostgreSQL connection string
 *   MICROSOFT_CLIENT_ID     — Azure AD app client ID
 *   MICROSOFT_CLIENT_SECRET — Azure AD app client secret
 *   MICROSOFT_TENANT_ID     — Azure AD tenant ID (defaults to 'common')
 */

import pg from "pg";
import { ConfidentialClientApplication } from "@azure/msal-node";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MAILBOX_EMAIL = process.env.MAILBOX_EMAIL || "wolfcreeklodge@outlook.com";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const MAX_PAGES = 4;
const MESSAGE_SELECT = [
  "id",
  "subject",
  "from",
  "toRecipients",
  "receivedDateTime",
  "bodyPreview",
  "hasAttachments",
  "isRead",
].join(",");

// ---------------------------------------------------------------------------
// Ensure tables exist
// ---------------------------------------------------------------------------

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_sync_state (
      id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      access_token    TEXT,
      refresh_token   TEXT,
      token_expires_at    TIMESTAMPTZ,
      delta_link      TEXT,
      updated_at      TIMESTAMPTZ DEFAULT now()
    );

    INSERT INTO email_sync_state (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS emails (
      id              BIGSERIAL PRIMARY KEY,
      graph_id        TEXT NOT NULL UNIQUE,
      subject         TEXT,
      from_address    TEXT,
      to_address      TEXT,
      direction       TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
      received_at     TIMESTAMPTZ NOT NULL,
      body_preview    TEXT,
      has_attachments BOOLEAN DEFAULT FALSE,
      is_read         BOOLEAN DEFAULT FALSE,
      outlook_url     TEXT,
      guest_id        UUID REFERENCES guests(id),
      reservation_id  UUID REFERENCES reservations(id),
      created_at      TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_emails_graph_id ON emails(graph_id);
    CREATE INDEX IF NOT EXISTS idx_emails_guest ON emails(guest_id);
    CREATE INDEX IF NOT EXISTS idx_emails_received ON emails(received_at DESC);
  `);
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

async function getSyncState() {
  const { rows } = await pool.query(
    `SELECT refresh_token, delta_link, access_token, token_expires_at
     FROM email_sync_state
     WHERE id = 1`
  );
  return rows[0] || null;
}

async function updateSyncState(updates) {
  const sets = [];
  const vals = [];
  let idx = 1;

  for (const [key, value] of Object.entries(updates)) {
    sets.push(`${key} = $${idx}`);
    vals.push(value);
    idx++;
  }

  sets.push("updated_at = now()");

  await pool.query(
    `UPDATE email_sync_state SET ${sets.join(", ")} WHERE id = 1`,
    vals
  );
}

async function acquireAccessToken(refreshToken) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";

  if (!clientId || !clientSecret) {
    throw new Error(
      "MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET must be set"
    );
  }

  const config = {
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  };

  const cca = new ConfidentialClientApplication(config);

  const result = await cca.acquireTokenByRefreshToken({
    refreshToken,
    scopes: ["https://graph.microsoft.com/.default"],
  });

  if (!result || !result.accessToken) {
    throw new Error("Failed to acquire access token — no token in response");
  }

  // Store refreshed tokens
  const tokenUpdates = {
    access_token: result.accessToken,
    token_expires_at: result.expiresOn
      ? new Date(result.expiresOn).toISOString()
      : null,
  };

  // MSAL may return a new refresh token via the token cache
  // The refreshToken used is typically still valid, but update if a new one comes back
  if (result.refreshToken) {
    tokenUpdates.refresh_token = result.refreshToken;
  }

  await updateSyncState(tokenUpdates);

  return result.accessToken;
}

// ---------------------------------------------------------------------------
// Graph API helpers
// ---------------------------------------------------------------------------

async function graphFetch(url, accessToken, retries = 2) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "10", 10);
    console.log(`    Rate limited (429). Waiting ${retryAfter}s...`);
    await sleep(retryAfter * 1000);
    if (retries > 0) {
      return graphFetch(url, accessToken, retries - 1);
    }
    throw new Error("Rate limited by Graph API after retries");
  }

  if (response.status === 401) {
    throw new Error(
      "Access token expired or invalid (401). The refresh token may need to be renewed — log in to the CRM to re-authorize."
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Graph API ${response.status}: ${body}`);
  }

  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Fetch messages (initial or delta)
// ---------------------------------------------------------------------------

async function fetchMessages(accessToken, deltaLink) {
  const messages = [];
  let nextDeltaLink = null;
  let pageCount = 0;

  let url;
  if (deltaLink) {
    // Incremental sync
    url = deltaLink;
    console.log("    Using delta link for incremental sync");
  } else {
    // First run — fetch last ~200 messages (4 pages x 50)
    url = `${GRAPH_BASE}/me/messages?$top=50&$orderby=receivedDateTime desc&$select=${MESSAGE_SELECT}`;
    console.log("    First run: fetching recent messages");
  }

  while (url && pageCount < MAX_PAGES) {
    const data = await graphFetch(url, accessToken);
    pageCount++;

    if (data.value) {
      messages.push(...data.value);
      console.log(
        `    Page ${pageCount}: ${data.value.length} messages`
      );
    }

    if (data["@odata.deltaLink"]) {
      nextDeltaLink = data["@odata.deltaLink"];
      url = null; // Delta complete
    } else if (data["@odata.nextLink"]) {
      url = data["@odata.nextLink"];
    } else {
      url = null;
    }
  }

  return { messages, deltaLink: nextDeltaLink };
}

// ---------------------------------------------------------------------------
// Match email to guest and reservation
// ---------------------------------------------------------------------------

async function matchGuest(client, email) {
  if (!email) return null;

  const { rows } = await client.query(
    `SELECT id FROM guests
     WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
     LIMIT 1`,
    [email]
  );

  return rows.length > 0 ? rows[0].id : null;
}

async function matchReservation(client, guestId, receivedDate) {
  if (!guestId) return null;

  const { rows } = await client.query(
    `SELECT id FROM reservations
     WHERE guest_id = $1 AND status != 'cancelled'
     ORDER BY ABS(check_in - $2::date) ASC, check_in DESC
     LIMIT 1`,
    [guestId, receivedDate]
  );

  return rows.length > 0 ? rows[0].id : null;
}

// ---------------------------------------------------------------------------
// Process a single message
// ---------------------------------------------------------------------------

async function processMessage(client, msg) {
  const graphId = msg.id;
  const fromAddr = msg.from?.emailAddress?.address?.toLowerCase() || null;
  const toAddr =
    msg.toRecipients?.[0]?.emailAddress?.address?.toLowerCase() || null;

  // Determine direction
  const direction =
    fromAddr === MAILBOX_EMAIL.toLowerCase() ? "outbound" : "inbound";

  // Counterparty is the external party
  const counterpartyEmail = direction === "inbound" ? fromAddr : toAddr;

  // Match to guest
  const guestId = await matchGuest(client, counterpartyEmail);

  // Match to reservation
  const receivedDate = msg.receivedDateTime
    ? msg.receivedDateTime.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const reservationId = await matchReservation(client, guestId, receivedDate);

  // Build Outlook URL
  const outlookUrl = `https://outlook.live.com/mail/0/id/${encodeURIComponent(graphId)}`;

  // Insert with dedup
  const result = await client.query(
    `INSERT INTO emails
       (graph_id, subject, from_address, to_address, direction,
        received_at, body_preview, has_attachments, is_read,
        outlook_url, guest_id, reservation_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (graph_id) DO NOTHING
     RETURNING id`,
    [
      graphId,
      msg.subject || null,
      fromAddr,
      toAddr,
      direction,
      msg.receivedDateTime || new Date().toISOString(),
      msg.bodyPreview || null,
      msg.hasAttachments || false,
      msg.isRead || false,
      outlookUrl,
      guestId,
      reservationId,
    ]
  );

  return result.rowCount > 0;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Wolf Creek Lodge Email Sync ===");
  console.log(`    Started at: ${new Date().toISOString()}`);
  console.log(`    Mailbox: ${MAILBOX_EMAIL}`);

  try {
    // Ensure tables exist
    await ensureTables();

    // Read sync state
    const state = await getSyncState();

    if (!state || !state.refresh_token) {
      console.log(
        "\nWARNING: No refresh token found in email_sync_state."
      );
      console.log(
        "A user needs to log in to the CRM first to authorize email access."
      );
      return;
    }

    // Acquire fresh access token
    console.log("\n--- Acquiring access token...");
    let accessToken;
    try {
      accessToken = await acquireAccessToken(state.refresh_token);
      console.log("    Access token acquired successfully");
    } catch (err) {
      if (err.message.includes("401") || err.message.includes("refresh")) {
        console.error(
          `\nERROR: ${err.message}`
        );
        console.error(
          "The refresh token may have expired. Log in to the CRM to re-authorize."
        );
        // Clear the stale tokens
        await updateSyncState({
          access_token: null,
          token_expires_at: null,
        });
        return;
      }
      throw err;
    }

    // Fetch messages
    console.log("\n--- Fetching messages...");
    const { messages, deltaLink: newDeltaLink } = await fetchMessages(
      accessToken,
      state.delta_link
    );
    console.log(`    Total messages fetched: ${messages.length}`);

    // Process messages
    if (messages.length > 0) {
      console.log("\n--- Processing messages...");
      const client = await pool.connect();
      let inserted = 0;
      let skipped = 0;

      try {
        await client.query("BEGIN");

        for (const msg of messages) {
          const wasInserted = await processMessage(client, msg);
          if (wasInserted) {
            inserted++;
          } else {
            skipped++;
          }
        }

        await client.query("COMMIT");
        console.log(
          `    Result: ${inserted} new, ${skipped} already synced`
        );
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    } else {
      console.log("    No new messages to process");
    }

    // Store delta link for next run
    if (newDeltaLink) {
      await updateSyncState({ delta_link: newDeltaLink });
      console.log("    Delta link saved for next incremental sync");
    }

    console.log(`\nCompleted at: ${new Date().toISOString()}`);
  } catch (err) {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
