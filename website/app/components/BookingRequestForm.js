'use client';

import { useEffect, useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// Booking request form.
//
// Replaces "Email to Book" as the way to ask for dates. The point is that the
// calendar answers before the guest has typed their name: pick dates and the
// form says whether they are open, what they cost direct, and -- if they are
// taken -- whether one of the other two places is free instead. A guest can
// still send a request for taken dates; it goes on the waitlist.
//
// Nothing here is authoritative. The server re-validates every field and
// re-checks availability on submit; this is only the fast, friendly version
// of the same answer.
// ---------------------------------------------------------------------------

function todayLocal() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
}

function nextDay(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function money(n) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export default function BookingRequestForm({ properties, defaultPropertyId, contactEmail }) {
  const [propertyId, setPropertyId] = useState(defaultPropertyId || properties[0]?.id);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [numGuests, setNumGuests] = useState(2);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [trap, setTrap] = useState(''); // honeypot, see below

  const [check, setCheck] = useState({ state: 'idle' });
  const [submit, setSubmit] = useState({ state: 'idle' });

  const today = useMemo(todayLocal, []);
  const property = properties.find((p) => p.id === propertyId);

  // Keep check-out after check-in when the guest moves check-in forward.
  useEffect(() => {
    if (checkIn && checkOut && checkOut <= checkIn) setCheckOut('');
  }, [checkIn, checkOut]);

  // Live availability. Debounced, and each new range aborts the previous
  // request so a slow answer for old dates can never overwrite a fresh one.
  useEffect(() => {
    if (!propertyId || !checkIn || !checkOut) {
      setCheck({ state: 'idle' });
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCheck({ state: 'loading' });
      try {
        const qs = new URLSearchParams({ property: propertyId, checkIn, checkOut });
        const res = await fetch(`/api/booking-requests/check?${qs}`, { signal: controller.signal });
        const data = await res.json();
        setCheck(data.error ? { state: 'error', error: data.error } : { state: 'ready', data });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setCheck({ state: 'error', error: 'Could not reach the calendar just now.' });
        }
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [propertyId, checkIn, checkOut]);

  const ready = check.state === 'ready' ? check.data : null;
  const tooManyGuests = property && numGuests > property.maxGuests;
  const belowMinimum = ready && !ready.meetsMinNights;
  const waitlist = ready && !ready.available;
  const canSubmit =
    ready && !belowMinimum && !tooManyGuests && submit.state !== 'sending';

  async function onSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmit({ state: 'sending' });
    try {
      const res = await fetch('/api/booking-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId, checkIn, checkOut, numGuests,
          firstName, lastName, email, phone, message, marketingOptIn, hpTrap: trap,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSubmit({ state: 'error', error: data.error || 'That did not go through.' });
        return;
      }
      setSubmit({ state: 'done', result: data });
      // Same channel as BookingTracker's mailto clicks, so direct requests
      // and email intent can be compared in one report.
      try {
        window.umami?.track('booking-request', {
          outcome: data.status,
          property: propertyId,
          path: window.location.pathname,
        });
      } catch {
        /* never let analytics break a booking */
      }
    } catch {
      setSubmit({ state: 'error', error: 'Could not reach us just now.' });
    }
  }

  if (submit.state === 'done') {
    const { status, reference } = submit.result;
    return (
      <div className="booking-form__done" role="status">
        {status === 'waitlisted' ? (
          <>
            <h3>You are on the waitlist</h3>
            <p>
              Those dates are booked right now. If they open up, you will hear from us first, by
              email. Nothing else to do.
            </p>
          </>
        ) : (
          <>
            <h3>Request sent</h3>
            <p>
              Those dates were open when you asked. Bo will reply by email to confirm. Your dates
              are not held until he does, so if you have questions, now is a good time to ask.
            </p>
          </>
        )}
        <p className="booking-form__ref">Reference: {reference}</p>
      </div>
    );
  }

  return (
    <form className="booking-form" onSubmit={onSubmit} noValidate>
      <div className="booking-form__row">
        <label className="booking-form__field booking-form__field--wide">
          <span>Where</span>
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} (sleeps {p.maxGuests})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="booking-form__row">
        <label className="booking-form__field">
          <span>Check-in</span>
          <input
            type="date"
            required
            min={today}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </label>
        <label className="booking-form__field">
          <span>Check-out</span>
          <input
            type="date"
            required
            min={checkIn ? nextDay(checkIn) : nextDay(today)}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </label>
        <label className="booking-form__field booking-form__field--narrow">
          <span>Guests</span>
          <input
            type="number"
            required
            min={1}
            max={property?.maxGuests || 20}
            value={numGuests}
            onChange={(e) => setNumGuests(Number.parseInt(e.target.value, 10) || 1)}
          />
        </label>
      </div>

      {/* The answer, announced to screen readers as it changes. */}
      <div className="booking-form__status" aria-live="polite">
        {check.state === 'idle' && (
          <p className="booking-form__hint">Pick your dates and we will check the calendar.</p>
        )}
        {check.state === 'loading' && (
          <p className="booking-form__hint">Checking the calendar&hellip;</p>
        )}
        {check.state === 'error' && <p className="booking-form__warn">{check.error}</p>}
        {ready && ready.available && ready.meetsMinNights && (
          <p className="booking-form__ok">
            <strong>Open.</strong> {ready.nights} night{ready.nights === 1 ? '' : 's'}
            {ready.quote && (
              <>
                , {money(ready.quote.displayTotal)} booked direct
                {ready.nights > 1 && <> (about {money(ready.quote.displayNightlyAverage)} a night)</>}
                {ready.quote.lengthDiscount && <>, {ready.quote.lengthDiscount.toLowerCase()}</>}
              </>
            )}
            .
          </p>
        )}
        {belowMinimum && (
          <p className="booking-form__warn">
            The minimum stay for these dates is {ready.minNightsRequired} nights.
          </p>
        )}
        {waitlist && !belowMinimum && (
          <div className="booking-form__taken">
            <p>
              <strong>Those dates are booked.</strong> You can still send the request and we will
              put you on the waitlist, and email you if they open up.
            </p>
            {ready.alternatives.length > 0 && (
              <ul className="booking-form__alts">
                {ready.alternatives.map((alt) => (
                  <li key={alt.propertyId}>
                    <button type="button" onClick={() => setPropertyId(alt.propertyId)}>
                      {alt.title} is open those dates (sleeps {alt.maxGuests})
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {tooManyGuests && (
          <p className="booking-form__warn">
            {property.title} sleeps {property.maxGuests}.
          </p>
        )}
      </div>

      <div className="booking-form__row">
        <label className="booking-form__field">
          <span>First name</span>
          <input
            type="text"
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </label>
        <label className="booking-form__field">
          <span>Last name</span>
          <input
            type="text"
            required
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>
      </div>

      <div className="booking-form__row">
        <label className="booking-form__field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="booking-form__field">
          <span>
            Phone <em>(optional)</em>
          </span>
          <input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      </div>

      <label className="booking-form__field booking-form__field--wide">
        <span>
          Anything we should know? <em>(optional)</em>
        </span>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Dogs, skis, a birthday, an early check-in..."
        />
      </label>

      {/* Honeypot. Hidden from people, visible to form-filling bots.
          The label is deliberately meaningless to browser autofill. It was
          "Company" at first, which Chrome fills from a saved address profile
          -- and autocomplete="off" does not reliably stop address autofill --
          so a real guest with a company on file would have been silently
          dropped. No name attribute, and no word autofill matches on
          (company, organisation, name, email, phone, address, url). */}
      <div className="booking-form__hp" aria-hidden="true">
        <label>
          Please leave this empty
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={trap}
            onChange={(e) => setTrap(e.target.value)}
          />
        </label>
      </div>

      {/* Unticked by default, and separate from the request: asking for dates
          is not agreeing to promotions. */}
      <label className="booking-form__consent">
        <input
          type="checkbox"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
        />
        <span>
          Email me the occasional offer or open weekend. A few a year at most, and one click to
          stop.
        </span>
      </label>

      {submit.state === 'error' && <p className="booking-form__warn">{submit.error}</p>}

      <button type="submit" className="btn btn--primary btn--large booking-form__submit" disabled={!canSubmit}>
        {submit.state === 'sending'
          ? 'Sending...'
          : waitlist
            ? 'Join the waitlist'
            : 'Request these dates'}
      </button>

      <p className="booking-form__fine">
        A request is not a booking and does not hold the dates. Bo confirms by email, and you pay
        nothing until he does. Rather write?{' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>
    </form>
  );
}
