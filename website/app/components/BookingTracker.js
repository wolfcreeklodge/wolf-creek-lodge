'use client';

import { useEffect } from 'react';

// ---------------------------------------------------------------------------
// Booking intent tracking.
//
// The booking flow ends in a mailto: link, which means the conversion happens
// in the visitor's mail client where no analytics tool can follow it. The click
// is the last thing we can observe, so that is what we record.
//
// One delegated listener on the document rather than handlers on each link:
// there are seven booking CTAs across six files today, and this catches any
// added later without anyone remembering to instrument them.
//
// Deliberately NOT recorded: the mail address itself. Several of these links
// use the address as their visible text, and there is no reason to put contact
// details into an analytics store.
// ---------------------------------------------------------------------------

function labelFor(link) {
  if (link.dataset.track) return link.dataset.track;
  if (link.closest('footer')) return 'footer';
  if (link.classList.contains('booking-cta')) return 'listing-rate-panel';
  if (link.classList.contains('btn--large')) return 'primary-cta';
  if (link.classList.contains('btn')) return 'button';
  return 'inline-link';
}

export function BookingTracker() {
  useEffect(() => {
    function onClick(event) {
      const link = event.target.closest?.('a[href^="mailto:"], a[href^="tel:"]');
      if (!link) return;

      const channel = link.getAttribute('href').startsWith('tel:') ? 'phone' : 'email';

      // umami may be absent: blocked, still loading, or running locally.
      // Never let analytics break a booking click.
      try {
        window.umami?.track('booking-intent', {
          channel,
          placement: labelFor(link),
          path: window.location.pathname,
        });
      } catch {
        /* ignore */
      }
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
