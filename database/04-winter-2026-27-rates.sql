-- ==========================================================================
-- 04-winter-2026-27-rates.sql
-- PROPOSED winter 2026/27 rate ladder and stay rules.
--
-- STATUS: awaiting owner approval. Do not apply until the numbers are signed
-- off. Rerunning replaces the same season ids in place, so revisions are a
-- matter of editing this file and running it again.
--
-- THESIS
--   The current pricing spread is 9 percent (779 to 849 on the house) and
--   carries no seasonality at all. The neighbouring Wolfridge rental pool
--   publishes a four tier ladder with a 29 percent lift from mid to holiday.
--   The error is not the price level, it is the flatness. This ladder widens
--   the spread to roughly 2x: shoulder nights come down to fill the calendar,
--   peak windows come up to capture demand that is genuinely inelastic.
--
-- ALL RATES ARE BASE RATES (Airbnb parity). The website adds the direct
-- booking markup on render. See website/lib/pricing.js DIRECT_MARKUP.
--
-- SOURCES for the window boundaries are in
-- website/data/winter-2026-27.json (every date carries a source url).
-- ==========================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Seasons
-- --------------------------------------------------------------------------
INSERT INTO rate_seasons
    (id, label, tier, starts_on, ends_on, priority, min_nights, min_nights_on_arrival, notes)
VALUES
    ('shoulder-fall-2026',
     'Late Fall Shoulder', 'shoulder', '2026-10-15', '2026-11-24', 10, 2, NULL,
     'Larch season tails off, snow has not arrived. Lowest demand of the cold half of the year. Priced to fill.'),

    ('thanksgiving-2026',
     'Thanksgiving and Christmas at the End of the Road', 'peak', '2026-11-25', '2026-11-29', 40, 3, NULL,
     'Winthrop flagship holiday festival runs Nov 26-28 2026 (confirmed). Currently prices the same as a Tuesday in October.'),

    ('early-ski-2026',
     'Early Ski Season', 'core', '2026-11-30', '2026-12-17', 10, 2, NULL,
     'Grooming start is conditions dependent and not yet announced for 2026/27. Priced as core, not peak, until snow is on the ground.'),

    ('pre-christmas-2026',
     'Pre-Christmas Week', 'core', '2026-12-18', '2026-12-24', 20, 2, NULL,
     'Seattle Public Schools winter break opens Dec 21. Demand builds through the week.'),

    ('holiday-corridor-2026',
     'Christmas and New Year Corridor', 'holiday', '2026-12-25', '2027-01-03', 50, 4, NULL,
     'Christmas Day and New Year Day both fall on a Friday in 2026/27, which fuses the two peaks into one continuous ten night corridor. Highest willingness to pay of the season.'),

    ('january-core-2027',
     'January Core Ski', 'core', '2027-01-04', '2027-02-12', 10, 2, NULL,
     'The dependable middle of the season. Weekday rate does the work of filling; weekend rate holds.'),

    ('mlk-2027',
     'MLK Weekend', 'peak', '2027-01-15', '2027-01-18', 40, 3, NULL,
     'MLK Day is Mon Jan 18 2027. The neighbouring rental pool does price this one as peak.'),

    ('midwinter-2027',
     'Presidents Day and Seattle Mid-Winter Break', 'peak', '2027-02-13', '2027-02-21', 45, 3, NULL,
     'Presidents Day is Mon Feb 15 2027 and Seattle Public Schools mid-winter break is Feb 16-19, producing a nine day Seattle family window. The neighbouring rental pool prices this week as mid season, the same rate as mid March, and captures no premium at all.'),

    ('late-winter-2027',
     'Late Winter Ski', 'core', '2027-02-22', '2027-03-15', 10, 2, NULL,
     'Longer days, reliable grooming, thinner demand. Same posture as January core.'),

    ('balloon-roundup-2027',
     'Winthrop Balloon Roundup', 'peak', '2027-03-05', '2027-03-07', 40, 2, NULL,
     'Thirtieth annual, Mar 5-7 2027 (confirmed). A town wide draw sitting inside an otherwise soft window.'),

    ('shoulder-spring-2027',
     'Spring Shoulder', 'shoulder', '2027-03-16', '2027-04-30', 10, 2, NULL,
     'Mud season. Trails closing, bikes not yet running, Highway 20 still shut. Priced to fill.')

ON CONFLICT (id) DO UPDATE SET
    label      = EXCLUDED.label,
    tier       = EXCLUDED.tier,
    starts_on  = EXCLUDED.starts_on,
    ends_on    = EXCLUDED.ends_on,
    priority   = EXCLUDED.priority,
    min_nights = EXCLUDED.min_nights,
    min_nights_on_arrival = EXCLUDED.min_nights_on_arrival,
    notes      = EXCLUDED.notes;

