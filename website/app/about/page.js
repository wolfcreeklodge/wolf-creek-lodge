import Link from 'next/link';
import { getSiteConfig } from '../../lib/data.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'About — Wolfridge Retreats',
  description: 'Meet your hosts Bo and Svetlana. 14 years of Superhost hospitality in the Methow Valley.',
};

export default async function AboutPage() {
  const siteConfig = await getSiteConfig();

  return (
    <>
      <section className="page-hero">
        <p className="section-label">About Us</p>
        <h1>Your Hosts</h1>
        <p>
          {siteConfig.host.yearsHosting} years of hospitality, one beautiful valley.
        </p>
      </section>

      {/* Host Profile */}
      <section className="section">
        <div className="container">
          <div className="host-card mb-6">
            <div className="host-avatar">B</div>
            <div className="host-info">
              <h3>Hosted by {siteConfig.host.name} &amp; {siteConfig.host.coHost}</h3>
              <div className="host-badges">
                <span className="badge badge--superhost">&#9733; Superhost</span>
                <span className="badge badge--rating">{siteConfig.host.yearsHosting} years hosting</span>
                <span className="badge badge--rating">&#9733; {siteConfig.host.averageRating} avg</span>
                <span className="badge badge--rating">{siteConfig.host.totalReviews} reviews</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="about-stats">
            <div className="about-stat">
              <div className="about-stat-value">{siteConfig.host.yearsHosting}</div>
              <div className="about-stat-label">Years Hosting</div>
            </div>
            <div className="about-stat">
              <div className="about-stat-value">{siteConfig.host.averageRating}</div>
              <div className="about-stat-label">Avg Rating</div>
            </div>
            <div className="about-stat">
              <div className="about-stat-value">{siteConfig.host.totalReviews}</div>
              <div className="about-stat-label">Reviews</div>
            </div>
            <div className="about-stat">
              <div className="about-stat-value">3</div>
              <div className="about-stat-label">Properties</div>
            </div>
          </div>

          <div className="about-content">
            <p>
              {siteConfig.host.name} has been welcoming guests for over {siteConfig.host.yearsHosting} years,
              earning Superhost status through a commitment to exceptional hospitality, thoughtful
              design, and genuine care for every guest&#39;s experience. Together with co-host {siteConfig.host.coHost},
              they manage three properties in the Wolfridge Resort Community.
            </p>
            <p>
              The Mountain Home was built in 2023 with modern comfort in mind — radiant heating,
              split ductless AC, a fully equipped kitchen, and an open floor plan flooded with
              natural light. The adjoining 1BR apartment adds a private, high-ceiling retreat
              space with ridge views, a 100-inch projector, and a dedicated workspace.
            </p>
            <p>
              What makes Wolfridge special is the balance of solitude and access. You are steps from
              the Methow Community Ski Trail and a short walk to the river, pool, and hot tub —
              yet surrounded by quiet, open meadows and mountain ridges. It is the kind of place where
              you can spend a morning skiing, an afternoon working from a desk with a view, and an
              evening soaking in the hot tub under the stars.
            </p>

            <h3 className="listing-section-title mt-6">Our Hosting Philosophy</h3>
            <p>
              We believe great hosting is about more than clean sheets and a stocked kitchen (though
              you will find both). It is about creating a space that invites you to slow down, connect
              with the people you are with, and experience the extraordinary landscape of the
              Methow Valley. Every detail — from the quality of the bedding to the placement of the
              fire pit — is designed with your comfort and experience in mind.
            </p>
            <p>
              Whether you are here for a family vacation, a yoga retreat, a remote work week, or
              simply to escape, we want you to feel at home. And we are always just a message away
              if you need anything.
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/contact" className="btn btn--primary">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
