'use client';

import { useState, useCallback } from 'react';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    // In production, this would send the form data to an API endpoint.
    // For now, we show a success message.
    setSubmitted(true);
  }, []);

  if (submitted) {
    return (
      <div className="combo-note">
        <h4>Thank you for your message!</h4>
        <p>
          We have received your inquiry and will get back to you as soon as possible.
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
            placeholder="e.g., Dec 20–27, 2026"
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
            max="12"
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
          placeholder="Tell us about your plans..."
        />
      </div>

      <button type="submit" className="btn btn--primary btn--large">
        Send Message
      </button>
    </form>
  );
}
