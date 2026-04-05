export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-brand">
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M40 8L12 36l8 8 20-20 20 20 8-8L40 8z"
              fill="currentColor"
              opacity="0.15"
            />
            <path
              d="M40 20L20 40v24h16V48h8v16h16V40L40 20z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              opacity="0.5"
            />
            <path
              d="M34 48h12v16H34z"
              fill="currentColor"
              opacity="0.08"
            />
          </svg>
        </div>

        <h1>
          Wolf Creek<br />
          <em>Lodge</em>
        </h1>

        <p className="hero-location">Winthrop, WA &middot; Methow Valley</p>

        <div className="hero-divider" />

        <p className="hero-description">
          A mountain retreat at Wolf Ridge Resort — where the Old West meets
          the wild Cascades. Book the house, the apartment, or the entire
          lodge for your group.
        </p>

        <div className="properties">
          <div className="property-card">
            <h3>The House</h3>
            <p className="beds">3 Bedrooms</p>
            <p>
              The main house with full kitchen, living area, and views of the
              surrounding pines. Room to spread out.
            </p>
          </div>

          <div className="property-card">
            <h3>The Apartment</h3>
            <p className="beds">1 Bedroom</p>
            <p>
              A private suite above the garage — cozy, self-contained, and
              perfect for a couple or solo traveler.
            </p>
          </div>

          <div className="property-card">
            <h3>The Retreat</h3>
            <p className="beds">4 Bedrooms &middot; Full Lodge</p>
            <p>
              Book both units together for family reunions, group getaways,
              or a full Wolf Creek experience.
            </p>
          </div>
        </div>

        <div className="status-banner">
          <span className="dot" />
          Booking opens May 2026
        </div>
      </section>

      <footer className="footer">
        Wolf Creek Lodge &middot; Wolf Ridge Resort, Winthrop, WA
        &nbsp;&middot;&nbsp;
        <a
          href="https://github.com/wolfcreeklodge"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Source
        </a>
      </footer>
    </>
  );
}
