import Link from 'next/link';
import { getListing } from '../../../lib/data.js';
import { getListingPhotos } from '../../../lib/photos.js';
import PhotoHero from '../../components/PhotoHero';
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
  const listing = await getListing(id);

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
  } = listing;

  const photos = getListingPhotos(id);

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
          <h2 className="listing-section-title">Pricing</h2>

          <div className="pricing-comparison">
            <div className="pricing-option pricing-option--direct">
              <div className="pricing-option-badge">Best Value</div>
              <h3>Book Direct</h3>
              <div className="pricing-option-rate">
                {pricing.nightlyRate.min === pricing.nightlyRate.max
                  ? `$${Math.round(pricing.nightlyRate.min * 1.1)}`
                  : `$${Math.round(pricing.nightlyRate.min * 1.1)} – $${Math.round(pricing.nightlyRate.max * 1.1)}`}
                <span> / night</span>
              </div>
              <p className="pricing-option-note">Taxes included &mdash; no platform fees</p>
              {pricing.weekendRate && (
                <p className="pricing-option-detail">Weekend: ${Math.round(pricing.weekendRate * 1.1)}/night</p>
              )}
              {pricing.discounts?.weekly && (
                <p className="pricing-option-detail">{pricing.discounts.weekly.percentage}% weekly discount</p>
              )}
              {pricing.discounts?.monthly && (
                <p className="pricing-option-detail">{pricing.discounts.monthly.percentage}% monthly discount</p>
              )}
              <a
                href={`mailto:wolfcreeklodge@outlook.com?subject=Booking Inquiry: ${encodeURIComponent(title)}&body=${encodeURIComponent(`Hi Bo,\n\nI'd like to book ${title}.\n\nPreferred dates: \nNumber of guests: \n\nThanks!`)}`}
                className="btn btn--primary btn--large"
                style={{ marginTop: '1rem', display: 'inline-block', width: '100%', textAlign: 'center' }}
              >
                Book Direct via Email
              </a>
            </div>

            <div className="pricing-option pricing-option--airbnb">
              <h3>Airbnb</h3>
              <div className="pricing-option-rate">
                {pricing.nightlyRate.min === pricing.nightlyRate.max
                  ? `$${pricing.nightlyRate.min}`
                  : `$${pricing.nightlyRate.min} – $${pricing.nightlyRate.max}`}
                <span> / night</span>
              </div>
              <p className="pricing-option-note">+ Airbnb service fee &amp; taxes</p>
              {pricing.weekendRate && (
                <p className="pricing-option-detail">Weekend: ${pricing.weekendRate}/night</p>
              )}
              {pricing.discounts?.weekly && (
                <p className="pricing-option-detail">{pricing.discounts.weekly.percentage}% weekly discount</p>
              )}
              {pricing.discounts?.monthly && (
                <p className="pricing-option-detail">{pricing.discounts.monthly.percentage}% monthly discount</p>
              )}
              <a
                href={airbnbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--airbnb btn--large"
                style={{ marginTop: '1rem', display: 'inline-block', width: '100%', textAlign: 'center' }}
              >
                Book on Airbnb
              </a>
            </div>
          </div>
        </section>

        {/* Cancellation */}
        <section className="listing-section">
          <h2 className="listing-section-title">Cancellation Policy</h2>
          <p className="listing-description">
            <strong>{cancellationPolicy}</strong> &mdash; Review the full cancellation policy on Airbnb before booking.
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
          <p className="listing-description" style={{ margin: '0 auto 1.5rem', maxWidth: '500px' }}>
            Book direct for the best rate (taxes included, no platform fees) or use Airbnb for instant confirmation.
          </p>
          <div className="cta-buttons">
            <a
              href={`mailto:wolfcreeklodge@outlook.com?subject=Booking Inquiry: ${encodeURIComponent(title)}&body=${encodeURIComponent(`Hi Bo,\n\nI'd like to book ${title}.\n\nPreferred dates: \nNumber of guests: \n\nThanks!`)}`}
              className="btn btn--primary btn--large"
            >
              Book Direct via Email
            </a>
            <a
              href={airbnbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--airbnb btn--large"
            >
              Book on Airbnb
            </a>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <Link href="/availability" className="btn btn--secondary btn--small">
              Check Availability
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
