import Link from 'next/link';
import { getListing, getSiteConfig } from '../../../lib/data.js';
import { toDisplayRate } from '../../../lib/pricing.js';
import { getListingPhotos } from '../../../lib/photos.js';
import PhotoHero from '../../components/PhotoHero';
import { HouseFloorPlan, ApartmentFloorPlan } from '../../components/FloorPlan';
import { PhotoStrip } from '../../components/PhotoGallery';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: 'Not Found' };
  return {
    title: `${listing.title} — Wolfridge Retreats`,
    description: listing.description.slice(0, 160),
  };
}

function StarRating({ rating, count }) {
  const fullStars = Math.floor(rating);
  return (
    <span className="star-display">
      <span className="stars">
        {Array.from({ length: fullStars }, (_, i) => (
          <span key={i}>&#9733;</span>
        ))}
      </span>
      <span className="rating-value">{rating}</span>
      {count != null && <span className="review-count">({count} reviews)</span>}
    </span>
  );
}

function formatPhone(raw) {
  const digits = String(raw || '').replace(/[^0-9]/g, '').slice(-10);
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function HighlightIcon({ icon }) {
  const icons = {
    'self-checkin': '\u{1F511}',
    spacious: '\u{1F3E0}',
    location: '\u{1F4CD}',
    workspace: '\u{1F4BB}',
    superhost: '\u2B50',
  };
  return <span>{icons[icon] || '\u2728'}</span>;
}

export default async function ListingPage({ params }) {
  const { id } = await params;
  const [listing, siteConfig] = await Promise.all([getListing(id), getSiteConfig()]);

  if (!listing) {
    return (
      <div className="container section text-center">
        <h1 className="section-title">Listing Not Found</h1>
        <p className="section-subtitle">
          The listing you are looking for does not exist.
        </p>
        <Link href="/" className="btn btn--primary">
          Back to Home
        </Link>
      </div>
    );
  }

  const {
    title,
    subtitle,
    description,
    capacity,
    bedrooms,
    pricing,
    reviews,
    highlights,
    amenities,
    houseRules,
    cancellationPolicy,
    guestSafety,
    airbnbUrl,
    isComboListing,
    propertyDetails,
    spatial,
  } = listing;

  const photos = getListingPhotos(id);

  const displayMin = toDisplayRate(pricing.nightlyRate.min);
  const displayMax = toDisplayRate(pricing.nightlyRate.max);
  const displayWeekend = pricing.weekendRate ? toDisplayRate(pricing.weekendRate) : null;

  const bookingEmail = siteConfig?.contactEmail || 'wolfcreeklodge@outlook.com';
  const phoneHref = (siteConfig?.contactPhone || '+12066810117').replace(/[^+0-9]/g, '');
  const phoneDisplay = formatPhone(phoneHref);

  const bookingMailto =
    `mailto:${bookingEmail}` +
    `?subject=${encodeURIComponent(`Booking inquiry: ${title}`)}` +
    `&body=${encodeURIComponent(
      `Hi Bo,

I would like to book ${title}.

` +
        `Check-in: 
Check-out: 
Number of guests: 

Thanks!`
    )}`;

  return (
    <>
      {/* Photo Hero */}
      <PhotoHero photo={photos.hero} compact>
        <p className="hero-location">{propertyDetails.propertyCategory} &middot; {propertyDetails.listingType}</p>
        <h1>{title}</h1>
        <p className="hero-tagline">{subtitle}</p>
      </PhotoHero>

      {/* Photo Gallery Strip */}
      {photos.gallery.length > 0 && (
        <section className="section" style={{ paddingBottom: '2rem' }}>
          <div className="container">
            <PhotoStrip photos={photos.gallery} />
          </div>
        </section>
      )}

      <div className="container">
        {/* Meta info */}
        <div className="listing-header">
          <div className="listing-meta">
            <StarRating rating={reviews.rating} count={reviews.count} />
            {reviews.guestFavorite && (
              <span className="badge badge--guest-fav">Guest Favorite</span>
            )}
            {reviews.locationRating && (
              <span className="badge badge--category">{reviews.locationRating}</span>
            )}
          </div>

          {/* Stats bar */}
          <div className="listing-stats-bar">
            <div className="listing-stat">
              <span className="listing-stat-value">{capacity.maxGuests}</span>
              <span className="listing-stat-label">Guests</span>
            </div>
            <div className="listing-stat">
              <span className="listing-stat-value">{capacity.bedrooms}</span>
              <span className="listing-stat-label">Bedrooms</span>
            </div>
            <div className="listing-stat">
              <span className="listing-stat-value">{capacity.beds}</span>
              <span className="listing-stat-label">Beds</span>
            </div>
            <div className="listing-stat">
              <span className="listing-stat-value">{capacity.bathrooms}</span>
              <span className="listing-stat-label">Bathrooms</span>
            </div>
          </div>
        </div>

        {/* Combo note */}
        {isComboListing && (
          <div className="combo-note">
            <h4>Combined Listing</h4>
            <p>
              This listing combines our 3BR Mountain Home and 1BR Apartment into a single booking.
              You get exclusive access to both units — ideal for retreats, family reunions, and
              group getaways where you want the whole property to yourself.
            </p>
          </div>
        )}

        {/* Description */}
        <section className="listing-section">
          <h2 className="listing-section-title">About This Place</h2>
          <p className="listing-description">{description}</p>
        </section>

        {/* The space. Photographs flatten volume, so state the numbers. */}
        {spatial?.sizeSqFt && (
          <section className="listing-section">
            <h2 className="listing-section-title">The Space</h2>
            <div className="space-figures">
              <div className="space-figure">
                <span className="space-figure__value">
                  {spatial.sizeApproximate ? '~' : ''}{spatial.sizeSqFt.toLocaleString()}
                </span>
                <span className="space-figure__label">sq ft total</span>
              </div>
              {spatial.mainRoomSqFt && (
                <div className="space-figure">
                  <span className="space-figure__value">{spatial.mainRoomSqFt}</span>
                  <span className="space-figure__label">sq ft main room</span>
                </div>
              )}
              {spatial.ceiling?.maxFt && (
                <div className="space-figure">
                  <span className="space-figure__value">{spatial.ceiling.maxFt}&prime;</span>
                  <span className="space-figure__label">ceiling at its highest</span>
                </div>
              )}
            </div>

            {spatial.ceiling?.label && (
              <p className="listing-description">
                Ceilings run {spatial.ceiling.label}
                {spatial.structure ? `. ${spatial.structure}` : '.'}
              </p>
            )}

            {Array.isArray(spatial.rooms) && spatial.rooms.length > 0 && (
              <ul className="room-areas">
                {spatial.rooms.map((r, i) => (
                  <li key={i}>
                    <span>{r.name}</span>
                    <span className="room-areas__sqft">{r.sqFt} sq ft</span>
                  </li>
                ))}
              </ul>
            )}

            {(id === 'wolf-creek-lodge' || id === 'wolf-creek-retreat-combo') && (
              <HouseFloorPlan />
            )}
            {(id === 'wolf-creek-apartment' || id === 'wolf-creek-retreat-combo') && (
              <ApartmentFloorPlan />
            )}

            {spatial.sizeSource && (
              <p className="space-source">{spatial.sizeSource}</p>
            )}
          </section>
        )}

        {/* Highlights */}
        {highlights && highlights.length > 0 && (
          <section className="listing-section">
            <h2 className="listing-section-title">Highlights</h2>
            <div className="highlights-grid">
              {highlights.map((h, i) => (
                <div key={i} className="highlight-card">
                  <div className="highlight-icon">
                    <HighlightIcon icon={h.icon} />
                  </div>
                  <div className="highlight-text">
                    <h4>{h.title}</h4>
                    <p>{h.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bedrooms */}
        <section className="listing-section">
          <h2 className="listing-section-title">Sleeping Arrangements</h2>
          <div className="bedrooms-grid">
            {bedrooms.map((room, i) => (
              <div key={i} className="bedroom-card">
                <div className="bedroom-icon">&#128716;</div>
                <h4>{room.name}</h4>
                {room.beds.map((bed, j) => (
                  <p key={j}>{bed}</p>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Amenities */}
        <section className="listing-section">
          <h2 className="listing-section-title">Amenities</h2>
          <div className="amenities-grid">
            {amenities.map((amenity, i) => (
              <div key={i} className="amenity-item">
                {amenity}
              </div>
            ))}
          </div>
        </section>

        {/* House Rules */}
        <section className="listing-section">
          <h2 className="listing-section-title">House Rules</h2>
          <div className="rules-grid">
            <div className="rule-item">
              <span className="rule-icon">&#128337;</span>
              <span className="rule-text">
                <strong>Check-in:</strong> {houseRules.checkIn.start} – {houseRules.checkIn.end}
              </span>
            </div>
            <div className="rule-item">
              <span className="rule-icon">&#128337;</span>
              <span className="rule-text">
                <strong>Checkout:</strong> {houseRules.checkOut}
              </span>
            </div>
            <div className="rule-item">
              <span className="rule-icon">{houseRules.petsAllowed ? '\u{1F43E}' : '\u{1F6AB}'}</span>
              <span className="rule-text">
                <strong>Pets:</strong> {houseRules.petsAllowed ? `Allowed${houseRules.maxPets ? ` (max ${houseRules.maxPets})` : ''}` : 'Not allowed'}
              </span>
            </div>
            <div className="rule-item">
              <span className="rule-icon">{houseRules.smokingAllowed ? '\u2705' : '\u{1F6AD}'}</span>
              <span className="rule-text">
                <strong>Smoking:</strong> {houseRules.smokingAllowed ? 'Allowed' : 'Not allowed'}
              </span>
            </div>
            <div className="rule-item">
              <span className="rule-icon">{houseRules.eventsAllowed ? '\u{1F389}' : '\u{1F6AB}'}</span>
              <span className="rule-text">
                <strong>Events:</strong> {houseRules.eventsAllowed ? 'Allowed' : 'Not allowed'}
              </span>
            </div>
            {houseRules.quietHours && (
              <div className="rule-item">
                <span className="rule-icon">&#128264;</span>
                <span className="rule-text">
                  <strong>Quiet hours:</strong> {houseRules.quietHours.start} – {houseRules.quietHours.end}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Pricing */}
        <section className="listing-section">
          <h2 className="listing-section-title">Rates</h2>

          <div className="booking-panel">
            <div className="booking-panel__rate">
              <div className="booking-rate-value">
                {displayMin === displayMax
                  ? `$${displayMin}`
                  : `$${displayMin} - $${displayMax}`}
                <span> / night</span>
              </div>
              <p className="booking-rate-note">
                Taxes included. No booking fees, no service charges.
              </p>
              {displayWeekend && (
                <p className="pricing-option-detail">Weekend: ${displayWeekend}/night</p>
              )}
              {pricing.discounts?.weekly && (
                <p className="pricing-option-detail">{pricing.discounts.weekly.percentage}% weekly discount</p>
              )}
              {pricing.discounts?.monthly && (
                <p className="pricing-option-detail">{pricing.discounts.monthly.percentage}% monthly discount</p>
              )}
            </div>

            <div className="booking-panel__contact">
              <h3>Reserve your dates</h3>
              <p className="booking-panel__lead">
                We book by email. Send your dates and party size and you will hear back from
                Bo directly &mdash; no account, no platform in the middle.
              </p>

              <a href={bookingMailto} className="btn btn--primary btn--large booking-cta">
                Email to Book
              </a>

              <p className="booking-panel__phone">
                Prefer to talk? Call or text <a href={`tel:${phoneHref}`}>{phoneDisplay}</a>.{' '}
                <span className="booking-panel__phone-note">
                  Email reaches us fastest &mdash; the phone is not always answered.
                </span>
              </p>
            </div>
          </div>

          <p className="booking-fallback">
            Already a returning Airbnb guest, or want the platform booking flow?{' '}
            <a href={airbnbUrl} target="_blank" rel="noopener noreferrer">
              this place is also listed on Airbnb
            </a>
            , at a higher total once their fees are added.
          </p>
        </section>

        {/* Cancellation */}
        <section className="listing-section">
          <h2 className="listing-section-title">Cancellation Policy</h2>
          <p className="listing-description">
            <strong>{cancellationPolicy}</strong> &mdash; we confirm the exact terms in writing when
            we hold your dates. Ask us anything about it before you commit.
          </p>
        </section>

        {/* Safety */}
        {guestSafety && (
          <section className="listing-section">
            <h2 className="listing-section-title">Safety &amp; Property Info</h2>
            <div className="safety-grid">
              {guestSafety.safetyDevices?.map((device, i) => (
                <div key={i} className="safety-item">
                  <span className="safety-icon">&#128737;</span>
                  <span>{device}</span>
                </div>
              ))}
              {guestSafety.propertyInfo?.map((info, i) => (
                <div key={`info-${i}`} className="safety-item">
                  <span className="safety-icon">&#9888;</span>
                  <span>{info}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="listing-section text-center">
          <h2 className="listing-section-title">Ready to Book?</h2>
          <p className="listing-description" style={{ margin: '0 auto 1.5rem', maxWidth: '520px' }}>
            Email is the fastest way to reach us, and the best rate you will find for this
            place &mdash; taxes included, no booking fees.
          </p>
          <div className="cta-buttons">
            <a href={bookingMailto} className="btn btn--primary btn--large">
              Email to Book
            </a>
            <Link href="/availability" className="btn btn--secondary btn--large">
              Check Availability
            </Link>
          </div>
          <p className="cta-phone">
            Or call/text <a href={`tel:${phoneHref}`}>{phoneDisplay}</a> &mdash; email preferred.
          </p>
        </section>
      </div>
    </>
  );
}
