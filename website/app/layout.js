import './globals.css';
import Link from 'next/link';
import { MobileNav } from './MobileNav';

export const metadata = {
  metadataBase: new URL('https://wolfcreeklodge.us'),
  title: 'Wolfcreek Lodge — Ski-In/Ski-Out Mountain Homes in Winthrop, WA',
  description:
    'Ski-in/ski-out on the Methow Community Trail in Winthrop, Washington. Book the 3BR house, the 1BR apartment, or both together as a 4BR retreat. Winter 2026/27 rates and trail info.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Wolfcreek Lodge — Ski-In/Ski-Out in the Methow Valley',
    description:
      'Two mountain homes at Wolfridge Resort, on the 200+ km Methow Trails network. Three bookable configurations, direct booking, no OTA.',
    url: 'https://wolfcreeklodge.us',
    siteName: 'Wolfcreek Lodge',
    locale: 'en_US',
    type: 'website',
  },
};

function NavLinks() {
  return (
    <>
      <Link href="/">Home</Link>
      <Link href="/#properties">Properties</Link>
      <Link href="/winter">Winter</Link>
      <Link href="/availability">Availability</Link>
      <Link href="/area">The Area</Link>
      <Link href="/about">About</Link>
      <Link href="/contact">Contact</Link>
    </>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              Wolfridge <span>Retreats</span>
            </div>
            <p className="footer-desc">
              Mountain homes on the Methow Trail in Winthrop, Washington.
              Ski, bike, and relax in the heart of the Methow Valley.
            </p>
          </div>
          <div>
            <h4 className="footer-heading">Explore</h4>
            <div className="footer-links">
              <Link href="/">Home</Link>
              <Link href="/#properties">Properties</Link>
              <Link href="/winter">Winter</Link>
              <Link href="/area">The Area</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>
          <div>
            <h4 className="footer-heading">Contact</h4>
            <div className="footer-links">
              <a href="mailto:wolfcreeklodge@outlook.com">wolfcreeklodge@outlook.com</a>
              <a href="tel:+12066810117">+1 (206) 681-0117</a>
              <a
                href="https://maps.google.com/?q=17+Lucky+Louie+Rd+Winthrop+WA+98862"
                target="_blank"
                rel="noopener noreferrer"
              >
                17 Lucky Louie Rd, Winthrop, WA
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Wolfcreek Lodge. All rights reserved.</span>
          <span>Winthrop, WA &middot; Methow Valley</span>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav className="nav">
          <div className="nav-inner">
            <Link href="/" className="nav-brand">
              Wolfridge <span>Retreats</span>
            </Link>
            <div className="nav-links nav-links--desktop">
              <NavLinks />
            </div>
            <MobileNav>
              <NavLinks />
            </MobileNav>
          </div>
        </nav>
        <main>{children}</main>
        <Footer />
        {/* Self-hosted Umami, proxied through /stats so it is not on any
            tracker blocklist. No cookies, no cross-site identifiers, so no
            consent banner is required. defer keeps it off the critical path. */}
        <script
          defer
          src="/stats/script.js"
          data-website-id="10869b7c-e7c7-4a5b-beea-001e6497f705"
          data-host-url="https://wolfcreeklodge.us/stats"
        />
      </body>
    </html>
  );
}
