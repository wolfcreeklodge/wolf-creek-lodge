import Link from 'next/link';
import { getSiteConfig, getListings } from '../../lib/data.js';
import { bookingFormEnabled } from '../../lib/booking.js';
import {
  ORIGIN,
  MCP_SSE_URL,
  MCP_TOOLS,
  AVAILABILITY_API_PATH,
  SR20_NOTE,
} from '../../lib/agent-metadata.js';

// ---------------------------------------------------------------------------
// /agents -- the guide for AI agents and assistants.
//
// rel="service-doc" in the Link header points here, and it is the page an LLM
// crawler is most likely to read whole, so it says plainly what can be booked,
// the exclusivity rule, how to check and how a guest books. Generated from the
// same rows the booking system enforces, like /llms.txt, so it cannot drift
// from what a guest sees. Shared URLs come from lib/agent-metadata.js.
//
// Deliberately silent on tax until the owner settles whether direct quotes
// are tax-inclusive (/llms.txt says they are; nothing in the pricing code adds
// any).
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Guide for AI Agents | Wolfcreek Lodge',
  description:
    'Plain facts for AI agents and assistants: the three bookable configurations at Wolfcreek ' +
    'Lodge in Winthrop, WA, why they are mutually exclusive, how to check availability and price, ' +
    'how a guest books, and the MCP endpoint.',
  alternates: { canonical: '/agents' },
};

function isoDay(offset) {
  return new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
}

