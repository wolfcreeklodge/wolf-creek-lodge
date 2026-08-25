"""
Wolfridge Retreats MCP Server
=============================
A Model Context Protocol server exposing vacation-rental tools, resources, and
prompts for the Wolf Creek Lodge properties in Winthrop, WA.

Data is read from PostgreSQL (shared with the website and CRM).

Transports:
  - stdio  (default, for Claude Desktop)
  - sse    (set MCP_TRANSPORT=sse and MCP_PORT=8081 for web integration)
"""

from __future__ import annotations

import os
import json
import math
from datetime import date, datetime, timedelta
from pathlib import Path

from mcp.server.fastmcp import FastMCP
import db

# ---------------------------------------------------------------------------
# Server instance
# ---------------------------------------------------------------------------

_transport = os.environ.get("MCP_TRANSPORT", "stdio")
_port = int(os.environ.get("MCP_PORT", "8081"))

mcp = FastMCP(
    "wolfridge-retreats",
    instructions=(
        "Vacation-rental assistant for Wolfridge Retreats in Winthrop, WA (Methow Valley). "
        "Two physical units, three bookable configurations, and they are MUTUALLY EXCLUSIVE: "
        "wolf-creek-retreat-combo is the house and the apartment let together, so booking it "
        "blocks wolf-creek-lodge and wolf-creek-apartment for those dates, and booking either "
        "of those blocks the combo. The database enforces this, so a conflicting request is "
        "rejected rather than quietly accepted. "
        "Rates are seasonal: always pass check_in and check_out to get_pricing rather than "
        "quoting a flat nightly figure. Never assert a date is available without calling "
        "check_availability. There is no automated checkout: bookings are confirmed by a human "
        "via get_booking_link. "
        "Winter note: the North Cascades Highway (SR 20) closes every winter, so guests driving "
        "from Seattle between roughly December and late April must take the southern route. "
        "Call get_winter_info before advising on a winter trip."
    ),
    host="0.0.0.0" if _transport == "sse" else "127.0.0.1",
    port=_port,
)

# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------


# The website quotes direct guests at platform parity plus this markup
# (website/lib/pricing.js DIRECT_MARKUP). The MCP server used to quote the
# stored base rate, which meant an agent undercut the published website price.
# Quote the same number a human sees.
DIRECT_MARKUP = 1.1

_WINTER_PATH = Path(__file__).resolve().parent.parent / "website" / "data" / "winter-2026-27.json"


def _direct(amount: int | float) -> int:
    return round(float(amount) * DIRECT_MARKUP)


