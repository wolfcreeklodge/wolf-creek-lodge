import pool from './db.js';

// ---------------------------------------------------------------------------
// Direct booking markup.
//
// Stored rates are Airbnb parity (host side). The site quotes direct guests
// at parity plus this markup, which is the convention already baked into
// app/page.js and app/listings/[id]/page.js as a bare 1.1. Centralised here
// so there is exactly one place to change it.
// ---------------------------------------------------------------------------
export const DIRECT_MARKUP = 1.1;

export function toDisplayRate(baseRate) {
  if (baseRate == null) return null;
  return Math.round(Number(baseRate) * DIRECT_MARKUP);
}

const TIER_LABELS = {
  shoulder: 'Shoulder',
  core: 'Core season',
  peak: 'Peak',
  holiday: 'Holiday',
};

export function tierLabel(tier) {
  return TIER_LABELS[tier] || tier;
}

// ---------------------------------------------------------------------------
// The rate calendar is additive: 03-rate-calendar.sql may not be applied yet.
// Every read below degrades to legacy properties.pricing rather than throwing,
// so deploying this file ahead of the migration is safe.
// ---------------------------------------------------------------------------
let _calendarPresent = null;

async function hasRateCalendar() {
  if (_calendarPresent !== null) return _calendarPresent;
  try {
    const { rows } = await pool.query(
      `SELECT to_regclass('public.property_rates') IS NOT NULL AS present`
    );
    _calendarPresent = Boolean(rows[0]?.present);
  } catch {
    _calendarPresent = false;
  }
  return _calendarPresent;
}

function legacyRate(pricing, isWeekendNight) {
  if (!pricing) return null;
  if (isWeekendNight && pricing.weekendRate != null) return Number(pricing.weekendRate);
  return Number(pricing.nightlyRate?.min ?? pricing.nightlyRate?.max ?? 0) || null;
}

function isWeekendNight(date) {
  const dow = date.getUTCDay(); // 5 = Fri, 6 = Sat
  return dow === 5 || dow === 6;
}