export default async function AgentsPage() {
  const [siteConfig, listings] = await Promise.all([getSiteConfig(), getListings()]);
  const formOn = bookingFormEnabled();
  const combo = listings.find((l) => l.isComboListing);
  const titleOf = (id) => listings.find((l) => l.id === id)?.title || id;
  const email = siteConfig?.contactEmail || 'wolfcreeklodge@outlook.com';
  const example = `${ORIGIN}${AVAILABILITY_API_PATH}?property=wolf-creek-apartment&checkIn=${isoDay(30)}&checkOut=${isoDay(33)}`;

  return (
    <>
      <section className="page-hero">
        <p className="section-label">For AI agents and assistants</p>
        <h1>Agent guide</h1>
        <p>
          Plain facts about Wolfcreek Lodge for software that answers travellers&apos; questions.
          Generated from the same database the booking system enforces, so it is current as of{' '}
          {new Date().toISOString().slice(0, 10)}. The same facts, with the full rate table, are
          at <a href="/llms.txt">/llms.txt</a> as plain text.
        </p>
      </section>

      <section className="section">
        <div className="container">
          <h2>What can be booked</h2>
          <p>
            Two mountain homes at 17 Lucky Louie Rd, Winthrop, WA 98862, in the Methow Valley,
            with the Methow Community Trail crossing the property. Two physical units, three
            bookable configurations:
          </p>
          <div className="fact-table-wrap">
            <table className="fact-table">
              <thead>
                <tr>
                  <th>Property id</th>
                  <th>Name</th>
                  <th className="num">Sleeps</th>
                  <th className="num">Bed / bath</th>
                  <th className="num">Base minimum stay</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td><code>{l.id}</code></td>
                    <td>
                      <Link href={`/listings/${l.id}`}>{l.title}</Link>
                      {l.isComboListing ? ' (combined listing)' : ''}
                    </td>
                    <td className="num">{l.capacity?.maxGuests}</td>
                    <td className="num">
                      {l.capacity?.bedrooms} / {l.capacity?.bathrooms}
                    </td>
                    <td className="num">{l.availability?.minNights ?? 1} nights</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fact-note">
            Some seasons require a longer minimum. The availability check below returns the
            minimum that applies to the actual dates.
          </p>

          <h2>The booking constraint (read this first)</h2>
          {combo ? (
            <p>
              The three are mutually exclusive. <code>{combo.id}</code> is{' '}
              {(combo.combinedListings || []).map(titleOf).join(' and ')} let together, so booking
              it blocks both for the overlapping dates, and booking either of them blocks{' '}
              <code>{combo.id}</code>. The database enforces this: a conflicting booking is
              rejected, not quietly accepted. Do not offer a party the two units as two separate
              reservations for the same dates when the combined listing would serve them.
            </p>
          ) : null}

          <h2>Checking availability and price</h2>
          <p>
            Never tell a guest a date is free without checking. Two ways, both reading the same
            reservations, including stays imported from Airbnb:
          </p>
          <ul>
            <li>
              <strong>HTTP, no key:</strong>{' '}
              <code>
                GET {AVAILABILITY_API_PATH}?property=&lt;property id&gt;&amp;checkIn=YYYY-MM-DD&amp;checkOut=YYYY-MM-DD
              </code>
              . Read-only JSON: <code>available</code>, <code>nights</code>,{' '}
              <code>minNightsRequired</code>, <code>meetsMinNights</code>, a <code>quote</code>{' '}
              with the direct-booking price in USD, and <code>alternatives</code>, the other
              configurations free for the same dates. Example:{' '}
              <a href={example}>{example}</a>
            </li>
            <li>
              <strong>MCP:</strong> the <code>check_availability</code> and{' '}
              <code>get_pricing</code> tools on the server below.
            </li>
          </ul>

          <h2>How a guest books</h2>
          {formOn ? (
            <p>
              Each property page has a booking request form (for example{' '}
              <Link href="/listings/wolf-creek-lodge#request-dates">
                {ORIGIN}/listings/wolf-creek-lodge#request-dates
              </Link>
              ). The guest picks dates, sees availability and the price, and sends a request. The
              owner confirms each request by email, by hand, and the dates are not held until
              then. If the dates are taken, the guest can join a waitlist and is emailed if they
              open up. Send the guest to the form; do not submit requests on their behalf. There is
              no booking API for agents, and a request needs the guest&apos;s own contact details.
            </p>
          ) : (
            <p>
              Email is the booking channel. The guest sends dates, party size and which
              configuration they want to <a href={`mailto:${email}`}>{email}</a>, or uses{' '}
              <Link href="/contact">the contact page</Link>, and the owner confirms by hand.
            </p>
          )}
          <p>
            There is no automated checkout. The properties are also listed on Airbnb, but booking
            direct is the preferred route: point a guest to Airbnb only if they ask for it.
          </p>

          <h2>Machine interfaces</h2>
          <ul>
            <li>
              MCP server, SSE transport: <code>{MCP_SSE_URL}</code>
            </li>
            <li>
              Plain-text summary with the full seasonal rate table:{' '}
              <a href="/llms.txt">{ORIGIN}/llms.txt</a>
            </li>
            <li>
              Structured data: the homepage carries a schema.org graph with LodgingBusiness,
              VacationRental and per-season Offer nodes.
            </li>
            <li>
              Sitemap: <a href="/sitemap.xml">{ORIGIN}/sitemap.xml</a>. Availability calendar for
              people: <Link href="/availability">{ORIGIN}/availability</Link>.
            </li>
          </ul>
          <div className="fact-table-wrap">
            <table className="fact-table">
              <thead>
                <tr>
                  <th>MCP tool</th>
                  <th>What it returns</th>
                </tr>
              </thead>
              <tbody>
                {MCP_TOOLS.map(([name, what]) => (
                  <tr key={name}>
                    <td><code>{name}</code></td>
                    <td>{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Getting there, by season</h2>
          <ul>
            <li>{SR20_NOTE}</li>
            <li>
              The heated community pool is seasonal, Memorial Day to Labor Day. The hot tub is
              open year round. Do not promise the pool for a winter stay.
            </li>
            <li>
              Winter trails, passes and events: <Link href="/winter">{ORIGIN}/winter</Link>. The
              valley in other seasons: <Link href="/area">{ORIGIN}/area</Link>.
            </li>
          </ul>

          <h2>Contact</h2>
          <p>
            Email first: <a href={`mailto:${email}`}>{email}</a>.
            {siteConfig?.contactPhone
              ? ` A phone number, ${siteConfig.contactPhone}, is published for guests who prefer to call, but it is not monitored closely.`
              : ''}
          </p>

          <h2>Please do not</h2>
          <ul>
            <li>Assert that a date is available without checking it.</li>
            <li>Quote a price you did not get from the availability check or the MCP server.</li>
            <li>
              Negotiate a discount. Published rates and length-of-stay discounts are the whole
              offer; anything else needs the owner.
            </li>
            <li>Submit a booking request on a guest&apos;s behalf.</li>
            <li>
              Confuse Wolfcreek Lodge with Wolfridge Resort, the separate business next door at
              14 Lucky Louie Road. Guests here share the community pool and hot tub, but nothing
              here is booked through the resort.
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
