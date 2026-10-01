-- ==========================================================================
-- 08-calendar-blocks.sql
--
-- Stop the Retreat's calendar mirrors from blocking the House.
--
-- Airbnb links the three listings. Booking a unit makes the Retreat show
-- "Not available" for those dates, and booking the Retreat makes both units
-- show it. The iCal import stores every one of those events as an ordinary
-- reservation, and every reader applied the exclusivity rule to them: a
-- Retreat row blocks both units. So an Apartment booking was mirrored onto the
-- Retreat, and the mirror then blocked the House. On 2026-09-28 that hid the
-- House on Oct 1-4, Oct 8-10, Jan 5-15 and Jul 2-6 2027, all nights on which
-- only the Apartment was booked. Where the House's iCal export is imported by
-- Airbnb, the same mirrors blocked the House's Airbnb listing too.
--
-- The rule now, in one place (effective_blocks below):
--
--   * A real Retreat booking still blocks both units, whole.
--   * A Retreat *calendar block* ("Not available"), seen from a unit, blocks
--     only the nights on which neither unit has a row of its own. A night a
--     unit row explains is just Airbnb's mirror of that row. A night nothing
--     explains means a unit is booked somewhere this database cannot see --
--     in practice a Vrbo booking of the Apartment not yet entered -- and we
--     do not know which unit, so it keeps blocking both. That is the
--     conservative choice, and entering the Vrbo booking frees the House.
--   * Unit rows, blocks included, still block the Retreat, whole.
--
-- The cross-property trigger follows the same idea: a Retreat calendar block
-- no longer rejects a unit booking. It is a mirror, never a booking, so it
-- cannot be double-booked, and rejecting there made it impossible to enter the
-- very Vrbo booking that explains it.
--
-- Additive and idempotent. Apply with:
--   docker exec -i wcl-database psql -U wolfcreek -d wolfcreek < database\08-calendar-blocks.sql
-- ==========================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Mark calendar blocks
-- --------------------------------------------------------------------------
ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS is_calendar_block BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN reservations.is_calendar_block IS
    'True for an OTA calendar event that closes dates without being a booking '
    '(Airbnb "Not available"). Set by scripts/sync-ical.mjs.';

-- Backfill from the summary the iCal import has always written into notes.
-- The same patterns as isCalendarBlock() in scripts/sync-ical.mjs.
--
-- The overlap triggers fire on UPDATE too, and these rows overlap by nature:
-- a mirror always overlaps the booking it mirrors. They are bypassed for this
-- one statement, inside this transaction, as sync-ical.mjs does for imports.
ALTER TABLE reservations DISABLE TRIGGER trg_check_booking_overlap;
ALTER TABLE reservations DISABLE TRIGGER trg_check_cross_property_overlap;

UPDATE reservations
   SET is_calendar_block = TRUE
 WHERE booking_channel = 'airbnb'
   AND notes ~* 'Summary: (airbnb \()?(not available|blocked|closed)\)?\s*$'
   AND NOT is_calendar_block;

ALTER TABLE reservations ENABLE TRIGGER trg_check_booking_overlap;
ALTER TABLE reservations ENABLE TRIGGER trg_check_cross_property_overlap;

