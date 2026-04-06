import React from 'react';
import { useApi } from '../hooks/useApi';
import { formatRelativeTime } from '../utils/formatters';

export default function EmailList({ guestId, reservationId }) {
  const params = {};
  if (guestId) params.guest_id = guestId;
  if (reservationId) params.reservation_id = reservationId;

  const { data, loading, error } = useApi('/api/emails', params);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-4 border-creek border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  const emails = data?.emails || [];

  if (emails.length === 0) {
    return <p className="text-rawhide text-sm">No emails found.</p>;
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => (
        <div
          key={email.id}
          className="bg-white rounded-lg shadow-sm border border-wheat/30 p-4"
        >
          <div className="flex items-start gap-3">
            {/* Direction indicator */}
            <div
              className={`flex-shrink-0 mt-0.5 text-lg ${
                email.direction === 'inbound' ? 'text-creek' : 'text-rawhide'
              }`}
              title={email.direction === 'inbound' ? 'Received' : 'Sent'}
            >
              {email.direction === 'inbound' ? '\u2192' : '\u2190'}
            </div>

            <div className="flex-1 min-w-0">
              {/* Subject + date row */}
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-timber font-medium truncate">
                  {email.subject || '(no subject)'}
                </p>
                <span className="flex-shrink-0 text-xs text-rawhide/70">
                  {formatRelativeTime(email.received_at)}
                </span>
              </div>

              {/* Snippet */}
              {email.snippet && (
                <p className="text-sm text-rawhide mt-1 line-clamp-2">
                  {email.snippet}
                </p>
              )}

              {/* Open in Outlook link */}
              {email.web_link && (
                <a
                  href={email.web_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-creek hover:underline mt-2"
                >
                  Open in Outlook &rarr;
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
