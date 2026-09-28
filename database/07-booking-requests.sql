-- =============================================================================
-- 07 - Booking requests, waitlist, marketing consent, email outbox
-- =============================================================================
--
-- WHY
--   The site booked by mailto: link, so nothing checked a guest's dates before
--   they wrote in. A guest could ask for a week that Airbnb had already sold
--   and find out only when Bo replied. This adds a real request with dates,
--   checked against the calendar at the moment it is made, and a waitlist for
--   the dates that are taken.
--
-- SHAPE
--   booking_requests  one row per request. The waitlist is not a separate
--                     table: it is the requests whose status is 'waitlisted'.
--                     One lifecycle, one place to look.
--   promotions        a promotional email, drafted and sent from the CRM.
--   outbound_emails   an outbox. The website and the CRM only ever INSERT
--                     here; scripts/send-email.mjs is the one thing that
--                     sends, so provider credentials live in one container.
--   guests.*          marketing consent and a per-guest unsubscribe token.
--
-- A REQUEST DOES NOT HOLD DATES. It is not a reservation and it is invisible
-- to the overlap triggers. Bo confirms it in the CRM, which INSERTs a real
-- reservation -- and that insert is what the triggers police. Two guests can
-- both be told a weekend is open; the second confirmation is refused.
--
-- Additive only, and safe to re-run: every object is IF NOT EXISTS or
-- CREATE OR REPLACE. Apply with
--   docker exec -i wcl-database psql -U wolfcreek -d wolfcreek < database\07-booking-requests.sql
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. One definition of "is this stay free"
-- -----------------------------------------------------------------------------
-- The overlap triggers, /api/availability and now the booking form all need
-- the same answer. Before this, each carried its own copy of the combo logic.
-- This is the shared definition, in SQL, so a new caller cannot disagree.
--
-- Blocking set for a property: itself, plus its components if it is a combo,
-- plus any combo that contains it. For the three SKUs today:
--   wolf-creek-lodge          -> lodge, retreat
--   wolf-creek-apartment      -> apartment, retreat
--   wolf-creek-retreat-combo  -> retreat, lodge, apartment
-- The House and the Apartment do NOT block each other. That is the whole
-- point of selling them separately.

CREATE OR REPLACE FUNCTION blocking_property_ids(_property_id TEXT)
RETURNS TEXT[] AS $$
  SELECT array_agg(DISTINCT pid) FROM (
    SELECT _property_id AS pid
    UNION
    SELECT jsonb_array_elements_text(combined_listings)
      FROM properties
     WHERE id = _property_id AND is_combo_listing
    UNION
    SELECT id
      FROM properties
     WHERE is_combo_listing AND combined_listings @> to_jsonb(_property_id)
  ) s;
$$ LANGUAGE sql STABLE;

-- Same status rule as the triggers: cancelled and no-show rows do not block.
-- Half-open ranges, so a check-out and a check-in on the same day do not
-- collide.
CREATE OR REPLACE FUNCTION stay_is_available(
    _property_id TEXT,
    _check_in    DATE,
    _check_out   DATE
) RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1
      FROM reservations
     WHERE property_id = ANY (blocking_property_ids(_property_id))
       AND status NOT IN ('cancelled', 'no_show')
       AND check_in  < _check_out
       AND check_out > _check_in
  );
$$ LANGUAGE sql STABLE;

-- -----------------------------------------------------------------------------
-- 2. Marketing consent on guests
-- -----------------------------------------------------------------------------
-- Three states, and the difference between the first two matters:
--   unknown    we have never asked. The default, and NOT permission.
--   opted_in   they ticked the box on the request form, or Bo recorded that
--              they agreed. The only state promotions are sent to.
--   opted_out  they unsubscribed, or said no. Never mailed a promotion again
--              unless they opt back in themselves.
-- Transactional mail -- "we got your request", "those dates opened up" -- is
-- not marketing and goes regardless of this column.

ALTER TABLE guests ADD COLUMN IF NOT EXISTS marketing_consent TEXT NOT NULL DEFAULT 'unknown'
  CHECK (marketing_consent IN ('unknown', 'opted_in', 'opted_out'));
ALTER TABLE guests ADD COLUMN IF NOT EXISTS marketing_consent_at     TIMESTAMPTZ;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS marketing_consent_source TEXT;

-- Unsubscribe links carry this, not the guest id and not the address, so a
-- link cannot be edited to unsubscribe somebody else. gen_random_uuid() is
-- volatile, so existing rows each get their own value.
ALTER TABLE guests ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_unsubscribe_token ON guests (unsubscribe_token);

