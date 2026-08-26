import Link from 'next/link';
import winter from '../../data/winter-2026-27.json';
import { getListings } from '../../lib/data.js';
import { getRateCalendar } from '../../lib/pricing.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Winter 2026/27 in the Methow Valley - Wolfridge Retreats',
  description:
    'Ski-in/ski-out on the Methow Community Trail. Trail pass prices, Loup Loup, the winter drive from Seattle, the 2026/27 event calendar, and what each week of the season costs.',
};

const SKU_ORDER = [
  ['wolf-creek-lodge', 'House (3BR)'],
  ['wolf-creek-apartment', 'Apartment (1BR)'],
  ['wolf-creek-retreat-combo', 'Retreat (4BR)'],
];

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}`;
}

function fmtRange(a, b) {
  const yearA = a.slice(0, 4);
  const yearB = b.slice(0, 4);
  return yearA === yearB
    ? `${fmtDate(a)} to ${fmtDate(b)}, ${yearA}`
    : `${fmtDate(a)}, ${yearA} to ${fmtDate(b)}, ${yearB}`;
}

function Confidence({ level }) {
  if (level === 'confirmed') {
    return <span className="pill pill--confirmed">Confirmed</span>;
  }
  return <span className="pill pill--provisional">Date to be announced</span>;
}

export default async function WinterPage() {
  const [listings, calendar] = await Promise.all([
    getListings(),
    getRateCalendar({ from: '2026-10-15', to: '2027-04-30' }).catch(() => []),
  ]);
  const listed = new Set(listings.map((l) => l.id));
  const skus = SKU_ORDER.filter(([id]) => listed.has(id));

  return (
    <>
      <section className="page-hero">
        <p className="section-label">Winter {winter.season} &middot; Methow Valley</p>
        <h1>Winter on the Trail</h1>
        <p>
          The Methow Community Trail crosses the property about forty feet from the back door.
          Wolf Ridge is a named trailhead on it,
          which means the skiing starts where the shoveling ends (no drive, no parking lot,
          no loading skis onto a car in the dark).
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* The trail                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="section">
        <div className="container">
          <p className="section-label">The network</p>
          <h2 className="section-title">{winter.trails.groomedKm} kilometres, groomed overnight</h2>
          <p className="section-subtitle">
            Methow Trails is {winter.trails.claim}. The {winter.trails.communityTrail.name} is
            the {winter.trails.communityTrail.lengthKm} km spine of it.
          </p>

          <div className="about-content">
            <p>{winter.trails.communityTrail.detail}</p>
            <p>{winter.trails.groomingCadence}</p>
            <p className="contact-note">
              {winter.trails.seasonOpening.text}{' '}
              <a href={winter.trails.seasonOpening.source} target="_blank" rel="noopener noreferrer">
                Current conditions
              </a>{' '}
              are posted every morning.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Passes                                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="section section--alt">
        <div className="container">
          <p className="section-label">What it costs to ski</p>
          <h2 className="section-title">Trail passes, {winter.season}</h2>
          <p className="section-subtitle">
            Passes are bought from Methow Trails, not from us. Kids ski free, which changes the
            arithmetic of a family week considerably.
          </p>

          <div className="fact-table-wrap">
            <table className="fact-table">
              <thead>
                <tr><th>Pass</th><th className="num">Price</th></tr>
              </thead>
              <tbody>
                {winter.trails.passes.map((p) => (
                  <tr key={p.name}>
                    <td>
                      {p.name}
                      {p.note && <span className="fact-note"> ({p.note})</span>}
                    </td>
                    <td className="num">{p.price === 0 ? 'Free' : `$${p.price}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="source-line">
            Source:{' '}
            <a href={winter.trails.passSource} target="_blank" rel="noopener noreferrer">
              methowtrails.org/passes
            </a>
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Beyond the nordic trails                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="section">
        <div className="container">
          <p className="section-label">Downhill, and everything else</p>
          <h2 className="section-title">{winter.downhill.name}</h2>
          <p className="section-subtitle">
            {winter.downhill.driveFromWinthrop} from the house. Small, uncrowded, and steeper than
            people expect.
          </p>

          <div className="listing-stats-bar">
            <div className="listing-stat">
              <span className="listing-stat-value">{winter.downhill.verticalFt.toLocaleString()} ft</span>
              <span className="listing-stat-label">Vertical</span>
            </div>
            <div className="listing-stat">
              <span className="listing-stat-value">{winter.downhill.skiableAcres}</span>
              <span className="listing-stat-label">Skiable acres</span>
            </div>
            <div className="listing-stat">
              <span className="listing-stat-value">{winter.downhill.runs}</span>
              <span className="listing-stat-label">Runs</span>
            </div>
            <div className="listing-stat">
              <span className="listing-stat-value">{winter.downhill.averageSnowfallInches}&quot;</span>
              <span className="listing-stat-label">Average snowfall</span>
            </div>
          </div>

          <div className="about-content mt-4">
            <p>{winter.downhill.alsoOnSite}</p>
            <p className="contact-note">{winter.downhill.note}</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Getting here in winter. The single most useful thing on this page.  */}
      {/* ------------------------------------------------------------------ */}
      <section className="section section--dark">
        <div className="container">
          <p className="section-label">Before you set off</p>
          <h2 className="section-title">{winter.gettingHere.headline}</h2>
          <div className="about-content">
            <p>{winter.gettingHere.detail}</p>
            <p className="source-line">
              Closure and reopening dates from{' '}
              <a href={winter.gettingHere.sources[0]} target="_blank" rel="noopener noreferrer">
                WSDOT
              </a>. The 2026/27 closure is announced only a few days ahead, on avalanche conditions.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Events                                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="section">
        <div className="container">
          <p className="section-label">Winter calendar</p>
          <h2 className="section-title">What is on, {winter.season}</h2>
          <p className="section-subtitle">
            Confirmed dates are marked as such. Everything else recurs every year but has not
            published its {winter.season} date yet.
          </p>

          <div className="event-list">
            {winter.events.map((e) => (
              <article className="event-card" key={e.name}>
                <div className="event-card-head">
                  <h3>{e.name}</h3>
                  <Confidence level={e.confidence} />
                </div>
                <p className="event-dates">{e.dates}<span className="event-where"> &middot; {e.where}</span></p>
                <p className="event-what">{e.what}</p>
                <a className="event-source" href={e.source} target="_blank" rel="noopener noreferrer">
                  Details
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Planning windows                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="section section--alt">
        <div className="container">
          <p className="section-label">Picking your week</p>
          <h2 className="section-title">The four windows that book first</h2>
          <p className="section-subtitle">
            Two quirks of the {winter.season} calendar are worth knowing before you choose dates.
          </p>

          <div className="highlights-grid">
            {winter.planningWindows.map((w) => (
              <div className="highlight-card" key={w.label}>
                <div className="highlight-text">
                  <strong>{w.label}</strong>
                  <p className="mb-1"><em>{w.dates}</em></p>
                  <p>{w.why}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Rate ladder. Renders only once the rate calendar is seeded.         */}
      {/* ------------------------------------------------------------------ */}
      {calendar.length > 0 && (
        <section className="section">
          <div className="container">
            <p className="section-label">Rates</p>
            <h2 className="section-title">What each week costs</h2>
            <p className="section-subtitle">
              Direct booking rates per night. Friday and Saturday nights price at the weekend rate.
              Seven nights or more earns the weekly discount on top.
            </p>

            <div className="fact-table-wrap">
              <table className="fact-table fact-table--rates">
                <thead>
                  <tr>
                    <th>Window</th>
                    <th>Dates</th>
                    <th className="num">Min nights</th>
                    {skus.map(([id, label]) => (
                      <th className="num" key={id}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calendar.map((s) => (
                    <tr key={s.id} className={`rate-row rate-row--${s.tier}`}>
                      <td>
                        <strong>{s.label}</strong>
                        <span className="fact-note"> {s.tierLabel}</span>
                      </td>
                      <td>{fmtRange(s.startsOn, s.endsOn)}</td>
                      <td className="num">{s.minNights}</td>
                      {skus.map(([id]) => {
                        const r = s.rates[id];
                        if (!r) return <td className="num" key={id}>&mdash;</td>;
                        return (
                          <td className="num" key={id}>
                            ${r.weekday.toLocaleString()}
                            {r.weekend !== r.weekday && (
                              <span className="fact-note"> / ${r.weekend.toLocaleString()} wknd</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      <section className="section section--alt">
        <div className="container text-center">
          <h2 className="section-title">Book the winter</h2>
          <p className="section-subtitle">
            Tell us your dates and how many of you there are. We will tell you which of the three
            configurations actually fits, which is not always the biggest one.
          </p>
          <div className="cta-buttons">
            <Link href="/availability" className="btn btn--primary btn--large">
              See availability
            </Link>
            <Link href="/contact" className="btn btn--secondary btn--large">
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
