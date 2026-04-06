import Link from 'next/link';
import { getListing } from '../../../lib/data.js';

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

  return (
    <>
      {/* Header */}
      <div className="page-hero">
        <p className="section-label">{propertyDetails.propertyCategory} &middot; {propertyDetails.listingType}</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

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
          <table className="pricing-table">
            <tbody>
              <tr>
                <td>Nightly rate</td>
                <td>
                  {pricing.nightlyRate.min === pricing.nightlyRate.max
                    ? `$${pricing.nightlyRate.min}`
                    : `$${pricing.nightlyRate.min} – $${pricing.nightlyRate.max}`}
                </td>
              </tr>
              {pricing.weekendRate && (
                <tr>
                  <td>Weekend rate</td>
                  <td>${pricing.weekendRate}</td>
                </tr>
              )}
              {pricing.discounts?.weekly && (
                <tr>
                  <td>Weekly discount</td>
                  <td className="pricing-highlight">
                    {pricing.discounts.weekly.percentage}% off &mdash; {pricing.discounts.weekly.description}
                  </td>
                </tr>
              )}
              {pricing.discounts?.monthly && (
                <tr>
                  <td>Monthly discount</td>
                  <td className="pricing-highlight">
                    {pricing.discounts.monthly.percentage}% off &mdash; {pricing.discounts.monthly.description}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
          <p className="listing-description mb-4" style={{ margin: '0 auto 2rem' }}>
            Book directly through Airbnb to secure your dates.
          </p>
          <a
            href={airbnbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--airbnb btn--large"
          >
            Book on Airbnb
          </a>
          <div className="mt-2">
            <Link href="/contact" className="btn btn--secondary btn--small">
              Have Questions? Contact Us
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
