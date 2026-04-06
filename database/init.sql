-- Wolf Creek Lodge — PostgreSQL schema
-- Mounted into /docker-entrypoint-initdb.d/ for auto-init

BEGIN;

-- ==========================================================================
-- Site configuration (single row)
-- ==========================================================================
CREATE TABLE site_config (
    id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    brand_name  TEXT NOT NULL,
    tagline     TEXT,
    location    TEXT,
    host        JSONB NOT NULL DEFAULT '{}',
    contact_email TEXT,
    contact_phone TEXT,
    community   JSONB NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================================
-- Properties / listings
-- ==========================================================================
CREATE TABLE properties (
    id                  TEXT PRIMARY KEY,
    airbnb_url          TEXT,
    ical_import_url     TEXT,
    ical_export_token   TEXT DEFAULT gen_random_uuid(),
    status              TEXT NOT NULL DEFAULT 'listed',
    title               TEXT NOT NULL,
    subtitle            TEXT,
    description         TEXT,
    property_category   TEXT,
    property_type       TEXT,
    listing_type        TEXT,
    year_built          INTEGER,
    property_size_sqft  INTEGER,
    max_guests          INTEGER NOT NULL,
    bedrooms            INTEGER NOT NULL,
    beds                INTEGER NOT NULL DEFAULT 0,
    bathrooms           INTEGER NOT NULL,
    bedroom_details     JSONB DEFAULT '[]',
    pricing             JSONB NOT NULL DEFAULT '{}',
    availability        JSONB DEFAULT '{}',
    reviews             JSONB DEFAULT '{}',
    highlights          JSONB DEFAULT '[]',
    amenities           JSONB DEFAULT '[]',
    house_rules         JSONB DEFAULT '{}',
    cancellation_policy TEXT DEFAULT 'Firm',
    accessibility       JSONB DEFAULT '[]',
    guest_safety        JSONB DEFAULT '{}',
    is_combo_listing    BOOLEAN DEFAULT FALSE,
    combined_listings   JSONB DEFAULT '[]',
    sort_order          INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================================
-- Guests
-- ==========================================================================
CREATE TABLE guests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    city            TEXT,
    state_province  TEXT,
    country         TEXT DEFAULT 'US',
    instagram       TEXT,
    whatsapp        TEXT,
    facebook        TEXT,
    linkedin        TEXT,
    source          TEXT NOT NULL DEFAULT 'other'
                    CHECK (source IN ('airbnb','vrbo','direct','referral','other')),
    tags            JSONB DEFAULT '[]',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_name  ON guests(last_name, first_name);

-- ==========================================================================
-- Reservations
-- ==========================================================================
CREATE TABLE reservations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id          UUID NOT NULL REFERENCES guests(id),
    property_id       TEXT NOT NULL REFERENCES properties(id),
    check_in          DATE NOT NULL,
    check_out         DATE NOT NULL,
    num_guests        INTEGER,
    nightly_rate      NUMERIC(10,2),
    total_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
    amount_paid       NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_status    TEXT NOT NULL DEFAULT 'unpaid'
                      CHECK (payment_status IN ('unpaid','advance','paid_in_full','refunded')),
    payment_method    TEXT
                      CHECK (payment_method IS NULL OR payment_method IN
                        ('credit_card','bank_transfer','paypal','venmo','cash','stripe','airbnb','vrbo','other')),
    booking_channel   TEXT NOT NULL DEFAULT 'other'
                      CHECK (booking_channel IN ('airbnb','vrbo','direct','phone','other')),
    channel_conf_code TEXT,
    calendar_link     TEXT,
    status            TEXT NOT NULL DEFAULT 'confirmed'
                      CHECK (status IN ('confirmed','checked_in','completed','cancelled','no_show')),
    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reservations_guest ON reservations(guest_id);
CREATE INDEX idx_reservations_property_dates ON reservations(property_id, check_in, check_out);
CREATE INDEX idx_reservations_status ON reservations(status);

-- Prevent overlapping bookings for the same property
CREATE OR REPLACE FUNCTION check_booking_overlap() RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM reservations
        WHERE property_id = NEW.property_id
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
          AND status NOT IN ('cancelled', 'no_show')
          AND check_in < NEW.check_out
          AND check_out > NEW.check_in
    ) THEN
        RAISE EXCEPTION 'Booking dates overlap with an existing reservation for this property';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_booking_overlap
    BEFORE INSERT OR UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION check_booking_overlap();

-- Prevent overlapping bookings across mutually exclusive properties
-- (e.g. booking the Retreat blocks the House and Apartment, and vice versa)
CREATE OR REPLACE FUNCTION check_cross_property_overlap() RETURNS TRIGGER AS $$
DECLARE
    _conflicting_ids TEXT[];
    _combo JSONB;
BEGIN
    -- Case 1: booking a combo listing — check its component properties
    SELECT combined_listings INTO _combo
    FROM properties
    WHERE id = NEW.property_id AND is_combo_listing = TRUE;

    IF _combo IS NOT NULL AND jsonb_array_length(_combo) > 0 THEN
        SELECT array_agg(elem::TEXT)
        INTO _conflicting_ids
        FROM jsonb_array_elements_text(_combo) AS elem;
    ELSE
        -- Case 2: booking an individual unit — find any combo that includes it
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
        ) THEN
            RAISE EXCEPTION 'Booking dates conflict with a related property reservation (cross-property exclusivity)';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_cross_property_overlap
    BEFORE INSERT OR UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION check_cross_property_overlap();

