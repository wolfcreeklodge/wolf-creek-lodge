-- ==========================================================================
-- 03-rate-calendar.sql
-- Seasonal rate calendar + stay rules for Wolfridge Retreats.
--
-- WHY THIS EXISTS
--   properties.pricing holds a single nightly rate and one weekend rate, so
--   every night of the year prices the same. This table set introduces dated
--   rate windows with a deterministic precedence rule, which is what the
--   website, the MCP get_pricing tool, and the pricing agent all need in
--   order to answer "what does 2026-12-27 cost" with one number.
--
--   Structure only. No rates are seeded here.
--   Rates live in 04-winter-2026-27-rates.sql so they can be reviewed,
--   replaced, or rolled back without touching the schema.
--
-- IDEMPOTENT: safe to run more than once.
-- ==========================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Rate seasons: dated windows, highest priority wins on overlap
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_seasons (
    id              TEXT PRIMARY KEY,
    label           TEXT NOT NULL,
    tier            TEXT NOT NULL
                    CHECK (tier IN ('shoulder','core','peak','holiday')),
    starts_on       DATE NOT NULL,
    ends_on         DATE NOT NULL,          -- inclusive, expressed as nights
    priority        INTEGER NOT NULL DEFAULT 10,
    min_nights      INTEGER NOT NULL DEFAULT 2,
    -- Arrival gating: when set, a stay whose check-in falls inside this
    -- window must satisfy min_nights_on_arrival instead of min_nights.
    -- Used to stop a 2-night booking landing mid-corridor and orphaning
    -- the nights on either side of it.
    min_nights_on_arrival INTEGER,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT rate_seasons_dates_ordered CHECK (ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS idx_rate_seasons_span
    ON rate_seasons (starts_on, ends_on);

-- --------------------------------------------------------------------------
-- Per-property rates for each season
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_rates (
    property_id     TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    season_id       TEXT NOT NULL REFERENCES rate_seasons(id) ON DELETE CASCADE,
    weekday_rate    NUMERIC(10,2) NOT NULL CHECK (weekday_rate > 0),
    weekend_rate    NUMERIC(10,2) NOT NULL CHECK (weekend_rate > 0),
    -- Optional per-property override of the season default.
    min_nights      INTEGER,
    PRIMARY KEY (property_id, season_id)
);

-- --------------------------------------------------------------------------
-- Which nights count as weekend rate nights.
-- A "weekend night" is the night you sleep there, so Friday and Saturday
-- nights price at the weekend rate. ISODOW: 5 = Friday, 6 = Saturday.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_weekend_night(_night DATE)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
    SELECT EXTRACT(ISODOW FROM _night) IN (5, 6);
$$;

-- --------------------------------------------------------------------------
-- Resolve the governing season for a single night.
-- Highest priority wins; ties break on the narrower window, then on id,
-- so the result is deterministic.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_season(_night DATE)
RETURNS TEXT
LANGUAGE sql STABLE AS $$
    SELECT s.id
    FROM rate_seasons s
    WHERE _night BETWEEN s.starts_on AND s.ends_on
    ORDER BY s.priority DESC,
             (s.ends_on - s.starts_on) ASC,
             s.id ASC
    LIMIT 1;
$$;

-- --------------------------------------------------------------------------
-- Resolve the nightly rate for one property on one night.
-- Falls back to properties.pricing when no season covers the night, so the
-- site never renders a null price during the transition.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_nightly_rate(_property_id TEXT, _night DATE)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE AS $$
DECLARE
    _season_id TEXT;
    _rate      NUMERIC;
    _weekend   BOOLEAN := is_weekend_night(_night);
    _pricing   JSONB;
BEGIN
    _season_id := resolve_season(_night);

    IF _season_id IS NOT NULL THEN
        SELECT CASE WHEN _weekend THEN pr.weekend_rate ELSE pr.weekday_rate END
        INTO _rate
        FROM property_rates pr
        WHERE pr.property_id = _property_id
          AND pr.season_id = _season_id;

        IF _rate IS NOT NULL THEN
            RETURN _rate;
        END IF;
    END IF;

    -- Fallback: legacy flat pricing on the property row.
    SELECT pricing INTO _pricing FROM properties WHERE id = _property_id;
    IF _pricing IS NULL THEN
        RETURN NULL;
    END IF;

    IF _weekend AND (_pricing #>> '{weekendRate}') IS NOT NULL THEN
        RETURN (_pricing #>> '{weekendRate}')::NUMERIC;
    END IF;

    RETURN COALESCE(
        (_pricing #>> '{nightlyRate,min}')::NUMERIC,
        (_pricing #>> '{nightlyRate,max}')::NUMERIC
    );
END;
$$;

-- --------------------------------------------------------------------------
-- Quote a whole stay, night by night.
-- Returns one row per night so callers can show the breakdown rather than
-- an opaque total. check_out is exclusive (you do not pay for the night
-- you leave).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION quote_stay(
    _property_id TEXT,
    _check_in    DATE,
    _check_out   DATE
)
RETURNS TABLE (
    night        DATE,
    season_id    TEXT,
    tier         TEXT,
    is_weekend   BOOLEAN,
    nightly_rate NUMERIC
)
LANGUAGE sql STABLE AS $$
    SELECT n::DATE                              AS night,
           resolve_season(n::DATE)              AS season_id,
           s.tier                               AS tier,
           is_weekend_night(n::DATE)            AS is_weekend,
           resolve_nightly_rate(_property_id, n::DATE) AS nightly_rate
    FROM generate_series(_check_in, _check_out - INTERVAL '1 day', INTERVAL '1 day') AS n
    LEFT JOIN rate_seasons s ON s.id = resolve_season(n::DATE)
    ORDER BY n;
$$;

-- --------------------------------------------------------------------------
-- Minimum nights required for a stay, given its arrival date.
-- Takes the strictest rule touched by the stay so a booking cannot dodge a
-- holiday minimum by arriving one night early.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION required_min_nights(
    _property_id TEXT,
    _check_in    DATE,
    _check_out   DATE
)
RETURNS INTEGER
LANGUAGE sql STABLE AS $$
    SELECT GREATEST(
        COALESCE(MAX(
            CASE
              WHEN _check_in BETWEEN s.starts_on AND s.ends_on
                   AND s.min_nights_on_arrival IS NOT NULL
              THEN s.min_nights_on_arrival
              ELSE COALESCE(pr.min_nights, s.min_nights)
            END
        ), 0),
        COALESCE((SELECT (availability #>> '{minNights}')::INTEGER
                  FROM properties WHERE id = _property_id), 1),
        1
    )
    FROM generate_series(_check_in, _check_out - INTERVAL '1 day', INTERVAL '1 day') AS n
    JOIN rate_seasons s ON n::DATE BETWEEN s.starts_on AND s.ends_on
                       AND s.id = resolve_season(n::DATE)
    LEFT JOIN property_rates pr ON pr.season_id = s.id
                               AND pr.property_id = _property_id;
$$;

COMMIT;
