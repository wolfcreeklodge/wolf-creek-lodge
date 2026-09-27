import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

// ---------------------------------------------------------------------------
// Booking requests from the website, and the waitlist.
//
// The waitlist is the "waitlisted" requests. Each carries now_available,
// checked live against the calendar, so a waitlisted request whose dates have
// come free is flagged here without anyone having to look it up. Offering
// those dates emails the guest; confirming creates the reservation, which the
// database refuses if the dates have gone in the meantime.
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'waitlisted', label: 'Waitlist' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'closed', label: 'Declined / withdrawn' },
];

const STATUS_STYLE = {
  pending: 'bg-yellow-100 text-yellow-800',
  waitlisted: 'bg-parchment text-saddle',
  offered: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-700',
};

const STATUS_LABEL = {
  pending: 'Dates were open',
  waitlisted: 'Waitlist',
  offered: 'Offered, waiting on guest',
  confirmed: 'Confirmed',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
};

function fmtDate(value) {
  const iso = String(value).slice(0, 10);
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

function fmtWhen(value) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function RequestCard({ r, onAction }) {
  const open = ['pending', 'waitlisted', 'offered'].includes(r.status);
  const freeNow = r.status === 'waitlisted' && r.now_available;
  const takenNow = ['pending', 'offered'].includes(r.status) && !r.now_available;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {r.guest_id ? (
              <Link to={`/guests/${r.guest_id}`} className="font-semibold text-creek hover:underline">
                {r.first_name} {r.last_name}
              </Link>
            ) : (
              <span className="font-semibold text-timber">{r.first_name} {r.last_name}</span>
            )}
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[r.status]}`}>
              {STATUS_LABEL[r.status]}
            </span>
            {freeNow && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-600 text-white">
                Dates free now
              </span>
            )}
            {takenNow && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-ember text-white">
                Dates since taken
              </span>
            )}
          </div>
          <div className="text-sm text-rawhide mt-0.5">
            <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a>
            {r.phone && <> &middot; {r.phone}</>}
          </div>
        </div>
        <div className="text-right text-xs text-rawhide">
          <div>Asked {fmtWhen(r.created_at)}</div>
          <div>Ref {r.id.slice(0, 8).toUpperCase()}</div>
        </div>
      </div>

      <div className="mt-3 text-sm text-timber">
        <span className="font-semibold">{r.property_title}</span>
        {' '}&middot; {fmtDate(r.check_in)} to {fmtDate(r.check_out)}
        {' '}({r.nights} night{r.nights === 1 ? '' : 's'})
        {' '}&middot; {r.num_guests} guest{r.num_guests === 1 ? '' : 's'}
        {r.quoted_total != null && (
          <> &middot; quoted ${Number(r.quoted_total).toLocaleString()}</>
        )}
      </div>

      {r.message && (
        <p className="mt-2 text-sm text-saddle whitespace-pre-line border-l-2 border-wheat pl-3">
          {r.message}
        </p>
      )}

      <div className="mt-2 text-xs text-rawhide">
        Offers: {r.marketing_consent === 'opted_in' ? 'opted in' : r.marketing_consent === 'opted_out' ? 'opted out' : 'not asked'}
        {r.offered_at && <> &middot; offered {fmtWhen(r.offered_at)}</>}
        {r.reservation_id && (
          <> &middot; <Link to={`/reservations/${r.reservation_id}`} className="text-creek hover:underline">reservation</Link></>
        )}
      </div>

      {open && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(r.status !== 'waitlisted' || r.now_available) && (
            <button
              type="button"
              onClick={() => onAction('confirm', r)}
              disabled={!r.now_available}
              title={r.now_available ? '' : 'The calendar shows these dates as taken'}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-pine text-white hover:bg-creek disabled:opacity-40"
            >
              Confirm booking
            </button>
          )}
          {r.status === 'waitlisted' && (
            <button
              type="button"
              onClick={() => onAction('offer', r)}
              disabled={!r.now_available}
              title={r.now_available ? '' : 'Still booked'}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gold text-timber hover:bg-yellow-500 disabled:opacity-40"
            >
              Email them: dates are free
            </button>
          )}
          {r.status === 'offered' && (
            <button
              type="button"
              onClick={() => onAction('waitlisted', r)}
              className="px-3 py-1.5 rounded-lg text-sm border border-wheat/60 text-saddle hover:bg-snow"
            >
              Back to waitlist
            </button>
          )}
          <button
            type="button"
            onClick={() => onAction('declined', r)}
            className="px-3 py-1.5 rounded-lg text-sm border border-wheat/60 text-saddle hover:bg-snow"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => onAction('withdrawn', r)}
            className="px-3 py-1.5 rounded-lg text-sm border border-wheat/60 text-saddle hover:bg-snow"
          >
            Guest withdrew
          </button>
        </div>
      )}
    </div>
  );
}

const CONFIRM_COPY = {
  confirm: (r) => ({
    title: 'Confirm this booking?',
    message: `Creates a direct reservation for ${r.first_name} ${r.last_name}: ${r.property_title}, ${fmtDate(r.check_in)} to ${fmtDate(r.check_out)}. It does not email them -- follow up with payment details yourself.`,
    confirmLabel: 'Create reservation',
    variant: 'warning',
  }),
  offer: (r) => ({
    title: 'Tell them the dates are free?',
    message: `Emails ${r.email} that ${r.property_title} is open for their dates and asks them to reply to hold them. Nothing is held until they do.`,
    confirmLabel: 'Send the email',
    variant: 'warning',
  }),
  declined: (r) => ({
    title: 'Decline this request?',
    message: `No email is sent. Let ${r.first_name} know yourself.`,
    confirmLabel: 'Decline',
    variant: 'danger',
  }),
  withdrawn: () => ({
    title: 'Mark as withdrawn?',
    message: 'Use this when the guest has told you they no longer want the dates.',
    confirmLabel: 'Mark withdrawn',
    variant: 'danger',
  }),
  waitlisted: () => ({
    title: 'Put back on the waitlist?',
    message: 'For an offer the guest did not answer. They stay on the list for these dates.',
    confirmLabel: 'Back to waitlist',
    variant: 'warning',
  }),
};

export default function BookingRequests() {
  const [tab, setTab] = useState('open');
  const [pending, setPending] = useState(null); // { action, request }
  const toast = useToast();
  const { data, loading, error, refetch } = useApi('/api/booking-requests', { status: tab });
  const { data: counts, refetch: refetchCounts } = useApi('/api/booking-requests/counts');

  async function run() {
    const { action, request } = pending;
    setPending(null);
    try {
      if (action === 'confirm') {
        await api.post(`/api/booking-requests/${request.id}/confirm`);
        toast.success('Reservation created.');
      } else if (action === 'offer') {
        await api.post(`/api/booking-requests/${request.id}/offer`);
        toast.success('Email queued.');
      } else {
        await api.post(`/api/booking-requests/${request.id}/status`, { status: action });
        toast.success('Updated.');
      }
    } catch (err) {
      toast.error(err.message);
    }
    refetch();
    refetchCounts();
  }

  const rows = data?.data || [];
  const copy = pending ? CONFIRM_COPY[pending.action](pending.request) : null;

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h1 className="text-2xl font-display font-bold text-timber">Requests &amp; Waitlist</h1>
        {counts && (
          <span className="text-sm text-rawhide">
            {counts.pending} waiting on you &middot; {counts.waitlisted} on the waitlist
            {counts.waitlisted_now_available > 0 && (
              <strong className="text-green-700"> &middot; {counts.waitlisted_now_available} with dates free now</strong>
            )}
          </span>
        )}
      </div>
      <p className="text-sm text-rawhide mb-5">
        Requests from the booking form on the website. A request does not hold dates:
        confirming one creates the reservation, and is refused if the dates have gone.
      </p>

      <div className="flex flex-wrap gap-1 mb-4 border-b border-wheat/40">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-semibold -mb-px border-b-2 ${
              tab === t.key ? 'border-pine text-pine' : 'border-transparent text-rawhide hover:text-saddle'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-creek border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-ember py-6">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-rawhide text-center py-12">
          {tab === 'waitlisted' ? 'Nobody is on the waitlist.' : 'Nothing here.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <RequestCard key={r.id} r={r} onAction={(action, request) => setPending({ action, request })} />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(pending)}
        onConfirm={run}
        onCancel={() => setPending(null)}
        title={copy?.title}
        message={copy?.message}
        confirmLabel={copy?.confirmLabel}
        variant={copy?.variant}
      />
    </div>
  );
}
