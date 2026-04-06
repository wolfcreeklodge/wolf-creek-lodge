import Link from 'next/link';
import { getSiteConfig } from '../../lib/data.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'The Area — Wolfridge Retreats',
  description: 'Explore the Methow Valley and Winthrop, WA. World-class skiing, mountain biking, hiking, and more — right from your doorstep.',
};

export default async function AreaPage() {
  const siteConfig = await getSiteConfig();

  return (
    <>
      <section className="page-hero">
        <p className="section-label">Methow Valley &middot; Winthrop, WA</p>
        <h1>The Area</h1>
        <p>
          Discover the Methow Valley — one of the Pacific Northwest&#39;s most stunning destinations
          for outdoor adventure, wellness, and year-round recreation.
        </p>
      </section>

      {/* Intro */}
      <section className="section">
        <div className="container">
          <div className="about-content">
            <p>
              Winthrop, Washington sits at the heart of the Methow Valley, a pristine mountain valley
              in the North Cascades. Known for its Old West character, friendly community, and
              world-class outdoor recreation, the Methow Valley is a destination for every season.
            </p>
            <p>
              The Wolfridge Resort Community sits right on the Methow Community Ski Trail, giving you
              ski-in/ski-out access to over 200 kilometers of groomed trails in winter. In summer,
              these trails become part of the Methow Valley Trails bike network — one of the largest
              mountain biking trail systems in North America.
            </p>
          </div>
        </div>
      </section>

      {/* Seasonal Activities */}
      <section className="section section--alt">
        <div className="container">
          <p className="section-label">Activities</p>
          <h2 className="section-title">Something Every Season</h2>
          <p className="section-subtitle">
            From deep powder to warm river days, the Methow Valley delivers year-round.
          </p>

          <div className="seasons-grid">
            {/* Winter */}
            <div className="season-card season-card--winter">
              <div className="season-icon">&#10052;</div>
              <h3>Winter</h3>
              <ul>
                <li>
                  <strong>Cross-country skiing</strong> — 200km+ of groomed trails on the Methow Community
                  Ski Trail network. Ski-in/ski-out from Wolfridge.
                </li>
                <li>
                  <strong>Downhill skiing</strong> — Loup Loup Ski Bowl is a 30-minute drive,
                  offering family-friendly runs and uncrowded slopes.
                </li>
                <li>
                  <strong>Snowshoeing</strong> — Explore the valley on snowshoe trails through
                  forests and meadows.
                </li>
                <li>
                  <strong>Fat biking</strong> — Groomed fat bike trails for winter cycling.
                </li>
              </ul>
            </div>

            {/* Summer */}
            <div className="season-card season-card--summer">
              <div className="season-icon">&#9728;</div>
              <h3>Summer</h3>
              <ul>
                <li>
                  <strong>Mountain biking</strong> — The Methow Valley Trails network offers
                  hundreds of miles of singletrack, from beginner to expert.
                </li>
                <li>
                  <strong>Hiking</strong> — Explore the North Cascades with trails for all skill
                  levels, including alpine lakes and ridge walks.
                </li>
                <li>
                  <strong>River access</strong> — The Methow River is a short walk from Wolfridge,
                  perfect for swimming, floating, and fishing.
                </li>
                <li>
                  <strong>Swimming</strong> — Enjoy the seasonal heated pool at Wolfridge
                  (Memorial Day through Labor Day).
                </li>
              </ul>
            </div>

            {/* Year-round */}
            <div className="season-card season-card--yearround">
              <div className="season-icon">&#9968;</div>
              <h3>Year-Round</h3>
              <ul>
                <li>
                  <strong>Hot tub</strong> — The Wolfridge year-round hot tub is the perfect way
                  to unwind after a day of adventure.
                </li>
                <li>
                  <strong>Wellness &amp; yoga retreats</strong> — Our properties are ideal for
                  small group wellness retreats in a quiet, inspiring setting.
                </li>
                <li>
                  <strong>Wildlife viewing</strong> — Deer, eagles, owls, and more are common
                  visitors to the Wolfridge community.
                </li>
                <li>
                  <strong>Stargazing</strong> — Minimal light pollution makes for spectacular
                  night skies.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Community Info */}
      <section className="section">
        <div className="container">
          <p className="section-label">Your Base</p>
          <h2 className="section-title">Wolfridge Resort Community</h2>
          <p className="section-subtitle">
            Our properties are located within the Wolfridge Resort Community — a quiet, well-maintained
            neighborhood with shared amenities.
          </p>

          <div className="area-info-card">
            <h3>{siteConfig.communityInfo.name}</h3>
            <p className="address">{siteConfig.communityInfo.address}</p>
            <h4 className="footer-heading mt-4">Shared Amenities</h4>
            <ul className="area-amenities-list">
              {siteConfig.communityInfo.sharedAmenities.map((amenity, i) => (
                <li key={i}>{amenity}</li>
              ))}
            </ul>
          </div>

          <div className="mt-6 text-center">
            <Link href="/contact" className="btn btn--primary">
              Plan Your Visit
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
