import { getSiteConfig, getListings } from '../../lib/data.js';
import { ContactForm } from './ContactForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contact — Wolfridge Retreats',
  description: 'Get in touch with Wolfridge Retreats. Inquiries about booking, retreats, and group stays in Winthrop, WA.',
};

export default async function ContactPage() {
  const [siteConfig, listings] = await Promise.all([getSiteConfig(), getListings()]);

  return (
    <>
      <section className="page-hero">
        <p className="section-label">Get in Touch</p>
        <h1>Contact Us</h1>
        <p>
          Have a question about our properties or planning a group retreat? We would love to hear from you.
        </p>
      </section>

      <section className="section">
        <div className="container">
          <div className="contact-grid">
            {/* Form */}
            <div>
              <h2 className="listing-section-title mb-3">Send Us a Message</h2>
              <ContactForm />
            </div>

            {/* Sidebar */}
            <div className="contact-sidebar">
              <h3>Contact Information</h3>
              <div className="contact-item">
                <span className="contact-item-icon">&#9993;</span>
                <div className="contact-item-text">
                  <strong>Email</strong>
                  <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-item-icon">&#128222;</span>
                <div className="contact-item-text">
                  <strong>Phone</strong>
                  <a href={`tel:${siteConfig.contactPhone}`}>{siteConfig.contactPhone}</a>
                  <span className="contact-item-note">Email is checked far more often.</span>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-item-icon">&#128205;</span>
                <div className="contact-item-text">
                  <strong>Address</strong>
                  <a
                    href="https://maps.google.com/?q=17+Lucky+Louie+Rd+Winthrop+WA+98862"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {siteConfig.communityInfo.address}
                  </a>
                </div>
              </div>

              <div className="contact-note">
                <strong>Booking is by email.</strong> Send us your dates and party size using this
                form or at{' '}
                <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a> and Bo
                will get back to you directly. You are booking with the owner, not through a
                platform, so there are no service fees and the rate you are quoted is the rate you
                pay.
              </div>

              <div className="airbnb-links">
                <h4>Also listed on Airbnb</h4>
                <p className="airbnb-links__note">
                  If you would rather use the platform, these are the same properties &mdash; the
                  total will be higher once their fees are added.
                </p>
                {listings.map((listing) => (
                  <a
                    key={listing.id}
                    href={listing.airbnbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {listing.title} &rarr;
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