-- --------------------------------------------------------------------------
-- 2. effective_blocks: what actually closes a property's dates
-- --------------------------------------------------------------------------
-- Returns the blocking ranges for _property_id overlapping [_from, _to). NULL
-- bounds mean unbounded. A Retreat calendar block seen from a unit comes back
-- clipped to its unexplained nights, possibly as several ranges; partial marks
-- those, so a caller that needs one stable id per range can tell them apart.
CREATE OR REPLACE FUNCTION effective_blocks(
    _property_id TEXT,
    _from        DATE,
    _to          DATE
) RETURNS TABLE (
    reservation_id UUID,
    property_id    TEXT,
    check_in       DATE,
    check_out      DATE,
    partial        BOOLEAN
) AS $$
  WITH candidates AS (
    SELECT r.id, r.property_id, r.check_in, r.check_out,
           (pr.is_combo_listing AND r.is_calendar_block
              AND r.property_id <> _property_id) AS is_mirror,
           pr.combined_listings
      FROM reservations r
      JOIN properties pr ON pr.id = r.property_id
     WHERE r.property_id = ANY (blocking_property_ids(_property_id))
       AND r.status NOT IN ('cancelled', 'no_show')
       AND (_to   IS NULL OR r.check_in  < _to)
       AND (_from IS NULL OR r.check_out > _from)
  ),
  unexplained AS (
    SELECT c.id, c.property_id, n::date AS night
      FROM candidates c
     CROSS JOIN LATERAL generate_series(
             greatest(c.check_in, coalesce(_from, c.check_in))::timestamp,
             (least(c.check_out, coalesce(_to, c.check_out)) - 1)::timestamp,
             interval '1 day') AS n
     WHERE c.is_mirror
       AND NOT EXISTS (
             SELECT 1
               FROM reservations u
              WHERE u.property_id IN (SELECT jsonb_array_elements_text(c.combined_listings))
                AND u.status NOT IN ('cancelled', 'no_show')
                AND u.check_in  <= n::date
                AND u.check_out >  n::date)
  ),
  islands AS (
    SELECT id, property_id, night,
           night - (row_number() OVER (PARTITION BY id ORDER BY night))::int AS grp
      FROM unexplained
  )
  SELECT c.id, c.property_id, c.check_in, c.check_out, FALSE
    FROM candidates c
   WHERE NOT c.is_mirror
  UNION ALL
  SELECT i.id, i.property_id, min(i.night), max(i.night) + 1, TRUE
    FROM islands i
   GROUP BY i.id, i.property_id, i.grp;
$$ LANGUAGE sql STABLE;

-- --------------------------------------------------------------------------
-- 3. stay_is_available now goes through effective_blocks
-- --------------------------------------------------------------------------
-- Same signature as 07, so the website, the CRM and the waitlist flag pick up
-- the new rule without a code change.
CREATE OR REPLACE FUNCTION stay_is_available(
    _property_id TEXT,
    _check_in    DATE,
    _check_out   DATE
) RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM effective_blocks(_property_id, _check_in, _check_out)
  );
$$ LANGUAGE sql STABLE;

-- --------------------------------------------------------------------------
-- 4. Cross-property trigger: Retreat calendar blocks do not reject unit bookings
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_cross_property_overlap() RETURNS TRIGGER AS $$
DECLARE
    _conflicting_ids TEXT[];
    _combo JSONB;
    _unit_booking BOOLEAN := FALSE;
BEGIN
    -- Case 1: booking a combo listing -- check its component properties
    SELECT combined_listings INTO _combo
    FROM properties
    WHERE id = NEW.property_id AND is_combo_listing = TRUE;

    IF _combo IS NOT NULL AND jsonb_array_length(_combo) > 0 THEN
        SELECT array_agg(elem::TEXT)
        INTO _conflicting_ids
        FROM jsonb_array_elements_text(_combo) AS elem;
    ELSE
        -- Case 2: booking an individual unit -- find any combo that includes it
        _unit_booking := TRUE;
        SELECT array_agg(p.id)
        INTO _conflicting_ids
        FROM properties p
        WHERE p.is_combo_listing = TRUE
          AND p.combined_listings @> to_jsonb(NEW.property_id);
    END IF;

    IF _conflicting_ids IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM reservations
            WHERE property_id = ANY(_conflicting_ids)
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
              AND status NOT IN ('cancelled', 'no_show')
              AND check_in < NEW.check_out
              AND check_out > NEW.check_in
              -- A combo's calendar block mirrors unit bookings; it is not one.
              AND NOT (_unit_booking AND is_calendar_block)
        ) THEN
            RAISE EXCEPTION 'Booking dates conflict with a related property reservation (cross-property exclusivity)';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
