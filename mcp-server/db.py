"""Database access layer for the MCP server."""

from __future__ import annotations

import os
import psycopg2
import psycopg2.extras

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://wolfcreek:changeme_in_production@localhost:5432/wolfcreek",
)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def fetch_one(query: str, params: tuple = ()):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            return cur.fetchone()


def fetch_all(query: str, params: tuple = ()):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            return cur.fetchall()


# ---- High-level queries ----


def get_all_properties() -> list[dict]:
    rows = fetch_all("SELECT * FROM properties ORDER BY sort_order, id")
    return [_row_to_property(r) for r in rows]


def get_property(property_id: str) -> dict | None:
    row = fetch_one("SELECT * FROM properties WHERE id = %s", (property_id,))
    return _row_to_property(row) if row else None


def get_property_ids() -> list[str]:
    rows = fetch_all("SELECT id FROM properties ORDER BY sort_order, id")
    return [r["id"] for r in rows]


def get_site_config() -> dict | None:
    return fetch_one("SELECT * FROM site_config WHERE id = 1")


def check_reservation_overlap(property_id: str, check_in: str, check_out: str) -> list[dict]:
    return fetch_all(
        """
        SELECT id, check_in, check_out, status
        FROM reservations
        WHERE property_id = %s
          AND status NOT IN ('cancelled', 'no_show')
          AND check_in < %s::date
          AND check_out > %s::date
        """,
        (property_id, check_out, check_in),
    )


def _row_to_property(row: dict) -> dict:
    """Transform a DB row into the property dict format used by MCP tools."""
    pricing = row["pricing"]
    nightly_min = pricing.get("nightlyRate", {}).get("min", 0)
    nightly_max = pricing.get("nightlyRate", {}).get("max", nightly_min)
    discounts = pricing.get("discounts", {})
    availability = row.get("availability") or {}

    return {
        "id": row["id"],
        "title": row["title"],
        "subtitle": row["subtitle"],
        "description": row["description"],
        "type": row["property_type"],
        "place_type": row["listing_type"],
        "built": row.get("year_built"),
        "sqft": row.get("property_size_sqft"),
        "capacity": row["max_guests"],
        "bedrooms": row["bedrooms"],
        "beds": row["beds"],
        "bathrooms": row["bathrooms"],
        "bedroom_details": [
            f"{b['name']}: {', '.join(b.get('beds', []))}"
            for b in (row.get("bedroom_details") or [])
        ],
        "pricing": {
            "nightly": nightly_min,
            "nightly_high": nightly_max if nightly_max != nightly_min else None,
            "weekend": pricing.get("weekendRate"),
            "currency": pricing.get("currency", "USD"),
            "weekly_discount_pct": discounts.get("weekly", {}).get("percentage", 0),
            "monthly_discount_pct": discounts.get("monthly", {}).get("percentage", 0),
        },
        "min_nights": availability.get("minNights", 1),
        "max_nights": availability.get("maxNights", 365),
        "reviews": {
            "rating": row["reviews"].get("rating", 0),
            "count": row["reviews"].get("count", 0),
            "guest_favorite": row["reviews"].get("guestFavorite", False),
            "location_5star_pct": None,
        },
        "highlights": [
            h.get("title", "") for h in (row.get("highlights") or [])
        ],
        "house_rules": _format_house_rules(row.get("house_rules") or {}),
        "cancellation": row.get("cancellation_policy", "Firm"),
        "airbnb_url": row["airbnb_url"],
        "amenities": row.get("amenities") or [],
        "is_combo_listing": row.get("is_combo_listing", False),
        "combines": row.get("combined_listings") or [],
    }


def _format_house_rules(rules: dict) -> dict:
    check_in = rules.get("checkIn", {})
    return {
        "pets": (
            f"Yes (max {rules['maxPets']})"
            if rules.get("petsAllowed") and rules.get("maxPets")
            else ("Yes" if rules.get("petsAllowed") else "No")
        ),
        "events": "Allowed" if rules.get("eventsAllowed") else "No",
        "smoking": "Allowed" if rules.get("smokingAllowed") else "No",
        "check_in": check_in.get("start", "3:00 PM"),
        "check_out": rules.get("checkOut", "11:00 AM"),
    }


# ---- Seasonal rate calendar -------------------------------------------------
#
# Added with database/03-rate-calendar.sql. Every function here degrades to
# None or an empty list when the migration has not been applied, so the MCP
# server keeps serving on an un-migrated database.


def _rate_calendar_present() -> bool:
    try:
        row = fetch_one("SELECT to_regclass('public.property_rates') IS NOT NULL AS present")
        return bool(row and row["present"])
    except Exception:
        return False


def quote_stay(property_id: str, check_in: str, check_out: str) -> list[dict]:
    """Per-night breakdown of base (platform parity) rates. Empty if no calendar."""
    if not _rate_calendar_present():
        return []
    try:
        return fetch_all(
            """
            SELECT night, season_id, tier, is_weekend, nightly_rate
            FROM quote_stay(%s, %s::date, %s::date)
            """,
            (property_id, check_in, check_out),
        )
    except Exception:
        return []


def required_min_nights(property_id: str, check_in: str, check_out: str) -> int | None:
    if not _rate_calendar_present():
        return None
    try:
        row = fetch_one(
            "SELECT required_min_nights(%s, %s::date, %s::date) AS n",
            (property_id, check_in, check_out),
        )
        return int(row["n"]) if row and row["n"] is not None else None
    except Exception:
        return None


def get_rate_calendar(date_from: str | None = None, date_to: str | None = None) -> list[dict]:
    if not _rate_calendar_present():
        return []
    clauses, params = [], []
    if date_from:
        params.append(date_from)
        clauses.append("s.ends_on >= %s::date")
    if date_to:
        params.append(date_to)
        clauses.append("s.starts_on <= %s::date")
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    try:
        return fetch_all(
            f"""
            SELECT s.id, s.label, s.tier, s.starts_on, s.ends_on,
                   s.min_nights, s.notes,
                   COALESCE(
                     jsonb_object_agg(
                       pr.property_id,
                       jsonb_build_object('weekday', pr.weekday_rate,
                                          'weekend', pr.weekend_rate)
                     ) FILTER (WHERE pr.property_id IS NOT NULL),
                     '{{}}'::jsonb
                   ) AS rates
            FROM rate_seasons s
            LEFT JOIN property_rates pr ON pr.season_id = s.id
            {where}
            GROUP BY s.id
            ORDER BY s.starts_on, s.priority DESC
            """,
            tuple(params),
        )
    except Exception:
        return []
