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
