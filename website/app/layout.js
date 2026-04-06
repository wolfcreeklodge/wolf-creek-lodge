import './globals.css';
import Link from 'next/link';
import { MobileNav } from './MobileNav';

export const metadata = {
  title: 'Wolfridge Retreats — Mountain Homes in Winthrop, WA',
  description:
    'Mountain homes on the Methow Trail — Ski, Bike, Relax. Book the House, the Apartment, or the full Retreat in Winthrop, Washington.',
};

function NavLinks() {
  return (
    <>
      <Link href="/">Home</Link>
      <Link href="/#properties">Properties</Link>
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
          <span>&copy; {new Date().getFullYear()} Wolfridge Retreats. All rights reserved.</span>
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
      </body>
    </html>
  );
}