def _load_winter() -> dict:
    try:
        with open(_WINTER_PATH, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {}


def _fmt_price(amount: int | float) -> str:
    return f"${amount:,.0f}"


def _property_summary(prop: dict) -> dict:
    """Return a compact summary of a property for listing views."""
    p = prop["pricing"]
    nightly_str = _fmt_price(p["nightly"])
    if p.get("nightly_high"):
        nightly_str += f"\u2013{_fmt_price(p['nightly_high'])}"
    return {
        "id": prop["id"],
        "title": prop["title"],
        "subtitle": prop["subtitle"],
        "type": prop["type"],
        "capacity": f"{prop['capacity']} guests",
        "bedrooms": prop["bedrooms"],
        "bathrooms": prop["bathrooms"],
        "nightly_rate": f"{nightly_str}/night",
        "rating": prop["reviews"]["rating"],
        "review_count": prop["reviews"]["count"],
        "highlights": prop["highlights"],
        "airbnb_url": prop["airbnb_url"],
        "is_combo_listing": prop.get("is_combo_listing", False),
    }


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@mcp.tool(
    description=(
        "Search available Wolfridge Retreats properties in Winthrop, WA. "
        "Returns a structured list with descriptions, capacity, amenities, "
        "ratings, and pricing for each property. Optionally filter by minimum "
        "guest capacity."
    ),
)
def search_properties(guests: int | None = None) -> dict:
    """Search vacation rental properties, optionally filtered by guest capacity."""
    properties = db.get_all_properties()
    results = []
    for prop in properties:
        if guests is not None and prop["capacity"] < guests:
            continue
        summary = _property_summary(prop)
        summary["amenities_preview"] = prop["amenities"][:8]
        summary["description_short"] = prop["description"][:200] + "..."
        results.append(summary)

    note = (
        "Note: The Retreat (wolf-creek-retreat-combo) combines the House and "
        "Apartment into one booking. If you book the Retreat, both individual "
        "listings become unavailable for those dates, and vice versa."
    )
    return {
        "properties": results,
        "count": len(results),
        "mutual_exclusion_note": note,
    }


@mcp.tool(
    description=(
        "Get full details for a specific Wolfridge Retreats property. "
        "Returns description, bedrooms, bathrooms, amenities, house rules, "
        "highlights, pricing, and reviews. "
        "Valid property IDs: wolf-creek-lodge, wolf-creek-apartment, wolf-creek-retreat-combo."
    ),
)
def get_property_details(property_id: str) -> dict:
    """Return comprehensive details for one property."""
    prop = db.get_property(property_id)
    if not prop:
        return {"error": f"Unknown property_id '{property_id}'. Valid IDs: {', '.join(sorted(db.get_property_ids()))}"}

    config = db.get_site_config()
    host_info = config["host"] if config else {}

    return {
        "property": prop,
        "host": {
            "name": host_info.get("name"),
            "superhost": host_info.get("superhost"),
            "years_hosting": host_info.get("yearsHosting"),
            "average_rating": host_info.get("averageRating"),
        },
        "community": {
            "name": config["community"].get("name") if config else None,
            "address": config["community"].get("address") if config else None,
            "shared_amenities": config["community"].get("sharedAmenities", []) if config else [],
        },
        "mutual_exclusion_note": (
            "Booking the Retreat (combo) blocks both the House and Apartment. "
            "Booking either the House or Apartment blocks the Retreat."
        ),
    }


@mcp.tool(
    description=(
        "Quote pricing for a Wolfridge Retreats property. Pass check_in and check_out "
        "(YYYY-MM-DD) for an exact, date-aware quote: rates vary by season and by day of "
        "week, so a date-less quote is an approximation only. Falls back to a flat "
        "nightly estimate when only 'nights' is given. Returns the per-night breakdown, "
        "length-of-stay discounts, the minimum stay required for those dates, and whether "
        "the requested stay satisfies it. All prices are direct-booking prices in USD, the "
        "same numbers shown on wolfcreeklodge.us. "
        "Valid property IDs: wolf-creek-lodge, wolf-creek-apartment, wolf-creek-retreat-combo."
    ),
)
def get_pricing(
    property_id: str,
    nights: int | None = None,
    check_in: str | None = None,
    check_out: str | None = None,
) -> dict:
    """Return pricing breakdown with discount info."""
    prop = db.get_property(property_id)
    if not prop:
        return {"error": f"Unknown property_id '{property_id}'."}

    # ---- Date-aware path: use the seasonal rate calendar ------------------
    if check_in and check_out:
        try:
            ci = datetime.strptime(check_in, "%Y-%m-%d").date()
            co = datetime.strptime(check_out, "%Y-%m-%d").date()
        except ValueError:
            return {"error": "Dates must be in YYYY-MM-DD format."}
        if co <= ci:
            return {"error": "check_out must be at least one night after check_in."}

        rows = db.quote_stay(property_id, check_in, check_out)
        if rows:
            per_night = [
                {
                    "night": r["night"].isoformat() if hasattr(r["night"], "isoformat") else str(r["night"]),
                    "season": r["season_id"],
                    "tier": r["tier"],
                    "weekend_rate_night": bool(r["is_weekend"]),
                    "rate": _direct(r["nightly_rate"]),
                }
                for r in rows
                if r["nightly_rate"] is not None
            ]
            if len(per_night) == len(rows):
                n = len(per_night)
                subtotal = sum(x["rate"] for x in per_night)
                pr = prop["pricing"]
                disc_pct, disc_label = 0, "none"
                if n >= 28 and pr["monthly_discount_pct"]:
                    disc_pct = pr["monthly_discount_pct"]
                    disc_label = f"monthly ({disc_pct}% off)"
                elif n >= 7 and pr["weekly_discount_pct"]:
                    disc_pct = pr["weekly_discount_pct"]
                    disc_label = f"weekly ({disc_pct}% off)"
                discount = math.floor(subtotal * disc_pct / 100)
                total = subtotal - discount

                min_req = db.required_min_nights(property_id, check_in, check_out) or prop["min_nights"]

                return {
                    "property_id": property_id,
                    "title": prop["title"],
                    "check_in": check_in,
                    "check_out": check_out,
                    "nights": n,
                    "currency": "USD",
                    "price_basis": "direct booking (same as wolfcreeklodge.us)",
                    "per_night": per_night,
                    "subtotal": _fmt_price(subtotal),
                    "discount_applied": disc_label,
                    "discount_amount": f"-{_fmt_price(discount)}",
                    "total": _fmt_price(total),
                    "average_per_night": _fmt_price(total / n),
                    "min_nights_required": min_req,
                    "meets_min_nights": n >= min_req,
                    "note": (
                        "Rates are per night and vary by season and day of week. "
                        "Friday and Saturday nights price at the weekend rate. "
                        "This quote does not confirm availability: call check_availability."
                    ),
                }

    p = prop["pricing"]
    nightly = p["nightly"]
    weekend = p.get("weekend") or p.get("nightly_high") or nightly
    weekly_disc = p["weekly_discount_pct"]
    monthly_disc = p["monthly_discount_pct"]

    result: dict = {
        "property_id": property_id,
        "title": prop["title"],
        "nightly_rate": f"{_fmt_price(_direct(nightly))}/night",
        "weekend_rate": f"{_fmt_price(_direct(weekend))}/night",
        "price_basis": "direct booking (same as wolfcreeklodge.us)",
        "weekly_discount": f"{weekly_disc}% off for 7+ nights",
        "monthly_discount": f"{monthly_disc}% off for 28+ nights",
        "min_nights": prop["min_nights"],
        "max_nights": prop["max_nights"],
        "currency": "USD",
    }

    if p.get("nightly_high"):
        result["nightly_rate"] = (
            f"{_fmt_price(_direct(nightly))}\u2013{_fmt_price(_direct(p['nightly_high']))}/night"
        )

    if nights is not None and nights > 0:
        base_total = _direct(nightly) * nights
        discount_pct = 0
        discount_label = "none"
        if nights >= 28:
            discount_pct = monthly_disc
            discount_label = f"monthly ({monthly_disc}% off)"
        elif nights >= 7:
            discount_pct = weekly_disc
            discount_label = f"weekly ({weekly_disc}% off)"

        discount_amount = math.floor(base_total * discount_pct / 100)
        total = base_total - discount_amount

        result["estimate"] = {
            "nights": nights,
            "base_total": _fmt_price(base_total),
            "discount_applied": discount_label,
            "discount_amount": f"-{_fmt_price(discount_amount)}",
            "estimated_total": _fmt_price(total),
            "note": (
                "Approximation only: this uses one flat nightly rate. Rates vary by "
                "season and day of week, so pass check_in and check_out for a real quote."
            ),
        }

    return result


@mcp.tool(
    description=(
        "Check availability for a Wolfridge Retreats property. Takes property_id, "
        "check_in date (YYYY-MM-DD), and check_out date (YYYY-MM-DD). "
        "Checks against the reservation database for conflicts. Also explains the mutual "
        "exclusion constraint between listings. "
        "Valid property IDs: wolf-creek-lodge, wolf-creek-apartment, wolf-creek-retreat-combo."
    ),
)
def check_availability(property_id: str, check_in: str, check_out: str) -> dict:
    """Check availability for given dates against the reservations database."""
    prop = db.get_property(property_id)
    if not prop:
        return {"error": f"Unknown property_id '{property_id}'."}

    # Validate date formats
    try:
        ci = datetime.strptime(check_in, "%Y-%m-%d")
        co = datetime.strptime(check_out, "%Y-%m-%d")
        if co <= ci:
            return {"error": "check_out must be after check_in."}
        nights = (co - ci).days
    except ValueError:
        return {"error": "Dates must be in YYYY-MM-DD format."}

    if nights < prop["min_nights"]:
        return {
            "error": (
                f"Minimum stay for {prop['title']} is {prop['min_nights']} night(s). "
                f"Requested: {nights} night(s)."
            ),
        }
    if nights > prop["max_nights"]:
        return {
            "error": (
                f"Maximum stay for {prop['title']} is {prop['max_nights']} nights. "
                f"Requested: {nights} nights."
            ),
        }

    # Check for conflicting reservations
    conflicts = db.check_reservation_overlap(property_id, check_in, check_out)

    # Also check mutual-exclusion properties
    ids_to_check = set()
    if prop["is_combo_listing"]:
        ids_to_check = set(prop.get("combines", []))
    else:
        # Check if any combo listing includes this property
        for p in db.get_all_properties():
            if p["is_combo_listing"] and property_id in p.get("combines", []):
                ids_to_check.add(p["id"])

    for related_id in ids_to_check:
        conflicts.extend(db.check_reservation_overlap(related_id, check_in, check_out))

    if conflicts:
        return {
            "property_id": property_id,
            "title": prop["title"],
            "check_in": check_in,
            "check_out": check_out,
            "nights": nights,
            "status": "unavailable",
            "message": f"The property has {len(conflicts)} conflicting reservation(s) for the requested dates.",
            "airbnb_url": prop["airbnb_url"],
        }

    return {
        "property_id": property_id,
        "title": prop["title"],
        "check_in": check_in,
        "check_out": check_out,
        "nights": nights,
        "status": "available",
        "message": "No conflicting reservations found. The property appears available for these dates.",
        "airbnb_url": prop["airbnb_url"],
        "mutual_exclusion_note": (
            "Important: The House (wolf-creek-lodge) and Apartment (wolf-creek-apartment) "
            "share dates with the Retreat (wolf-creek-retreat-combo). If one is booked, "
            "the overlapping listing(s) become unavailable for those dates."
        ),
    }


@mcp.tool(
    description=(
        "Get information about the Winthrop / Methow Valley area: location overview, "
        "activities by season (winter skiing, summer biking & river, fall foliage, etc.), "
        "wellness opportunities, and Wolfridge Resort community amenities."
    ),
)
def get_area_info() -> dict:
    """Return area and activity information for Winthrop, Methow Valley."""
    config = db.get_site_config()
    community = config["community"] if config else {}
    return {
        "location": "Winthrop, Methow Valley, Washington",
        "description": (
            "Winthrop is a charming Western-themed town in the Methow Valley, "
            "surrounded by the North Cascades. The valley offers world-class "
            "outdoor recreation year-round and is known for its tight-knit "
            "community, dark skies, and stunning mountain scenery."
        ),
        "activities_by_season": {
            "winter": [
                "Cross-country skiing on 200+ km of groomed trails (largest network in North America)",
                "Fat biking on groomed trails",
                "Snowshoeing",
                "Downhill skiing at Loup Loup Ski Bowl (30 min drive)",
                "Ice skating",
            ],
            "spring": [
                "Wildflower hikes",
                "River kayaking and paddleboarding as snow melts",
                "Mountain biking on opening trails",
                "Fishing",
                "Bird watching",
            ],
            "summer": [
                "Mountain biking on Methow Valley Trails network",
                "River swimming, tubing, kayaking on the Methow River",
                "Hiking in North Cascades National Park",
                "Rock climbing at Goat Wall and Fun Rock",
                "Horseback riding",
                "Golf",
                "Farmers markets and live music",
            ],
            "fall": [
                "Fall foliage hikes \u2013 stunning larch season",
                "Mountain biking",
                "Fishing",
                "Quiet wellness retreats",
                "Stargazing (dark sky season)",
            ],
        },
        "wellness": [
            "Yoga-friendly spaces in both the house and apartment",
            "Quiet, nature-immersed setting",
            "Hot tub for post-activity recovery",
            "Methow River for cold plunge / wild swimming",
            "Miles of peaceful trails for walking meditation",
        ],
        "community_amenities": community.get("sharedAmenities", []),
    }


@mcp.tool(
    description=(
        "Get information about the host, Bo. Returns Superhost status, years hosting, "
        "average rating, total reviews, and co-host details."
    ),
)
def get_host_info() -> dict:
    """Return host profile information."""
    config = db.get_site_config()
    if not config:
        return {"error": "Site configuration not found."}
    host = config["host"]
    return {
        "name": host.get("name"),
        "co_host": host.get("coHost"),
        "superhost": host.get("superhost"),
        "years_hosting": host.get("yearsHosting"),
        "total_reviews": host.get("totalReviews"),
        "average_rating": host.get("averageRating"),
        "contact_email": config.get("contact_email"),
        "contact_phone": config.get("contact_phone"),
    }


@mcp.tool(
    description=(
        "Get the Airbnb booking link for a specific property. Also returns links for "
        "all three listings so the guest can compare. "
        "Valid property IDs: wolf-creek-lodge, wolf-creek-apartment, wolf-creek-retreat-combo."
    ),
)
def get_booking_link(property_id: str) -> dict:
    """Return Airbnb URL(s) for the requested property."""
    prop = db.get_property(property_id)
    if not prop:
        return {"error": f"Unknown property_id '{property_id}'."}

    all_properties = db.get_all_properties()
    return {
        "property_id": property_id,
        "title": prop["title"],
        "booking_url": prop["airbnb_url"],
        "all_listings": {
            p["id"]: {
                "title": p["title"],
                "url": p["airbnb_url"],
                "capacity": f"{p['capacity']} guests",
            }
            for p in all_properties
        },
    }


# ---------------------------------------------------------------------------
# Resources
# ---------------------------------------------------------------------------

@mcp.tool(
    description=(
        "Get the published seasonal rate ladder: every dated rate window for the season with "
        "its tier (shoulder, core, peak, holiday), the minimum stay it requires, and the "
        "per-night direct-booking rate for each of the three configurations. Optional "
        "date_from and date_to (YYYY-MM-DD) narrow the range. Use this to reason about a whole "
        "season in one call, or to suggest cheaper adjacent dates, instead of probing "
        "get_pricing date by date."
    ),
)
def get_rate_calendar(date_from: str | None = None, date_to: str | None = None) -> dict:
    """Return the seasonal rate ladder with minimum-stay rules."""
    rows = db.get_rate_calendar(date_from, date_to)
    if not rows:
        return {
            "seasons": [],
            "note": (
                "No seasonal rate calendar is published. Rates are currently flat year-round; "
                "call get_pricing for the single nightly rate."
            ),
        }

    seasons = []
    for r in rows:
        rates = {}
        for pid, v in (r["rates"] or {}).items():
            weekday = _direct(v["weekday"])
            weekend = _direct(v["weekend"])
            rates[pid] = {
                "sun_to_thu": _fmt_price(weekday),
                "fri_and_sat": _fmt_price(weekend),
            }
        seasons.append({
            "id": r["id"],
            "label": r["label"],
            "tier": r["tier"],
            "starts_on": r["starts_on"].isoformat() if hasattr(r["starts_on"], "isoformat") else str(r["starts_on"]),
            "ends_on": r["ends_on"].isoformat() if hasattr(r["ends_on"], "isoformat") else str(r["ends_on"]),
            "min_nights": r["min_nights"],
            "rates": rates,
            "note": r.get("notes"),
        })

    return {
        "currency": "USD",
        "price_basis": "direct booking, per night (same as wolfcreeklodge.us)",
        "weekend_definition": "Friday and Saturday nights price at the weekend rate",
        "seasons": seasons,
        "note": (
            "Length-of-stay discounts apply on top: see get_pricing for a specific stay. "
            "A rate is not an availability guarantee; call check_availability."
        ),
    }


@mcp.tool(
    description=(
        "Get winter-specific information for the Methow Valley: the ski trail network and "
        "grooming pattern, trail pass prices, the Loup Loup Ski Bowl downhill area, the "
        "confirmed winter event calendar, the holiday and school-break windows that book "
        "first, and the winter road access constraint (the North Cascades Highway is closed "
        "all winter). Call this before advising on any trip between November and April."
    ),
)
def get_winter_info() -> dict:
    """Return sourced winter facts, events and the winter driving constraint."""
    w = _load_winter()
    if not w:
        return {
            "error": "Winter reference data is unavailable.",
            "fallback": (
                "Wolfridge sits on the Methow Community Trail within the Methow Trails network "
                "(200+ km groomed, the largest in North America). Loup Loup Ski Bowl is about "
                "30 minutes away. The North Cascades Highway (SR 20) is closed every winter."
            ),
        }

    trails = w.get("trails", {})
    downhill = w.get("downhill", {})
    getting_here = w.get("gettingHere", {})

    return {
        "season": w.get("season"),
        "compiled_on": w.get("compiledOn"),
        "data_note": w.get("note"),
        "trails": {
            "network": trails.get("network"),
            "groomed_km": trails.get("groomedKm"),
            "claim": trails.get("claim"),
            "grooming_cadence": trails.get("groomingCadence"),
            "our_trail_access": trails.get("communityTrail", {}).get("detail"),
            "season_opening": trails.get("seasonOpening", {}).get("text"),
            "passes": [
                {
                    "name": p["name"],
                    "price": "Free" if p["price"] == 0 else f"${p['price']}",
                    "note": p.get("note"),
                }
                for p in trails.get("passes", [])
            ],
            "pass_source": trails.get("passSource"),
        },
        "downhill": {
            "name": downhill.get("name"),
            "drive_time": downhill.get("driveFromWinthrop"),
            "vertical_ft": downhill.get("verticalFt"),
            "skiable_acres": downhill.get("skiableAcres"),
            "runs": downhill.get("runs"),
            "average_snowfall_inches": downhill.get("averageSnowfallInches"),
            "also_on_site": downhill.get("alsoOnSite"),
            "caveat": downhill.get("note"),
        },
        "winter_road_access": {
            "headline": getting_here.get("headline"),
            "detail": getting_here.get("detail"),
            "sources": getting_here.get("sources", []),
            "agent_instruction": (
                "Do not quote a summer drive time for a winter stay. The North Cascades "
                "Highway route does not exist between roughly December and late April."
            ),
        },
        "events": w.get("events", []),
        "windows_that_book_first": w.get("planningWindows", []),
        "seasonal_amenity_warning": (
            "The heated community pool is Memorial Day to Labor Day only. The hot tub is "
            "year round. Do not promise the pool for a winter booking."
        ),
    }


@mcp.resource(
    uri="properties://list",
    name="All Properties",
    description="Summary list of all Wolfridge Retreats properties.",
)
def list_properties() -> dict:
    """Resource: summary of all properties."""
    properties = db.get_all_properties()
    return {
        "properties": [_property_summary(p) for p in properties],
        "count": len(properties),
    }


@mcp.resource(
    uri="properties://{property_id}",
    name="Property Details",
    description="Full details for a specific property by ID.",
)
def property_resource(property_id: str) -> dict:
    """Resource: full property details by ID."""
    prop = db.get_property(property_id)
    if not prop:
        return {"error": f"Unknown property_id '{property_id}'."}
    return prop


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

@mcp.prompt(
    name="plan_trip",
    description=(
        "Help an AI agent plan a trip to Winthrop, WA staying at Wolfridge Retreats. "
        "Gathers group size, dates, interests, and budget to recommend the best property "
        "and build an itinerary."
    ),
)
def plan_trip() -> str:
    """Return a prompt template for trip planning."""
    return (
        "You are a helpful travel planning assistant for Wolfridge Retreats in "
        "Winthrop, WA (Methow Valley). Help the user plan their trip by asking:\n\n"
        "1. **Group size** \u2013 How many guests? (This determines which property fits.)\n"
        "2. **Dates** \u2013 When are you thinking of visiting? (Season affects activities.)\n"
        "3. **Interests** \u2013 What do you enjoy? Options include:\n"
        "   - Skiing / snowshoeing (winter)\n"
        "   - Mountain biking / road cycling (spring\u2013fall)\n"
        "   - Hiking / trail running\n"
        "   - River activities (swimming, tubing, kayaking)\n"
        "   - Wellness / yoga retreat\n"
        "   - Remote work + play\n"
        "   - Family vacation with kids\n"
        "4. **Budget** \u2013 Any budget range in mind?\n\n"
        "Based on their answers, recommend the best property:\n"
        "- **Wolf Creek Lodge** (3BR house, up to 9 guests) \u2013 great for families/groups\n"
        "- **Wolf Creek Apartment** (1BR, up to 2 guests) \u2013 great for couples/solo\n"
        "- **Wolf Creek Retreat Combo** (4BR house+apt, up to 10 guests) \u2013 ideal for "
        "retreats and larger groups\n\n"
        "Use the available MCP tools (search_properties, get_pricing, get_area_info, "
        "check_availability, get_booking_link) to provide accurate, up-to-date info. "
        "Always share the Airbnb booking link when recommending a property."
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run(transport=_transport)
