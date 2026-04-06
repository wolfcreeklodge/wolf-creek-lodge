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
import math
from datetime import datetime

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
        "Vacation-rental assistant for Wolfridge Retreats in Winthrop, WA. "
        "Provides property search, pricing, availability, area info, and booking links."
    ),
    host="0.0.0.0" if _transport == "sse" else "127.0.0.1",
    port=_port,
)

# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------


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
        "Calculate pricing for a Wolfridge Retreats property. Takes a property_id "
        "and optional number of nights. Returns nightly rate, weekend rate, total "
        "estimate with applicable weekly (7+ nights) or monthly (28+ nights) discounts. "
        "Valid property IDs: wolf-creek-lodge, wolf-creek-apartment, wolf-creek-retreat-combo."
    ),
)
def get_pricing(property_id: str, nights: int | None = None) -> dict:
    """Return pricing breakdown with discount info."""
    prop = db.get_property(property_id)
    if not prop:
        return {"error": f"Unknown property_id '{property_id}'."}

    p = prop["pricing"]
    nightly = p["nightly"]
    weekend = p.get("weekend") or p.get("nightly_high") or nightly
    weekly_disc = p["weekly_discount_pct"]
    monthly_disc = p["monthly_discount_pct"]

    result: dict = {
        "property_id": property_id,
        "title": prop["title"],
        "nightly_rate": f"{_fmt_price(nightly)}/night",
        "weekend_rate": f"{_fmt_price(weekend)}/night",
        "weekly_discount": f"{weekly_disc}% off for 7+ nights",
        "monthly_discount": f"{monthly_disc}% off for 28+ nights",
        "min_nights": prop["min_nights"],
        "max_nights": prop["max_nights"],
        "currency": "USD",
    }

    if p.get("nightly_high"):
        result["nightly_rate"] = f"{_fmt_price(nightly)}\u2013{_fmt_price(p['nightly_high'])}/night (smart pricing)"

    if nights is not None and nights > 0:
        base_total = nightly * nights
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
                "This is an estimate using the base nightly rate. Actual pricing "
                "may vary due to smart pricing, seasonal rates, and Airbnb fees."
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
