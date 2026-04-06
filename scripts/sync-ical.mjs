#!/usr/bin/env node

/**
 * iCal Import/Sync for Wolf Creek Lodge
 *
 * Fetches Airbnb iCal feeds for properties that have an ical_import_url,
 * parses VEVENT blocks, and upserts reservations into PostgreSQL.
 *
 * Removed events in the feed trigger cancellation of the matching DB row.
 * Results are logged to the ical_sync_log table.
 *
 * Environment:
 *   DATABASE_URL — PostgreSQL connection string
 */

import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ---------------------------------------------------------------------------
// iCal parser — minimal, handles Airbnb's straightforward VCALENDAR format
// ---------------------------------------------------------------------------

function parseIcal(text) {
  const events = [];
  // Unfold RFC 5545 continuation lines (CRLF + whitespace)
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const ev = {};

    for (const line of block.split(/\r?\n/)) {
      if (!line.includes(":")) continue;

      // Property name may include parameters (e.g. DTSTART;VALUE=DATE:20260401)
      const colonIdx = line.indexOf(":");
      const keyPart = line.slice(0, colonIdx);
      const value = line.slice(colonIdx + 1).trim();
      const name = keyPart.split(";")[0].toUpperCase();

      switch (name) {
        case "UID":
          ev.uid = value;
          break;
        case "DTSTART":
          ev.dtstart = parseIcalDate(value);
          break;
        case "DTEND":
          ev.dtend = parseIcalDate(value);
          break;
        case "SUMMARY":
          ev.summary = value;
          break;
      }
    }

    if (ev.uid && ev.dtstart && ev.dtend) {
      events.push(ev);
    }
  }

  return events;
}

/**
 * Parse an iCal date value.
 * Supports:
 *   DATE format:      20260715
 *   DATE-TIME format: 20260715T140000Z  or  20260715T140000
 * Returns a Date object.
 */