-- The request form finds an existing guest by address. Not unique: the iCal
-- import creates placeholder guests with no address, and a real person can
-- appear twice from different channels.
CREATE INDEX IF NOT EXISTS idx_guests_email_lower ON guests (lower(email)) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 3. Booking requests
-- -----------------------------------------------------------------------------
-- Lifecycle:
--   pending     dates were free when asked. Waiting on Bo.
--   waitlisted  dates were taken when asked. The waitlist.
--   offered     a waitlisted request whose dates came free, and the guest has
--               been told. Waiting on the guest.
--   confirmed   Bo turned it into a reservation (reservation_id is set).
--   declined    Bo said no, or the dates went before he could confirm.
--   withdrawn   the guest changed their mind.
--
-- Name, address and phone are stored as the guest typed them, as well as
-- being linked to guest_id. The public form never overwrites an existing
-- guest record, so the request is the only faithful record of what was sent.

CREATE TABLE IF NOT EXISTS booking_requests (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id              TEXT NOT NULL REFERENCES properties(id),
    check_in                 DATE NOT NULL,
    check_out                DATE NOT NULL,
    num_guests               INTEGER NOT NULL CHECK (num_guests BETWEEN 1 AND 20),
    guest_id                 UUID REFERENCES guests(id),
    first_name               TEXT NOT NULL,
    last_name                TEXT NOT NULL,
    email                    TEXT NOT NULL,
    phone                    TEXT,
    message                  TEXT,
    status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'waitlisted', 'offered',
                                               'confirmed', 'declined', 'withdrawn')),
    available_when_requested BOOLEAN NOT NULL,
    -- Direct display total at the moment of asking (parity + DIRECT_MARKUP),
    -- when the rate calendar could price every night. What the guest saw.
    quoted_total             NUMERIC(10,2),
    reservation_id           UUID REFERENCES reservations(id),
    offered_at               TIMESTAMPTZ,
    source                   TEXT NOT NULL DEFAULT 'website',
    -- HMAC of the client address, for rate limiting only. The raw address is
    -- never stored.
    ip_hash                  TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (check_out > check_in)
);

CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests (status, check_in);
CREATE INDEX IF NOT EXISTS idx_booking_requests_guest  ON booking_requests (guest_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_ip     ON booking_requests (ip_hash, created_at);

-- -----------------------------------------------------------------------------
-- 4. Promotions
-- -----------------------------------------------------------------------------
-- Body is plain text; blank lines separate paragraphs. The sender adds the
-- unsubscribe link and postal address itself, so a promotion cannot be sent
-- without them however it is written.

CREATE TABLE IF NOT EXISTS promotions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject         TEXT NOT NULL,
    body            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent')),
    created_by      TEXT,
    recipient_count INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 5. Outbox
-- -----------------------------------------------------------------------------
-- Writers set kind, to_email and payload. The sender renders the subject and
-- body from a template at send time and fills in everything else.
--   queued   waiting for the sender
--   sent     accepted by the provider
--   logged   EMAIL_PROVIDER=log: rendered and recorded, deliberately not sent
--   failed   gave up after retries; last_error says why
--   skipped  a promotion whose recipient opted out after it was queued

CREATE TABLE IF NOT EXISTS outbound_emails (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind                TEXT NOT NULL
                        CHECK (kind IN ('request_received', 'request_waitlisted',
                                        'owner_new_request', 'dates_available',
                                        'promotion')),
    to_email            TEXT NOT NULL,
    guest_id            UUID REFERENCES guests(id),
    booking_request_id  UUID REFERENCES booking_requests(id),
    promotion_id        UUID REFERENCES promotions(id),
    payload             JSONB NOT NULL DEFAULT '{}',
    status              TEXT NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued', 'sent', 'logged', 'failed', 'skipped')),
    attempts            INTEGER NOT NULL DEFAULT 0,
    subject             TEXT,
    provider            TEXT,
    provider_message_id TEXT,
    last_error          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at             TIMESTAMPTZ
);

-- Retry clock. A failed send is pushed back exponentially rather than
-- retried every 30 seconds, so a provider outage of an hour is ridden out
-- instead of burning through the attempts in two minutes.
ALTER TABLE outbound_emails ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now();
-- The plain-text body as rendered and sent (or, in log mode, as it would
-- have been), so the CRM can show exactly what a guest received.
ALTER TABLE outbound_emails ADD COLUMN IF NOT EXISTS body_text TEXT;

DROP INDEX IF EXISTS idx_outbound_emails_queue;
CREATE INDEX IF NOT EXISTS idx_outbound_emails_due
    ON outbound_emails (next_attempt_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_outbound_emails_request
    ON outbound_emails (booking_request_id);

COMMIT;
