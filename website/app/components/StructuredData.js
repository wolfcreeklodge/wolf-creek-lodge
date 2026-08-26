import { toDisplayRate } from '../../lib/pricing.js';

// ---------------------------------------------------------------------------
// JSON-LD for the three SKUs.
//
// The point of this is not SEO decoration. It is that an agent arriving at
// wolfcreeklodge.us with no MCP connection should still be able to answer
// "how many does it sleep, what does it cost in February, and can I book the
// house and the apartment at the same time" without scraping prose. The
// mutual exclusion constraint between the three SKUs is the one fact a
// vacation rental schema cannot express, so it is stated in plain language in
// the description and in /llms.txt, and enforced in the database.
// ---------------------------------------------------------------------------

const SITE = 'https://wolfcreeklodge.us';

const ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: '17 Lucky Louie Rd',
  addressLocality: 'Winthrop',
  addressRegion: 'WA',
  postalCode: '98862',
  addressCountry: 'US',
};

const GEO = {
  '@type': 'GeoCoordinates',
  latitude: 48.4487,
  longitude: -120.1837,
};

function offersFor(propertyId, calendar) {
  if (!calendar || calendar.length === 0) return undefined;

  return calendar
    .filter((s) => s.rates[propertyId])
    .map((s) => {
      const r = s.rates[propertyId];
      const low = Math.min(r.weekday, r.weekend);
      const high = Math.max(r.weekday, r.weekend);
      return {
        '@type': 'Offer',
        name: s.label,
        availabilityStarts: s.startsOn,
        availabilityEnds: s.endsOn,
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          priceCurrency: 'USD',
          minPrice: low,
          maxPrice: high,
          unitCode: 'DAY',
          referenceQuantity: {
            '@type': 'QuantitativeValue',
            value: 1,
            unitCode: 'DAY',
          },
        },
        eligibleQuantity: {
          '@type': 'QuantitativeValue',
          minValue: s.minNights,
          unitCode: 'DAY',
          description: `Minimum stay ${s.minNights} nights`,
        },
        url: `${SITE}/listings/${propertyId}`,
      };
    });
}

function accommodationFor(listing, calendar, exclusionNote) {
  const { capacity, propertyDetails, reviews, amenities } = listing;

  const node = {
    '@type': 'VacationRental',
    '@id': `${SITE}/listings/${listing.id}#accommodation`,
    identifier: listing.id,
    name: listing.title,
    description: `${listing.description} ${exclusionNote}`.trim(),
    url: `${SITE}/listings/${listing.id}`,
    address: ADDRESS,
    geo: GEO,
    containedInPlace: { '@id': `${SITE}/#lodging` },
    numberOfRooms: capacity.bedrooms,
    numberOfBedrooms: capacity.bedrooms,
    numberOfBathroomsTotal: capacity.bathrooms,
    numberOfBeds: capacity.beds,
    occupancy: {
      '@type': 'QuantitativeValue',
      maxValue: capacity.maxGuests,
      unitText: 'guests',
    },
    petsAllowed: Boolean(listing.houseRules?.petsAllowed),
    checkinTime: listing.houseRules?.checkIn?.start,
    checkoutTime: listing.houseRules?.checkOut,
    tourBookingPage: `${SITE}/availability`,
  };

  if (propertyDetails?.propertySizeSqFt) {
    node.floorSize = {
      '@type': 'QuantitativeValue',
      value: propertyDetails.propertySizeSqFt,
      unitCode: 'FTK',
    };
  }

  if (Array.isArray(amenities) && amenities.length > 0) {
    node.amenityFeature = amenities.slice(0, 40).map((a) => ({
      '@type': 'LocationFeatureSpecification',
      name: typeof a === 'string' ? a : a.name || String(a),
      value: true,
    }));
  }

  if (reviews?.rating && reviews?.count) {
    node.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: reviews.rating,
      reviewCount: reviews.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const offers = offersFor(listing.id, calendar);
  if (offers) {
    node.offers = offers;
  } else if (listing.pricing?.nightlyRate?.min) {
    node.offers = {
      '@type': 'Offer',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        priceCurrency: 'USD',
        minPrice: toDisplayRate(listing.pricing.nightlyRate.min),
        maxPrice: toDisplayRate(
          listing.pricing.weekendRate || listing.pricing.nightlyRate.max
        ),
        unitCode: 'DAY',
      },
      url: `${SITE}/listings/${listing.id}`,
    };
  }

  return node;
}

export default function StructuredData({ siteConfig, listings, calendar = [] }) {
  const combo = listings.find((l) => l.isComboListing);
  const componentIds = combo?.combinedListings || [];

  const exclusionNoteFor = (id) => {
    if (combo && id === combo.id) {
      return 'Booking this combined listing blocks both component units for the same dates.';
    }
    if (combo && componentIds.includes(id)) {
      return `Booking this unit blocks the combined ${combo.bedrooms || 4}-bedroom listing (${combo.id}) for the same dates.`;
    }
    return '';
  };

  const graph = [
    {
      '@type': 'LodgingBusiness',
      '@id': `${SITE}/#lodging`,
      name: siteConfig?.brandName || 'Wolfridge Retreats',
      description:
        'Two mountain homes at Wolfridge Resort in Winthrop, Washington, bookable as three ' +
        'configurations: the 3-bedroom house, the 1-bedroom apartment, or both together as a ' +
        '4-bedroom retreat. The Methow Community Trail crosses the property about 40 feet ' +
        'from the back door, so this is literally ski-in/ski-out. ' +
        'The three configurations are mutually exclusive: booking any one of them blocks the others.',
      url: SITE,
      telephone: siteConfig?.contactPhone,
      email: siteConfig?.contactEmail,
      address: ADDRESS,
      geo: GEO,
      priceRange: '$$-$$$',
      currenciesAccepted: 'USD',
      containedInPlace: {
        '@type': 'Place',
        name: 'Methow Valley',
        address: { '@type': 'PostalAddress', addressRegion: 'WA', addressCountry: 'US' },
      },
      ...(siteConfig?.host?.averageRating && siteConfig?.host?.totalReviews
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: siteConfig.host.averageRating,
              reviewCount: siteConfig.host.totalReviews,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
      containsPlace: listings.map((l) => ({
        '@id': `${SITE}/listings/${l.id}#accommodation`,
      })),
      potentialAction: {
        '@type': 'ReserveAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE}/availability`,
          actionPlatform: [
            'http://schema.org/DesktopWebPlatform',
            'http://schema.org/MobileWebPlatform',
          ],
        },
        result: { '@type': 'LodgingReservation', name: 'Direct booking inquiry' },
      },
    },
    ...listings.map((l) => accommodationFor(l, calendar, exclusionNoteFor(l.id))),
  ];

  const payload = { '@context': 'https://schema.org', '@graph': graph };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
