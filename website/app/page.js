import Link from 'next/link';
import Image from 'next/image';
import { getSiteConfig, getListings } from '../lib/data.js';
import {
  heroPhoto, nightPhoto, entrancePhoto,
  greatRoomPhotos, diningKitchenPhotos, bedroomPhotos, libraryPhotos,
  groundsPhotos, warmingHutPhotos, PROPERTY_AERIAL, apartmentHero,
} from '../lib/photos.js';
import { resolveSeason } from '../lib/season-server.js';
import { SEASON_IDS, SEASONS } from '../lib/seasons.js';
import PhotoHero from './components/PhotoHero';
import FullBleedImage from './components/FullBleedImage';
import { GallerySection } from './components/PhotoGallery';
import StructuredData from './components/StructuredData';
import { getRateCalendar, toDisplayRate } from '../lib/pricing.js';

export const dynamic = 'force-dynamic';

function formatPrice(pricing) {
  const min = toDisplayRate(pricing.nightlyRate.min);
  const max = toDisplayRate(pricing.nightlyRate.max);
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
            Email to Book
          </a>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const { season } = resolveSeason();
  const [siteConfig, listings, calendar] = await Promise.all([
    getSiteConfig(),
    getListings(),
    getRateCalendar({ from: '2026-10-15', to: '2027-04-30' }).catch(() => []),
  ]);
  const retreat = listings.find((l) => l.id === 'wolf-creek-retreat-combo');
  const house = listings.find((l) => l.id === 'wolf-creek-lodge');
  const apartment = listings.find((l) => l.id === 'wolf-creek-apartment');
  const communityAmenityIcons = ['&#127946;', '&#9832;', '&#9924;', '&#127758;', '&#127907;', '&#128692;'];
  // Chosen season first, then the rest in calendar order. The other three stay
  // on the page: someone shopping for August still wants to know the place
  // works in February.
  const orderedSeasons = [
    season,
    ...SEASON_IDS.filter((id) => id !== season.id).map((id) => SEASONS[id]),
  ];

  return (
    <>
      <StructuredData siteConfig={siteConfig} listings={listings} calendar={calendar} />

      {/* Hero -- seasonal. The photograph and the tagline both come from
          lib/seasons.js, chosen by the visitor or by today's date. The spring
          set keeps the aerial that was promoted here on 2026-08-25: it
          establishes the setting in a way no exterior shot of the building
          does, which is the thing a first-time visitor is actually judging. */}
      <PhotoHero photo={season.hero || PROPERTY_AERIAL}>
        <p className="hero-kicker">{season.kicker}</p>
        <h1>
          Wolfcreek<br />
          <em>Lodge</em>
        </h1>
        <p className="hero-tagline">{season.tagline || siteConfig.tagline}</p>
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

      {/* Season band. Was hardcoded to winter and carried a note to swap it
          after the thaw; it now follows the chosen season and needs no
          seasonal maintenance. Copy lives in lib/seasons.js. */}
      <section className="season-band">
        <div className="container season-band-inner">
          <div>
            <p className="section-label">{season.band.label}</p>
            <h2>{season.band.title}</h2>
            <p>{season.band.body}</p>
          </div>
          <Link href={season.band.ctaHref} className="btn btn--primary btn--large">
            {season.band.ctaLabel}
          </Link>
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
                    <span> &middot; ${toDisplayRate(retreat.pricing.weekendRate)} weekends</span>
                  )}
                </div>
                <StarRating rating={retreat.reviews.rating} count={retreat.reviews.count} />
              </div>
              <div className="card-actions">
                <Link href={`/listings/${retreat.id}`} className="btn btn--primary">
                  View Details
                </Link>
                <a
                  href={`mailto:wolfcreeklodge@outlook.com?subject=${encodeURIComponent(
                    `Booking inquiry: ${retreat.title}`
                  )}`}
                  className="btn btn--primary"
                >
                  Email to Book
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mood divider. Seasonal: the hot tub in winter, the pool in summer,
          the river in spring. Falls back to the night shot. */}
      <FullBleedImage photo={season.mood || nightPhoto} className="full-bleed--night" />

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
            <PropertyCard listing={apartment} photo={apartmentHero} />
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
          {/* Three frames: one lead, two secondary. Seasonal, so a winter
              visitor is not sold a summer meadow. Falls back to the
              year-round grounds set if a season is short of photographs. */}
          <div className="grounds-grid">
            {(season.gallery?.length === 3 ? season.gallery : groundsPhotos.slice(0, 3)).map(
              (photo, i) => (
                <div
                  key={photo.src}
                  className={i === 0 ? 'grounds-lead' : 'grounds-secondary'}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    sizes={i === 0 ? '100vw' : '(max-width: 640px) 100vw, 50vw'}
                  />
                </div>
              )
            )}
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

      {/* Seasonal activities. The chosen season leads with its full list; the
          other three stay visible in short form, because somebody shopping for
          August still wants to know the place works in February. */}
      <section className="section section--alt">
        <div className="container">
          <p className="section-label">What To Do</p>
          <h2 className="section-title">Four Valleys, One Address</h2>
          <p className="section-subtitle">
            Winter is what the Methow is known for. It is not the only reason to come, and the
            three quiet seasons are the cheap ones.
          </p>
          <div className="season-grid">
            {orderedSeasons.map((s, i) => {
              const isActive = i === 0;
              return (
                <div
                  key={s.id}
                  className={`season-card season-card--${s.id} ${isActive ? 'is-active' : ''}`}
                >
                  <div
                    className="season-icon"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: s.icon }}
                  />
                  <h3>{s.label}</h3>
                  <p className="season-card__months">{s.months}</p>
                  {isActive ? (
                    <>
                      <ul>
                        {s.activities.map((activity) => (
                          <li key={activity}>{activity}</li>
                        ))}
                      </ul>
                      <p className="season-card__note">{s.note}</p>
                      <div className="mt-2">
                        <Link href={s.band.ctaHref} className="btn btn--secondary btn--small">
                          {s.band.ctaLabel}
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className="season-card__hook">{s.hook}</p>
                  )}
                </div>
              );
            })}
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
