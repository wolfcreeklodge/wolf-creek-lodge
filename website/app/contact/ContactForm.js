'use client';

import { useState, useCallback } from 'react';

// Until 2026-10-11 this form sent nothing: it showed the thank-you below and
// dropped the message. It now posts to /api/contact, which queues the message
// to the owner's inbox, and the thank-you appears only once the server has
// accepted it. Anything else shows the error and the email address instead.
export function ContactForm({ contactEmail = 'wolfcreeklodge@outlook.com' }) {
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');
  const [trap, setTrap] = useState('');

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setState('sending');
      setError('');
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, hpTrap: trap }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Your message could not be sent.');
        }
        setState('sent');
        if (typeof window !== 'undefined' && window.umami?.track) {
          window.umami.track('contact-message', { subject: data.subject || '' });
        }
      } catch (err) {
        setError(err.message || 'Your message could not be sent.');
        setState('error');
      }
    },
    [trap]
  );

  if (state === 'sent') {
    return (
      <div className="combo-note" role="status">
        <h4>Thank you for your message!</h4>
        <p>
          It is on its way to our inbox, and we will get back to you as soon as possible.
          For urgent matters, please call us at +1 (206) 681-0117.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="name">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className="form-input"
            required
            maxLength={100}
            placeholder="Your name"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className="form-input"
            required
            maxLength={200}
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="subject">
          Subject
        </label>
        <select id="subject" name="subject" className="form-select" required>
          <option value="">Select a subject...</option>
          <option value="general">General Inquiry</option>
          <option value="booking">Booking Question</option>
          <option value="retreat">Group / Retreat Inquiry</option>
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="dates">
            Dates Interested
          </label>
          <input
            type="text"
            id="dates"
            name="dates"
            className="form-input"
            maxLength={100}
            placeholder="e.g., Dec 20-27, 2026"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="guests">
            Number of Guests
          </label>
          <input
            type="number"
            id="guests"
            name="guests"
            className="form-input"
            min="1"
            max="50"
            placeholder="e.g., 6"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          className="form-textarea"
          required
          maxLength={5000}
          placeholder="Tell us about your plans..."
        />
      </div>

      {/* Honeypot, the same as the booking form's: a person never sees it, a
          form-filling bot fills it. No name attribute, and a label no
          autofill matches on. */}
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

      {state === 'error' ? (
        <p className="form-error" role="alert">
          {error} You can also email us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      ) : null}

      <button type="submit" className="btn btn--primary btn--large" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
