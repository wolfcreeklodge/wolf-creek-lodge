'use client';

import { useEffect } from 'react';
import { TAX_NOTE } from '../../lib/agent-metadata.js';

// ---------------------------------------------------------------------------
// WebMCP: one read-only tool for an agent working in the visitor's browser.
//
// Read-only on purpose. Nothing here books, pays or submits a form: there is
// no Guardian agent yet to vet agent-originated writes, so the only write path
// stays the request form a person fills in.
//
// The API is document.modelContext (W3C WebMCP draft; it moved from
// navigator.modelContext in May 2026, so older Chrome builds still have the
// latter). It exists only in Chrome and Edge origin trials, so for nearly
// every visitor this effect finds nothing and returns; the page must behave
// identically either way. registerTool returns a Promise; aborting the signal
// unregisters the tool, which the cleanup does. The tool calls the same
// /api/booking-requests/check as the form, never a second copy of the logic.
// ---------------------------------------------------------------------------

const PROPERTIES = ['wolf-creek-lodge', 'wolf-creek-apartment', 'wolf-creek-retreat-combo'];

export function AgentTools() {
  useEffect(() => {
    const mc =
      (typeof document !== 'undefined' && document.modelContext) ||
      (typeof navigator !== 'undefined' && navigator.modelContext);
    if (!mc || typeof mc.registerTool !== 'function') return undefined;

    const controller = new AbortController();
    Promise.resolve()
      .then(() =>
        mc.registerTool(
          {
            name: 'check_availability',
            title: 'Check Wolfcreek Lodge availability',
            description:
              'Read-only. Whether a Wolfcreek Lodge property (Winthrop, WA) is free for a stay, ' +
              'the minimum stay for those dates, the direct-booking price in USD before tax, and ' +
              'the other configurations free if it is taken. The three properties are mutually ' +
              'exclusive: wolf-creek-retreat-combo is the House and the Apartment together. ' +
              'Returns where the guest books; it does not book anything.',
            inputSchema: {
              type: 'object',
              properties: {
                property: { type: 'string', enum: PROPERTIES },
                checkIn: { type: 'string', format: 'date', description: 'Arrival, YYYY-MM-DD.' },
                checkOut: { type: 'string', format: 'date', description: 'Departure, YYYY-MM-DD.' },
              },
              required: ['property', 'checkIn', 'checkOut'],
            },
            annotations: { readOnlyHint: true },
            async execute(input, options) {
              const query = new URLSearchParams({
                property: String(input?.property || ''),
                checkIn: String(input?.checkIn || ''),
                checkOut: String(input?.checkOut || ''),
              });
              const res = await fetch(`/api/booking-requests/check?${query}`, {
                signal: options?.signal,
              });
              const data = await res.json();
              if (data.error) return data;
              return {
                ...data,
                bookAt: `${window.location.origin}/listings/${data.propertyId}#request-dates`,
                taxes: TAX_NOTE,
              };
            },
          },
          { signal: controller.signal }
        )
      )
      // A rejected registration (an older build, a duplicate after a fast
      // remount) must never surface to the visitor.
      .catch(() => {});

    return () => controller.abort();
  }, []);

  return null;
}
