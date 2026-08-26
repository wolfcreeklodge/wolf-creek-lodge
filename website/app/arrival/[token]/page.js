import { notFound } from 'next/navigation';
import { getSiteConfig } from '../../../lib/data.js';
import { getReservationByArrivalToken } from '../../../lib/arrival.js';
import { ARRIVAL_MAP, PROPERTY_AERIAL } from '../../../lib/photos.js';

export const dynamic = 'force-dynamic';

// This page contains the exact route to the house. It must never be indexed,
// and it must not leak into a referrer when a guest taps a maps link.
export const metadata = {
  title: 'Your Arrival Details',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

function formatStayDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function ArrivalPage({ params }) {
  const { token } = await params;
  const [reservation, siteConfig] = await Promise.all([
    getReservationByArrivalToken(token),
    getSiteConfig(),
  ]);

  // Wrong, rotated, or cancelled token: a plain 404. Do not hint that the
  // token was almost right.
  if (!reservation) notFound();

  const { firstName, propertyTitle, checkIn, checkOut, numGuests } = reservation;
  const email = siteConfig?.contactEmail || 'wolfcreeklodge@outlook.com';
  const phone = siteConfig?.contactPhone || '+12066810117';
  const address = siteConfig?.communityInfo?.address || '17 Lucky Louie Rd, Winthrop, WA 98862';

  return (
    <div className="container section arrival">
      <header className="arrival-header">
        <p className="section-label">Confirmed Reservation</p>
        <h1>{firstName ? `${firstName}, here is how to find us` : 'How to find us'}</h1>
        <p className="arrival-stay">
          <strong>{propertyTitle}</strong>
          <span>
            {formatStayDate(checkIn)} &rarr; {formatStayDate(checkOut)}
          </span>
          {numGuests ? <span>{numGuests} guests</span> : null}
        </p>
      </header>

      <section className="arrival-section">
        <h2>The address</h2>
        <p className="arrival-address">{address}</p>
        <p className="arrival-note">
          Mapping apps will get you to Wolf Creek Road, but the last stretch is unsigned and
          several driveways look like the road. Use the map below for the final turns.
        </p>
        <a
          className="btn btn--secondary"
          href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps
        </a>
      </section>

      <section className="arrival-section">
        <h2>The last mile</h2>
        <ol className="arrival-steps">
          <li>Follow <strong>Wolf Creek Road</strong> until <strong>Lucky Louie Road</strong> branches off to the north.</li>
          <li>Turn onto <strong>Lucky Louie Road</strong> and stay on it as it bends north.</li>
          <li>
            Do not turn off. Every marked <span className="arrival-x">X</span> on the map is a
            driveway or side road that looks like the way through and is not &mdash; including{' '}
            <strong>Wolf Ridge Lane</strong>.
          </li>
          <li>The house is at the end of Lucky Louie Road, circled in red on the map.</li>
        </ol>

        {/* Plain img: this is an annotated screenshot, and its intrinsic size is
            not recorded in lib/photos.js the way the room photos are. */}
        <figure className="arrival-figure">
          <img
            src={ARRIVAL_MAP.src}
            alt={ARRIVAL_MAP.alt}
            className="arrival-map"
            loading="eager"
          />
          <figcaption>
            Red is your route. Black <span className="arrival-x">X</span> marks are turns to skip.
          </figcaption>
        </figure>
      </section>

      <section className="arrival-section">
        <h2>Once you are here</h2>
        <div className="arrival-facts">
          <div className="arrival-fact">
            <h3>Parking</h3>
            <p>Park on the gravel apron by the house. There is room for several vehicles.</p>
          </div>
          <div className="arrival-fact">
            <h3>Garbage</h3>
            <p>
              The community bins are east of the house, off Wolf Ridge Lane &mdash; marked
              <strong> garbage</strong> on the map.
            </p>
          </div>
          <div className="arrival-fact">
            <h3>Hot tub and pool</h3>
            <p>
              Also east, past the garbage bins &mdash; marked <strong>hot tub</strong> on the map.
              The hot tub is year round; the pool runs Memorial Day to Labor Day.
            </p>
          </div>
        </div>

        <figure className="arrival-figure">
          <img
            src={PROPERTY_AERIAL.src}
            alt={PROPERTY_AERIAL.alt}
            className="arrival-aerial"
            loading="lazy"
          />
          <figcaption>
            Looking south over the property. The house is the red-roofed building in the
            meadow right of centre; the pool and hot tub are beyond it, and the Methow River
            runs along the far side of the trees.
          </figcaption>
        </figure>
      </section>

      <section className="arrival-section arrival-section--help">
        <h2>If anything goes wrong</h2>
        <p>
          Lost, running late, or the directions are not matching what you see? Call or text{' '}
          <a href={`tel:${phone}`}>{phone}</a> &mdash; for arrival-day problems the phone is the
          fastest way to reach us. Otherwise email{' '}
          <a href={`mailto:${email}`}>{email}</a>.
        </p>
        <p className="arrival-note">
          Cell coverage in the valley is patchy. Screenshot this page before you leave Winthrop.
        </p>
      </section>
    </div>
  );
}