function parseIcalDate(val) {
  // Strip any trailing whitespace
  val = val.trim();

  if (val.length === 8) {
    // DATE only: YYYYMMDD
    const y = val.slice(0, 4);
    const m = val.slice(4, 6);
    const d = val.slice(6, 8);
    return new Date(`${y}-${m}-${d}T00:00:00Z`);
  }

  // DATE-TIME: 20260715T140000Z or 20260715T140000
  const y = val.slice(0, 4);
  const m = val.slice(4, 6);
  const d = val.slice(6, 8);
  const hh = val.slice(9, 11);
  const mm = val.slice(11, 13);
  const ss = val.slice(13, 15);
  const tz = val.endsWith("Z") ? "Z" : "Z"; // treat naive as UTC
  return new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}${tz}`);
}

/**
 * Format a Date as YYYY-MM-DD for PostgreSQL DATE columns.
 */
function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Extract a guest name from the SUMMARY field
// ---------------------------------------------------------------------------

function extractGuestName(summary) {
  if (!summary) return null;
  const s = summary.trim();

  // Airbnb often uses "Reserved", "Not available", "Airbnb (not available)", etc.
  const ignoredPatterns = [
    /^reserved$/i,
    /^not available$/i,
    /^airbnb/i,
    /^blocked$/i,
    /^closed$/i,
  ];
  for (const pat of ignoredPatterns) {
    if (pat.test(s)) return null;
  }

  // If the summary looks like a name, return the first word as first_name
  return s.split(/\s+/)[0] || null;
}

// ---------------------------------------------------------------------------
// Get or create a placeholder guest for Airbnb imports
// ---------------------------------------------------------------------------

async function getOrCreatePlaceholderGuest(client, firstName) {
  const fn = firstName || "Airbnb";
  const ln = "Guest";

  // Try to find an existing placeholder with source='airbnb' and same first name
  const existing = await client.query(
    `SELECT id FROM guests
     WHERE first_name = $1 AND last_name = $2 AND source = 'airbnb'
     LIMIT 1`,
    [fn, ln]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `INSERT INTO guests (first_name, last_name, source)
     VALUES ($1, $2, 'airbnb')
     RETURNING id`,
    [fn, ln]
  );

  return inserted.rows[0].id;
}

// ---------------------------------------------------------------------------
// Sync one property
// ---------------------------------------------------------------------------

async function syncProperty(property) {
  const { id: propertyId, title, ical_import_url: url } = property;
  console.log(`\n--- Syncing: ${title} (${propertyId})`);
  console.log(`    Feed URL: ${url}`);

  const client = await pool.connect();
  let eventsFound = 0;
  let eventsAdded = 0;
  let eventsRemoved = 0;

  try {
    // Fetch the iCal feed
    const response = await fetch(url, {
      headers: { "User-Agent": "WolfCreekLodge-iCalSync/1.0" },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const icalText = await response.text();
    const events = parseIcal(icalText);
    eventsFound = events.length;
    console.log(`    Events found in feed: ${eventsFound}`);

    await client.query("BEGIN");

    const feedUids = new Set();

    for (const ev of events) {
      feedUids.add(ev.uid);

      // Check if this reservation already exists
      const existing = await client.query(
        `SELECT id FROM reservations
         WHERE property_id = $1 AND channel_conf_code = $2 AND booking_channel = 'airbnb'`,
        [propertyId, ev.uid]
      );

      if (existing.rows.length > 0) {
        // Already imported — skip (could update dates here in the future)
        continue;
      }

      // Extract guest name and get/create placeholder guest
      const firstName = extractGuestName(ev.summary);
      const guestId = await getOrCreatePlaceholderGuest(client, firstName);

      // Insert reservation
      await client.query(
        `INSERT INTO reservations
           (guest_id, property_id, check_in, check_out, booking_channel, channel_conf_code, status, notes)
         VALUES ($1, $2, $3, $4, 'airbnb', $5, 'confirmed', $6)`,
        [
          guestId,
          propertyId,
          toDateStr(ev.dtstart),
          toDateStr(ev.dtend),
          ev.uid,
          ev.summary ? `Imported from Airbnb iCal. Summary: ${ev.summary}` : "Imported from Airbnb iCal.",
        ]
      );

      eventsAdded++;
      console.log(
        `    + Added: ${toDateStr(ev.dtstart)} → ${toDateStr(ev.dtend)} (${ev.summary || "no summary"})`
      );
    }

    // Detect removals: Airbnb reservations in DB whose UID is no longer in the feed
    const dbReservations = await client.query(
      `SELECT id, channel_conf_code, check_in, check_out
       FROM reservations
       WHERE property_id = $1
         AND booking_channel = 'airbnb'
         AND channel_conf_code IS NOT NULL
         AND status NOT IN ('cancelled', 'completed')`,
      [propertyId]
    );

    for (const row of dbReservations.rows) {
      if (!feedUids.has(row.channel_conf_code)) {
        await client.query(
          `UPDATE reservations SET status = 'cancelled', updated_at = now()
           WHERE id = $1`,
          [row.id]
        );
        eventsRemoved++;
        console.log(
          `    - Cancelled: ${row.check_in} → ${row.check_out} (UID no longer in feed)`
        );
      }
    }

    // Log success
    await client.query(
      `INSERT INTO ical_sync_log (property_id, events_found, events_added, events_removed, status)
       VALUES ($1, $2, $3, $4, 'success')`,
      [propertyId, eventsFound, eventsAdded, eventsRemoved]
    );

    await client.query("COMMIT");

    console.log(
      `    Result: ${eventsAdded} added, ${eventsRemoved} cancelled`
    );

    return { propertyId, eventsFound, eventsAdded, eventsRemoved, status: "success" };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    console.error(`    ERROR: ${err.message}`);

    // Log the error — use a separate connection since we rolled back
    try {
      await pool.query(
        `INSERT INTO ical_sync_log (property_id, events_found, events_added, events_removed, status, error_message)
         VALUES ($1, $2, $3, $4, 'error', $5)`,
        [propertyId, eventsFound, eventsAdded, eventsRemoved, err.message]
      );
    } catch (logErr) {
      console.error(`    Failed to log error: ${logErr.message}`);
    }

    return { propertyId, eventsFound, eventsAdded, eventsRemoved, status: "error", error: err.message };
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Wolf Creek Lodge iCal Sync ===");
  console.log(`    Started at: ${new Date().toISOString()}`);

  try {
    // Find all properties with an iCal import URL configured
    const { rows: properties } = await pool.query(
      `SELECT id, title, ical_import_url
       FROM properties
       WHERE ical_import_url IS NOT NULL AND ical_import_url != ''`
    );

    if (properties.length === 0) {
      console.log("\nNo properties have an ical_import_url configured. Nothing to sync.");
      return;
    }

    console.log(`\nFound ${properties.length} property/properties with iCal feeds.`);

    const results = [];
    for (const prop of properties) {
      const result = await syncProperty(prop);
      results.push(result);
    }

    // Print summary
    console.log("\n=== Sync Summary ===");
    for (const r of results) {
      const icon = r.status === "success" ? "OK" : "FAIL";
      console.log(
        `  [${icon}] ${r.propertyId}: found=${r.eventsFound} added=${r.eventsAdded} removed=${r.eventsRemoved}${r.error ? ` error="${r.error}"` : ""}`
      );
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