-- ==========================================================================
-- Payments
-- ==========================================================================
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id  UUID NOT NULL REFERENCES reservations(id),
    amount          NUMERIC(10,2) NOT NULL,
    method          TEXT NOT NULL
                    CHECK (method IN ('credit_card','bank_transfer','paypal','venmo','cash','stripe','airbnb','vrbo','other')),
    paid_at         DATE NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_reservation ON payments(reservation_id);

-- ==========================================================================
-- Activity log
-- ==========================================================================
CREATE TABLE activity_log (
    id          BIGSERIAL PRIMARY KEY,
    logged_at   TIMESTAMPTZ DEFAULT now(),
    user_email  TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('guest','reservation','payment','property')),
    entity_id   TEXT NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('created','updated','deleted','imported')),
    diff        JSONB
);

CREATE INDEX idx_activity_timestamp ON activity_log(logged_at DESC);

-- ==========================================================================
-- iCal sync log
-- ==========================================================================
CREATE TABLE ical_sync_log (
    id              BIGSERIAL PRIMARY KEY,
    property_id     TEXT NOT NULL REFERENCES properties(id),
    synced_at       TIMESTAMPTZ DEFAULT now(),
    events_found    INTEGER,
    events_added    INTEGER,
    events_removed  INTEGER,
    status          TEXT NOT NULL CHECK (status IN ('success','error')),
    error_message   TEXT
);

