-- ==========================================================================
-- 05-arrival-tokens.sql
-- Per-reservation arrival tokens, for the private /arrival/{token} page.
--
-- WHY THIS EXISTS
--   Exact directions to the house are not public information. They are given
--   out once a reservation is confirmed. There is no guest login and building
--   one for a three-SKU property would be absurd, so this uses the same
--   unguessable-token pattern the project already uses for iCal export
--   (properties.ical_export_token): a long random path segment, mailed to the
--   guest, revocable by rotating the token.
--
--   122 bits of randomness, from gen_random_uuid(), so no pgcrypto extension is
--   required. Not a secret in the cryptographic sense -- anyone holding the link
--   can open it -- but it is not enumerable, and it dies with the reservation.
--
-- IDEMPOTENT: safe to run more than once.
-- ==========================================================================

BEGIN;

ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS arrival_token TEXT;

-- Backfill anything that predates the column.
UPDATE reservations
   SET arrival_token = replace(gen_random_uuid()::text, '-', '')
 WHERE arrival_token IS NULL;

-- New rows get one automatically, so nothing in the booking path has to
-- remember to generate it.
ALTER TABLE reservations
    ALTER COLUMN arrival_token SET DEFAULT replace(gen_random_uuid()::text, '-', '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_arrival_token
    ON reservations (arrival_token);

COMMIT;

-- Rotate one reservation's link (invalidates the old one immediately):
--   UPDATE reservations SET arrival_token = replace(gen_random_uuid()::text,'-','')
--    WHERE id = '<uuid>';