-- --------------------------------------------------------------------------
-- Per property rates (weekday / weekend, Fri and Sat nights are weekend)
--
--   House      3BR, sleeps 9,  today flat 779 / 849
--   Apartment  1BR, sleeps 2,  today flat 250 / 280
--   Retreat    4BR, sleeps 10, today flat 950 / 1055
--
-- The Retreat is priced as house plus apartment less a consolidation
-- discount that compresses as demand rises: 12 percent in shoulder, 9 in
-- core, 5 at peak, 2 through the holiday corridor. Discounting a bundle
-- hardest in the weeks when both units would have sold separately is the
-- one move that is strictly worse than doing nothing.
-- --------------------------------------------------------------------------
INSERT INTO property_rates (property_id, season_id, weekday_rate, weekend_rate)
VALUES
    -- House ---------------------------------------------------------------
    ('wolf-creek-lodge', 'shoulder-fall-2026',     549,  649),
    ('wolf-creek-lodge', 'thanksgiving-2026',      849,  899),
    ('wolf-creek-lodge', 'early-ski-2026',         649,  749),
    ('wolf-creek-lodge', 'pre-christmas-2026',     749,  849),
    ('wolf-creek-lodge', 'holiday-corridor-2026', 1095, 1095),
    ('wolf-creek-lodge', 'january-core-2027',      679,  849),
    ('wolf-creek-lodge', 'mlk-2027',               899,  949),
    ('wolf-creek-lodge', 'midwinter-2027',         949,  999),
    ('wolf-creek-lodge', 'late-winter-2027',       679,  849),
    ('wolf-creek-lodge', 'balloon-roundup-2027',   849,  899),
    ('wolf-creek-lodge', 'shoulder-spring-2027',   549,  649),

    -- Apartment -----------------------------------------------------------
    ('wolf-creek-apartment', 'shoulder-fall-2026',     169, 189),
    ('wolf-creek-apartment', 'thanksgiving-2026',      265, 285),
    ('wolf-creek-apartment', 'early-ski-2026',         199, 229),
    ('wolf-creek-apartment', 'pre-christmas-2026',     229, 259),
    ('wolf-creek-apartment', 'holiday-corridor-2026',  345, 345),
    ('wolf-creek-apartment', 'january-core-2027',      209, 259),
    ('wolf-creek-apartment', 'mlk-2027',               285, 305),
    ('wolf-creek-apartment', 'midwinter-2027',         299, 319),
    ('wolf-creek-apartment', 'late-winter-2027',       209, 259),
    ('wolf-creek-apartment', 'balloon-roundup-2027',   265, 285),
    ('wolf-creek-apartment', 'shoulder-spring-2027',   169, 189),

    -- Retreat (combined) --------------------------------------------------
    ('wolf-creek-retreat-combo', 'shoulder-fall-2026',      632,  737),
    ('wolf-creek-retreat-combo', 'thanksgiving-2026',      1058, 1125),
    ('wolf-creek-retreat-combo', 'early-ski-2026',          772,  890),
    ('wolf-creek-retreat-combo', 'pre-christmas-2026',      890, 1008),
    ('wolf-creek-retreat-combo', 'holiday-corridor-2026',  1411, 1411),
    ('wolf-creek-retreat-combo', 'january-core-2027',       808, 1008),
    ('wolf-creek-retreat-combo', 'mlk-2027',               1125, 1191),
    ('wolf-creek-retreat-combo', 'midwinter-2027',         1186, 1252),
    ('wolf-creek-retreat-combo', 'late-winter-2027',        808, 1008),
    ('wolf-creek-retreat-combo', 'balloon-roundup-2027',   1058, 1125),
    ('wolf-creek-retreat-combo', 'shoulder-spring-2027',    632,  737)

ON CONFLICT (property_id, season_id) DO UPDATE SET
    weekday_rate = EXCLUDED.weekday_rate,
    weekend_rate = EXCLUDED.weekend_rate;

-- --------------------------------------------------------------------------
-- Stay rule fix, independent of the rate ladder.
--
-- The House and the Retreat both carry minNights = 1 today. Because the
-- cross property exclusivity trigger blocks the Retreat whenever the House
-- is booked, a single one night House booking can kill a five night Retreat
-- booking over the same weekend. A one night minimum on the largest SKU in
-- a market whose published norm is two nights is a structural leak, not a
-- flexibility feature.
-- --------------------------------------------------------------------------
UPDATE properties
SET availability = availability || '{"minNights": 2}'::jsonb,
    updated_at = now()
WHERE id IN ('wolf-creek-lodge', 'wolf-creek-retreat-combo')
  AND COALESCE((availability #>> '{minNights}')::INTEGER, 1) < 2;

-- --------------------------------------------------------------------------
-- Data integrity: the Retreat claims 7 beds while the House alone claims 11.
-- An agent reading search_properties concludes the 4BR sleeps fewer people
-- per bed than the 3BR. House 11 beds + apartment 1 bed = 12.
-- Guest cap stays at 10 because that is the real occupancy limit.
-- --------------------------------------------------------------------------
UPDATE properties
SET beds = 12,
    updated_at = now()
WHERE id = 'wolf-creek-retreat-combo' AND beds < 12;

COMMIT;
