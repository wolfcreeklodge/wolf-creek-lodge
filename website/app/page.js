import Link from 'next/link';
import { getSiteConfig, getListings } from '../lib/data.js';

export const dynamic = 'force-dynamic';

function formatPrice(pricing) {
  if (pricing.nightlyRate.min === pricing.nightlyRate.max) {
    return `$${pricing.nightlyRate.min}`;
  }
  return `$${pricing.nightlyRate.min}–$${pricing.nightlyRate.max}`;
}

function StarRating({ rating, count }) {
  return (
    <span className="card-rating">
      <span className="star">&#9733;</span>
      {rating}
      {count != null && <span className="count">({count} reviews)</span>}
    </span>
  );
}

function PropertyCard({ listing }) {
  const { capacity, pricing, reviews } = listing;
  return (
    <div className="card">
      <div className="card-header">
        {reviews.guestFavorite && (
          <span className="badge badge--guest-fav mb-1" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>
            Guest Favorite
          </span>
        )}
        <h3 className="card-title">{listing.title}</h3>
        <p className="card-subtitle">{listing.subtitle}</p>
      </div>
      <div className="card-stats">
        <span className="card-stat">{capacity.maxGuests} guests</span>
        <span className="card-stat">{capacity.bedrooms} BR</span>
        <span className="card-stat">{capacity.bathrooms} BA</span>
      </div>
      <p className="card-body">{listing.description.slice(0, 160)}...</p>
      <div className="card-footer">
        <div>
          <div className="card-price">
            {formatPrice(pricing)} <span>/ night</span>
          </div>
          <StarRating rating={reviews.rating} count={reviews.count} />
        </div>
        <div className="card-actions">
          <Link href={`/listings/${listing.id}`} className="btn btn--secondary btn--small">
            Details
          </Link>
          <a
            href={listing.airbnbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--airbnb btn--small"
          >
            Book on Airbnb
          </a>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const [siteConfig, listings] = await Promise.all([getSiteConfig(), getListings()]);
  const retreat = listings.find((l) => l.id === 'wolf-creek-retreat-combo');
  const house = listings.find((l) => l.id === 'wolf-creek-lodge');
  const apartment = listings.find((l) => l.id === 'wolf-creek-apartment');
  const communityAmenityIcons = ['&#127946;', '&#9832;', '&#9924;', '&#127758;', '&#127907;', '&#128692;'];

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1>
            Wolfridge<br />
            <em>Retreats</em>
          </h1>
          <p className="hero-tagline">{siteConfig.tagline}</p>
          <p className="hero-location">
            {siteConfig.location} &middot; Methow Valley
          </p>
          <div className="hero-rating">
            <span className="star">&#9733;</span>
            {siteConfig.host.averageRating} &middot; Superhost &middot; {siteConfig.host.totalReviews} reviews
          </div>
          <br />
          <div className="hero-cta">
            <Link href="#properties" className="btn btn--primary btn--large">
              Explore Properties
            </Link>
            <Link href="/contact" className="btn btn--secondary btn--large">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Property — The Retreat */}
      <section id="properties" className="section">
        <div className="container">
          <p className="section-label">Featured Property</p>
          <h2 className="section-title">The Retreat</h2>
          <p className="section-subtitle">
            Our premier offering — the full 4BR experience for groups, families, and retreat organizers.
          </p>

          <div className="card--featured">
            <span className="featured-badge">&#9733; Featured &mdash; Designed for Retreats</span>
            <h3 className="card-title" style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>
              {retreat.title}
            </h3>
            <p className="card-subtitle mb-2">{retreat.subtitle}</p>
            <div className="card-stats">
              <span className="card-stat">{retreat.capacity.maxGuests} guests</span>
              <span className="card-stat">{retreat.capacity.bedrooms} BR</span>
              <span className="card-stat">{retreat.capacity.bathrooms} BA</span>
              <span className="card-stat">{retreat.capacity.beds} beds</span>
            </div>
            <p className="card-body">{retreat.description}</p>
            <div className="featured-callout">
              This listing combines the 3BR Mountain Home and the 1BR Apartment into a single booking — perfect for yoga retreats, family reunions, and group getaways.
            </div>
            <div className="card-footer">
              <div>
                <div className="card-price">
                  {formatPrice(retreat.pricing)} <span>/ night</span>
                  {retreat.pricing.weekendRate && (
                    <span> &middot; ${retreat.pricing.weekendRate} weekends</span>
                  )}
                </div>
                <StarRating rating={retreat.reviews.rating} count={retreat.reviews.count} />
              </div>
              <div className="card-actions">
                <Link href={`/listings/${retreat.id}`} className="btn btn--primary">
                  View Details
                </Link>
                <a
                  href={retreat.airbnbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--airbnb"
                >
                  Book on Airbnb
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other Properties */}
      <section className="section section--alt">
        <div className="container">
          <p className="section-label">Also Available</p>
          <h2 className="section-title">Individual Properties</h2>
          <p className="section-subtitle">
            Book the House or the Apartment separately for smaller groups.
          </p>
          <div className="property-grid">
            <PropertyCard listing={house} />
            <PropertyCard listing={apartment} />
          </div>
        </div>
      </section>

      {/* Community Amenities */}
      <section className="section">
        <div className="container">
          <p className="section-label">Wolfridge Resort</p>
          <h2 className="section-title">Community Amenities</h2>
          <p className="section-subtitle">
            All guests enjoy access to shared amenities at the Wolfridge Resort Community.
          </p>
          <div className="community-grid">
            {siteConfig.communityInfo.sharedAmenities.map((amenity, i) => (
              <div key={i} className="community-item">
                <span
                  className="community-icon"
                  dangerouslySetInnerHTML={{ __html: communityAmenityIcons[i] || '&#9679;' }}
                />
                <span>{amenity}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seasonal Activities Preview */}
      <section className="section section--alt">
        <div className="container">
          <p className="section-label">What To Do</p>
          <h2 className="section-title">Every Season, An Adventure</h2>
          <p className="section-subtitle">
            The Methow Valley offers world-class outdoor recreation year-round.
          </p>
          <div className="property-grid">
            <div className="season-card season-card--winter">
              <div className="season-icon">&#10052;</div>
              <h3>Winter</h3>
              <ul>
                <li>200km+ cross-country ski trails (ski-in/ski-out)</li>
                <li>Downhill skiing nearby</li>
                <li>Snowshoeing through the valley</li>
              </ul>
            </div>
            <div className="season-card season-card--summer">
              <div className="season-icon">&#9728;</div>
              <h3>Summer</h3>
              <ul>
                <li>Mountain biking on Methow Valley Trails</li>
                <li>Hiking and wildlife viewing</li>
                <li>River access and seasonal pool</li>
              </ul>
            </div>
          </div>
          <div className="text-center mt-4">
            <Link href="/area" className="btn btn--secondary">
              Explore The Area
            </Link>
          </div>
        </div>
      </section>

      {/* Host Section */}
      <section className="section">
        <div className="container">
          <p className="section-label">Your Host</p>
          <h2 className="section-title mb-4">Meet {siteConfig.host.name}</h2>
          <div className="host-card">
            <div className="host-avatar">B</div>
            <div className="host-info">
              <h3>Hosted by {siteConfig.host.name}</h3>
              <div className="host-badges">
                <span className="badge badge--superhost">&#9733; Superhost</span>
                <span className="badge badge--rating">
                  {siteConfig.host.yearsHosting} years hosting
                </span>
                <span className="badge badge--rating">
                  &#9733; {siteConfig.host.averageRating} avg rating
                </span>
                <span className="badge badge--rating">
                  {siteConfig.host.totalReviews} reviews
                </span>
              </div>
              <p>
                With {siteConfig.host.yearsHosting} years of hosting experience and a {siteConfig.host.averageRating}-star average
                rating, {siteConfig.host.name} and co-host {siteConfig.host.coHost} are dedicated to making every stay exceptional.
                Whether you are planning a family vacation, a wellness retreat, or a quiet getaway, they will help
                you make the most of your time in the Methow Valley.
              </p>
              <div className="mt-2">
                <Link href="/about" className="btn btn--secondary btn--small">
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