-- ==========================================================================
-- Sessions (for CRM auth)
-- ==========================================================================
CREATE TABLE sessions (
    sid     TEXT PRIMARY KEY,
    sess    JSONB NOT NULL,
    expire  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_expire ON sessions(expire);

-- ==========================================================================
-- Seed: site configuration
-- ==========================================================================
INSERT INTO site_config (brand_name, tagline, location, host, contact_email, contact_phone, community)
VALUES (
    'Wolfridge Retreats',
    'Mountain homes on the Methow Trail — Ski, Bike, Relax',
    'Winthrop, Washington',
    '{"name": "Bo", "coHost": "Svetlana Pintea", "superhost": true, "totalReviews": 46, "averageRating": 4.93, "yearsHosting": 14}',
    'wolfcreeklodge@outlook.com',
    '+12066810117',
    '{"name": "Wolfridge Resort Community", "address": "17 Lucky Louie Rd, Winthrop, WA 98862, USA", "sharedAmenities": ["Seasonal heated pool (Memorial Day – Labor Day)", "Year-round hot tub", "Playground", "Methow River access (short walk)", "Methow Community Ski Trail (ski-in/ski-out)", "Methow Valley Trails bike network (summer)"]}'
);

-- ==========================================================================
-- Seed: properties
-- ==========================================================================
INSERT INTO properties (id, airbnb_url, status, title, subtitle, description,
    property_category, property_type, listing_type, year_built, property_size_sqft,
    max_guests, bedrooms, beds, bathrooms, bedroom_details, pricing, availability,
    reviews, highlights, amenities, house_rules, cancellation_policy,
    accessibility, guest_safety, is_combo_listing, combined_listings, sort_order)
VALUES
(
    'wolf-creek-lodge',
    'https://www.airbnb.com/rooms/845843778306428687',
    'listed',
    '3BR Mountain Home on Methow Trail Ski-In/Out',
    'Entire chalet in Winthrop, Washington',
    'Modern 3BR, 2BA home at Wolfridge – perfect for families and groups. Sleeps up to 9 with an open, light-filled living area and a fully equipped kitchen for easy meals. Fast Wi-Fi and AC for year-round comfort. Step onto the Methow Community Ski Trail that becomes a bike network in summer. Short walk to the warming hut area with seasonal pool, year-round hot tub, and the Methow River. Scenic location for skiing, hiking, biking, or wellness retreats. For more space add our 1BR apartment next door.',
    'House', 'Chalet', 'Entire place', 2023, 2500,
    9, 3, 11, 2,
    '[{"name": "Bedroom 1", "beds": ["1 king bed"]}, {"name": "Bedroom 2", "beds": ["1 queen bed", "1 single bed"]}, {"name": "Bedroom 3", "beds": ["4 bunk beds"]}]',
    '{"nightlyRate": {"min": 779, "max": 849}, "weekendRate": null, "currency": "USD", "discounts": {"weekly": {"percentage": 21, "description": "For 7 nights or more"}, "monthly": {"percentage": 30, "description": "For 28 nights or more"}}}',
    '{"minNights": 1, "maxNights": 25}',
    '{"rating": 4.94, "count": 17, "guestFavorite": true, "locationRating": "100% of guests gave 5-star location rating"}',
    '[{"icon": "self-checkin", "title": "Self check-in", "description": "Check yourself in with the lockbox."}, {"icon": "spacious", "title": "Extra spacious", "description": "Guests love this home''s spaciousness for a comfortable stay."}, {"icon": "location", "title": "Unbeatable location", "description": "100% of guests in the past year gave this location a 5-star rating."}]',
    '["Air conditioning","Backyard","Bathtub","BBQ grill","Bed linens (cotton)","Blender","Board games","Coffee maker","Cooking basics","Dedicated workspace (private)","Dining table (8 spaces)","Dishwasher","Dryer","Ethernet connection","Fire pit","Free parking","Freezer","Hair dryer","Heating (radiant + split ductless)","Hot tub (shared)","Indoor fireplace (electric)","Iron","Kitchen (full)","Microwave","Outdoor dining area","Patio or balcony","Pool (shared, seasonal)","Private entrance","Refrigerator","Rice maker","Room-darkening shades","Ski-in/Ski-out","Sound system","Stove","TV","Washer","Wifi","Wine glasses"]',
    '{"checkIn": {"start": "3:00 PM", "end": "Flexible"}, "checkOut": "11:00 AM", "petsAllowed": true, "maxPets": 1, "eventsAllowed": false, "smokingAllowed": false, "quietHours": {"start": "11:00 PM", "end": "7:00 AM"}}',
    'Firm',
    '["Step-free access"]',
    '{"safetyDevices": ["Exterior security camera", "Carbon monoxide alarm", "Smoke alarm"]}',
    FALSE, '[]', 1
),
(
    'wolf-creek-apartment',
    'https://www.airbnb.com/rooms/873890683808273374',
    'listed',
    'Bright 1BR Retreat with On Methow Trail Ski-In/Out',
    'Entire rental unit in Winthrop, Washington',
    'Wake up to ridge and open-field views from this new, high-ceiling 1BR at Wolfridge. You''re on the Methow Community Ski Trail, which becomes part of the Methow Valley Trails bike network in summer. Quiet, bright, and set up for work and play: fully equipped kitchenette, projector for movie nights, dedicated desk with external monitor and inspiring view, high-speed Wi-Fi, and air conditioning. Seasonal pool, year-round hot tub, playground, and the Methow River are a short walk.',
    'Apartment', 'Rental unit', 'Entire place', NULL, NULL,
    2, 1, 1, 1,
    '[{"name": "Bedroom", "beds": ["1 bed"]}]',
    '{"nightlyRate": {"min": 250, "max": 250}, "weekendRate": 280, "currency": "USD", "discounts": {"weekly": {"percentage": 21, "description": "For 7 nights or more"}, "monthly": {"percentage": 35, "description": "For 28 nights or more"}}}',
    '{"minNights": 2, "maxNights": 365}',
    '{"rating": 4.92, "count": 25, "guestFavorite": false}',
    '[{"icon": "self-checkin", "title": "Self check-in", "description": "Check yourself in with the lockbox."}, {"icon": "location", "title": "Beautiful area", "description": "Guests love this home''s scenic location."}, {"icon": "workspace", "title": "Dedicated workspace", "description": "A common area with wifi that''s well-suited for working."}]',
    '["Air conditioning","Backyard","BBQ grill","Bed linens (cotton)","Coffee maker (drip)","Dedicated workspace","Dining table (4 spaces)","Dishwasher","Free parking","Heating (split ductless)","Hot tub (shared, year-round)","Kitchen (kitchenette)","Long term stays allowed","Microwave","Outdoor dining area","Patio or balcony (private)","Pool (shared, seasonal)","Private entrance","Refrigerator","Resort access","Ski-in/Ski-out","Sound system (LG, Bluetooth)","Sun loungers","TV (HD, 100-inch projector)","Wifi"]',
    '{"checkIn": {"start": "3:00 PM", "end": "Flexible"}, "checkOut": "11:00 AM", "petsAllowed": true, "maxPets": 1, "eventsAllowed": true, "smokingAllowed": false}',
    'Firm',
    '[]',
    '{"safetyDevices": ["Exterior security camera", "Noise decibel monitor", "Carbon monoxide alarm", "Smoke alarm"], "propertyInfo": ["Guests must climb stairs"]}',
    FALSE, '[]', 2
),
(
    'wolf-creek-retreat-combo',
    'https://www.airbnb.com/rooms/1485188435478798238',
    'listed',
    'Methow Valley Retreat: 4BR on Trail Ski In/Out',
    'Entire home in Winthrop, Washington',
    'Designed for retreats. Book the 3BR house + new 1BR apartment together for 10-12. Ridge and open-field views, bright high-ceiling spaces, fully equipped kitchen + kitchenette, large-screen TV, projector, two desks with monitors, fast Wi-Fi, AC. On the Methow ski and bike trail. Short walk to river, seasonal pool, year-round hot tub, playground. Quiet, inspiring, ideal for yoga and wellness getaways.',
    'House', 'Home', 'Entire place', NULL, NULL,
    10, 4, 7, 3,
    '[{"name": "Bedroom 1", "beds": ["1 king bed"]}, {"name": "Bedroom 2", "beds": ["1 queen bed", "1 single bed"]}, {"name": "Bedroom 3", "beds": ["4 bunk beds"]}, {"name": "Bedroom 4 (Apartment)", "beds": ["1 bed"]}]',
    '{"nightlyRate": {"min": 950, "max": 950}, "weekendRate": 1055, "currency": "USD", "discounts": {"weekly": {"percentage": 10, "description": "For 7 nights or more"}, "monthly": {"percentage": 30, "description": "For 28 nights or more"}}}',
    '{"minNights": 1, "maxNights": 365}',
    '{"rating": 5.0, "count": 4, "guestFavorite": false}',
    '[{"icon": "self-checkin", "title": "Self check-in", "description": "Check yourself in with the lockbox."}, {"icon": "superhost", "title": "Bo is a Superhost", "description": "Superhosts are experienced, highly rated Hosts."}]',
    '["Air conditioning","Backyard","Bathtub","BBQ grill","Bed linens","Blender","Board games","Coffee maker","Cooking basics","Dedicated workspace","Dining table","Dishwasher","Dryer","Ethernet connection","Fire pit","Free parking","Freezer","Hair dryer","Heating","Hot tub","Indoor fireplace","Iron","Kitchen (full)","Microwave","Outdoor dining area","Patio or balcony","Pool","Private entrance","Refrigerator","Rice maker","Room-darkening shades","Ski-in/Ski-out","Sound system","Stove","TV","Washer","Wifi","Wine glasses"]',
    '{"checkIn": {"start": "3:00 PM", "end": "Flexible"}, "checkOut": "11:00 AM", "petsAllowed": true, "eventsAllowed": false, "smokingAllowed": false}',
    'Firm',
    '[]',
    '{"safetyDevices": ["Exterior security camera", "Carbon monoxide alarm", "Smoke alarm"]}',
    TRUE, '["wolf-creek-lodge", "wolf-creek-apartment"]', 0
);

-- ==========================================================================
-- Seed: sentinel guest for calendar blocks
-- ==========================================================================
INSERT INTO guests (id, first_name, last_name, source, notes)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'BLOCK',
  'Owner/Maintenance',
  'other',
  'Sentinel guest for calendar blocks (owner stays, maintenance, etc.)'
);

COMMIT;
