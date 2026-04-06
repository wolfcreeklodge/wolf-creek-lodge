import pool from './db.js';

// ---------------------------------------------------------------------------
// Site configuration
// ---------------------------------------------------------------------------

export async function getSiteConfig() {
  const { rows } = await pool.query('SELECT * FROM site_config WHERE id = 1');
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    brandName: row.brand_name,
    tagline: row.tagline,
    location: row.location,
    host: row.host,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    communityInfo: row.community,
  };
}

// ---------------------------------------------------------------------------
// Properties / listings
// ---------------------------------------------------------------------------

function rowToListing(row) {
  return {
    id: row.id,
    airbnbUrl: row.airbnb_url,
    status: row.status,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    propertyDetails: {
      propertyCategory: row.property_category,
      propertyType: row.property_type,
      listingType: row.listing_type,
      yearBuilt: row.year_built,
      propertySizeSqFt: row.property_size_sqft,
    },
    capacity: {
      maxGuests: row.max_guests,
      bedrooms: row.bedrooms,
      beds: row.beds,
      bathrooms: row.bathrooms,
    },
    bedrooms: row.bedroom_details,
    pricing: row.pricing,
    availability: row.availability,
    reviews: row.reviews,
    highlights: row.highlights,
    amenities: row.amenities,
    houseRules: row.house_rules,
    cancellationPolicy: row.cancellation_policy,
    accessibilityFeatures: row.accessibility,
    guestSafety: row.guest_safety,
    isComboListing: row.is_combo_listing,
    combinedListings: row.combined_listings,
  };
}

export async function getListings() {
  const { rows } = await pool.query(
    'SELECT * FROM properties ORDER BY sort_order, id'
  );
  return rows.map(rowToListing);
}

export async function getListing(id) {
  const { rows } = await pool.query('SELECT * FROM properties WHERE id = $1', [id]);
  if (!rows[0]) return null;
  return rowToListing(rows[0]);
}

export async function getListingIds() {
  const { rows } = await pool.query('SELECT id FROM properties ORDER BY sort_order, id');
  return rows.map((r) => r.id);
}
