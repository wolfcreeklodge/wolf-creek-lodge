import Link from 'next/link';
import Image from 'next/image';
import { getSiteConfig, getListings } from '../lib/data.js';
import {
  heroPhoto, nightPhoto, entrancePhoto,
  greatRoomPhotos, diningKitchenPhotos, bedroomPhotos, libraryPhotos,
  groundsPhotos, warmingHutPhotos,
} from '../lib/photos.js';
import PhotoHero from './components/PhotoHero';
import FullBleedImage from './components/FullBleedImage';
import { GallerySection } from './components/PhotoGallery';

export const dynamic = 'force-dynamic';

function formatPrice(pricing) {
  const min = Math.round(pricing.nightlyRate.min * 1.1);
  const max = Math.round(pricing.nightlyRate.max * 1.1);
  if (min === max) return `$${min}`;
  return `$${min}–$${max}`;
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

function PropertyCard({ listing, photo }) {
  const { capacity, pricing, reviews } = listing;
  return (
    <div className="card">
      {photo && (
        <div className="card-photo">
          <Image
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      )}
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
            href={`mailto:wolfcreeklodge@outlook.com?subject=Booking Inquiry: ${encodeURIComponent(listing.title)}`}
            className="btn btn--primary btn--small"
          >
            Book Direct
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
      {/* Hero — full-width exterior photo */}
      <PhotoHero photo={heroPhoto}>
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
          <Link href="/contact" className="btn btn--secondary btn--large" style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}>
            Get in Touch
          </Link>
        </div>
      </PhotoHero>

      {/* Featured Property — The Retreat */}
      <section id="properties" className="section">
        <div className="container">
          <p className="section-label">Featured Property</p>
          <h2 className="section-title">The Retreat</h2>
          <p className="section-subtitle">
            Our premier offering — the full 4BR experience for groups, families, and retreat organizers.
          </p>

          <div className="card--featured">
            <div className="card-photo">
              <Image
                src={greatRoomPhotos[0].src}
                alt={greatRoomPhotos[0].alt}
                width={greatRoomPhotos[0].width}
                height={greatRoomPhotos[0].height}
                sizes="(max-width: 768px) 100vw, 1200px"
              />
            </div>
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

      {/* Night mood divider */}
      <FullBleedImage photo={nightPhoto} className="full-bleed--night" />

      {/* Other Properties */}
      <section className="section section--alt">
        <div className="container">
          <p className="section-label">Also Available</p>
          <h2 className="section-title">Individual Properties</h2>
          <p className="section-subtitle">
            Book the House or the Apartment separately for smaller groups.
          </p>
          <div className="property-grid">
            <PropertyCard listing={house} photo={diningKitchenPhotos[0]} />
            <PropertyCard listing={apartment} photo={libraryPhotos[1]} />
          </div>
        </div>
      </section>

      {/* Room-by-Room Gallery */}
      <section className="section">
        <div className="container">
          <p className="section-label">Inside the Retreat</p>
          <h2 className="section-title">Spaces Designed for Rest</h2>
          <p className="section-subtitle">
            Pine ceilings, concrete floors, live-edge wood, and panoramic mountain views in every room.
          </p>
          <GallerySection title="Great Room" photos={greatRoomPhotos} />
          <GallerySection title="Dining & Kitchen" photos={diningKitchenPhotos} />
          <GallerySection title="Bedrooms" photos={bedroomPhotos} />
          <GallerySection title="Library & Writing Room" photos={libraryPhotos} />
        </div>
      </section>

      {/* Grounds & Landscape */}
      <section className="section section--alt">
        <div className="container">
          <p className="section-label">The Setting</p>
          <h2 className="section-title">Wide Valley, Deep Forest</h2>
          <p className="section-subtitle">
            Set in the heart of the Methow Valley with mountain views in every direction.
          </p>
          <div className="grounds-grid">
            <div className="grounds-lead">
              <Image
                src={groundsPhotos[0].src}
                alt={groundsPhotos[0].alt}
                width={groundsPhotos[0].width}
                height={groundsPhotos[0].height}
                sizes="100vw"
              />
            </div>
            <div className="grounds-secondary">
              <Image
                src={groundsPhotos[1].src}
                alt={groundsPhotos[1].alt}
                width={groundsPhotos[1].width}
                height={groundsPhotos[1].height}
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
            <div className="grounds-secondary">
              <Image
                src={groundsPhotos[2].src}
                alt={groundsPhotos[2].alt}
                width={groundsPhotos[2].width}
                height={groundsPhotos[2].height}
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
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

          {/* Warming Hut — shared facility */}
          <div style={{ marginTop: '3rem' }}>
            <h3 className="gallery-section-title">Shared Amenities — Warming Hut</h3>
            <p className="section-subtitle" style={{ marginBottom: '1.5rem' }}>
              A communal gathering spot on the Wolfridge Resort grounds — available to all guests.
            </p>
            <div className="warming-hut-grid photo--muted">
              {warmingHutPhotos.map((photo, i) => (
                <Image
                  key={i}
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              ))}
            </div>
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

      {/* Welcome / Your Stay — entrance photo near CTA */}
      <section className="section">
        <div className="container text-center">
          <p className="section-label">Your Stay</p>
          <h2 className="section-title">A Warm Welcome Awaits</h2>
          <div className="welcome-image">
            <Image
              src={entrancePhoto.src}
              alt={entrancePhoto.alt}
              width={entrancePhoto.width}
              height={entrancePhoto.height}
              sizes="(max-width: 768px) 100vw, 600px"
            />
          </div>
          <p className="section-subtitle" style={{ margin: '0 auto 2rem', textAlign: 'center' }}>
            Self check-in, a stocked kitchen, and everything you need to settle in and unwind.
          </p>
          <Link href="/contact" className="btn btn--primary btn--large">
            Plan Your Visit
          </Link>
        </div>
      </section>

      {/* Host Section */}
      <section className="section section--alt">
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