function eachNight(checkIn, checkOut) {
  const nights = [];
  const cursor = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  while (cursor < end) {
    nights.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights;
}

// ---------------------------------------------------------------------------
// Quote a stay. check_out is exclusive: you do not pay for the night you
// leave. Returns the per night breakdown, not just a total, because an agent
// that can see which nights are expensive can shift its own dates.
// ---------------------------------------------------------------------------
export async function quoteStay(propertyId, checkIn, checkOut) {
  const nights = eachNight(checkIn, checkOut);
  if (nights.length === 0) {
    return { error: 'check_out must be at least one night after check_in' };
  }

  let breakdown;

  if (await hasRateCalendar()) {
    const { rows } = await pool.query(
      `SELECT night, season_id, tier, is_weekend, nightly_rate
         FROM quote_stay($1, $2::date, $3::date)`,
      [propertyId, checkIn, checkOut]
    );
    breakdown = rows.map((r) => ({
      night: r.night instanceof Date ? r.night.toISOString().slice(0, 10) : String(r.night),
      seasonId: r.season_id,
      tier: r.tier,
      isWeekend: r.is_weekend,
      baseRate: r.nightly_rate == null ? null : Number(r.nightly_rate),
    }));
  } else {
    const { rows } = await pool.query(
      'SELECT pricing FROM properties WHERE id = $1',
      [propertyId]
    );
    const pricing = rows[0]?.pricing;
    breakdown = nights.map((d) => ({
      night: d.toISOString().slice(0, 10),
      seasonId: null,
      tier: null,
      isWeekend: isWeekendNight(d),
      baseRate: legacyRate(pricing, isWeekendNight(d)),
    }));
  }

  if (breakdown.some((n) => n.baseRate == null)) {
    return { error: `No rate is published for at least one night of this stay.` };
  }

  const baseSubtotal = breakdown.reduce((sum, n) => sum + n.baseRate, 0);
  const nightCount = breakdown.length;

  // Length of stay discounts come off the property row and are unchanged.
  const { rows: propRows } = await pool.query(
    'SELECT pricing, availability FROM properties WHERE id = $1',
    [propertyId]
  );
  const discounts = propRows[0]?.pricing?.discounts || {};
  let lengthDiscountPct = 0;
  let lengthDiscountLabel = null;
  if (nightCount >= 28 && discounts.monthly?.percentage) {
    lengthDiscountPct = discounts.monthly.percentage;
    lengthDiscountLabel = `Monthly (${lengthDiscountPct}% off for 28+ nights)`;
  } else if (nightCount >= 7 && discounts.weekly?.percentage) {
    lengthDiscountPct = discounts.weekly.percentage;
    lengthDiscountLabel = `Weekly (${lengthDiscountPct}% off for 7+ nights)`;
  }

  const baseAfterDiscount = Math.round(baseSubtotal * (1 - lengthDiscountPct / 100));

  const minNights = await requiredMinNights(propertyId, checkIn, checkOut);

  return {
    propertyId,
    checkIn,
    checkOut,
    nights: nightCount,
    currency: 'USD',
    breakdown: breakdown.map((n) => ({ ...n, displayRate: toDisplayRate(n.baseRate) })),
    lengthDiscount: lengthDiscountLabel,
    baseSubtotal,
    baseTotal: baseAfterDiscount,
    displayTotal: toDisplayRate(baseAfterDiscount),
    displayNightlyAverage: toDisplayRate(baseAfterDiscount / nightCount),
    minNightsRequired: minNights,
    meetsMinNights: nightCount >= minNights,
  };
}

export async function requiredMinNights(propertyId, checkIn, checkOut) {
  if (await hasRateCalendar()) {
    try {
      const { rows } = await pool.query(
        'SELECT required_min_nights($1, $2::date, $3::date) AS n',
        [propertyId, checkIn, checkOut]
      );
      if (rows[0]?.n != null) return Number(rows[0].n);
    } catch {
      // fall through to the property row
    }
  }
  const { rows } = await pool.query(
    'SELECT availability FROM properties WHERE id = $1',
    [propertyId]
  );
  return Number(rows[0]?.availability?.minNights ?? 1) || 1;
}

// ---------------------------------------------------------------------------
// The whole published ladder, for the rates table on the winter page and for
// the MCP get_rate_calendar tool. One query, so an agent can reason about the
// season in a single call instead of probing dates one at a time.
// ---------------------------------------------------------------------------
export async function getRateCalendar({ from = null, to = null } = {}) {
  if (!(await hasRateCalendar())) return [];
  const clauses = [];
  const params = [];
  if (from) { params.push(from); clauses.push(`s.ends_on >= $${params.length}::date`); }
  if (to)   { params.push(to);   clauses.push(`s.starts_on <= $${params.length}::date`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT s.id, s.label, s.tier, s.starts_on, s.ends_on, s.priority,
            s.min_nights, s.min_nights_on_arrival, s.notes,
            COALESCE(
              jsonb_object_agg(
                pr.property_id,
                jsonb_build_object('weekday', pr.weekday_rate, 'weekend', pr.weekend_rate)
              ) FILTER (WHERE pr.property_id IS NOT NULL),
              '{}'::jsonb
            ) AS rates
       FROM rate_seasons s
       LEFT JOIN property_rates pr ON pr.season_id = s.id
       ${where}
       GROUP BY s.id
       ORDER BY s.starts_on, s.priority DESC`,
    params
  );

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    tier: r.tier,
    tierLabel: tierLabel(r.tier),
    startsOn: r.starts_on instanceof Date ? r.starts_on.toISOString().slice(0, 10) : r.starts_on,
    endsOn: r.ends_on instanceof Date ? r.ends_on.toISOString().slice(0, 10) : r.ends_on,
    minNights: r.min_nights,
    minNightsOnArrival: r.min_nights_on_arrival,
    notes: r.notes,
    rates: Object.fromEntries(
      Object.entries(r.rates).map(([pid, v]) => [
        pid,
        {
          baseWeekday: Number(v.weekday),
          baseWeekend: Number(v.weekend),
          weekday: toDisplayRate(v.weekday),
          weekend: toDisplayRate(v.weekend),
        },
      ])
    ),
  }));
}
