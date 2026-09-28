import React, { useState } from 'react';
import { api, useApi } from '../hooks/useApi';
import Modal from '../components/Modal';

// ---------------------------------------------------------------------------
// Everything the system has emailed, or would have.
//
// In EMAIL_PROVIDER=log mode nothing leaves the building: messages are
// rendered and recorded as "logged", and this page is the only place to read
// them. The banner says so, because the difference between "sent" and
// "logged" is the difference between a guest hearing from us and not.
// ---------------------------------------------------------------------------

const KIND_LABEL = {
  request_received: 'Request received (to guest)',
  request_waitlisted: 'Waitlisted (to guest)',
  owner_new_request: 'New request (to you)',
  dates_available: 'Dates free (to guest)',
  promotion: 'Promotion',
};

const STATUS_STYLE = {
  sent: 'bg-green-100 text-green-800',
  logged: 'bg-yellow-100 text-yellow-800',
  queued: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  skipped: 'bg-gray-100 text-gray-700',
};

function fmtWhen(value) {
  return value
    ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
}

export default function Outbox() {
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(null);
  const { data, loading } = useApi('/api/outbox', { status });
  const rows = data?.data || [];

  // What mode is the sender in? The most recent processed message says.
  const lastProcessed = rows.find((r) => r.provider);
  const logMode = lastProcessed?.provider === 'log';

  async function show(row) {
    try {
      setOpen(await api.get(`/api/outbox/${row.id}`));
    } catch {
      setOpen({ ...row, body_text: '(could not load)' });
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-2xl font-display font-bold text-timber">Outbox</h1>
        <select
          className="px-3 py-1.5 border border-wheat/40 rounded-lg text-sm bg-white"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All</option>
          <option value="queued">Waiting</option>
          <option value="sent">Sent</option>
          <option value="logged">Logged only</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>

      {logMode && (
        <div className="mb-4 p-3 rounded-lg border border-gold bg-parchment text-sm text-timber">
          <strong>Email is in log mode.</strong> Messages are written and recorded here but not
          actually sent, so guests are not receiving them. This changes when an email provider is
          set up (<code>EMAIL_PROVIDER</code> in <code>.env</code>).
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-creek border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-rawhide text-center py-12">Nothing yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-wheat/30 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-snow border-b border-wheat/30">
              <tr>
                <th className="text-left p-3 font-medium text-rawhide">When</th>
                <th className="text-left p-3 font-medium text-rawhide">What</th>
                <th className="text-left p-3 font-medium text-rawhide">To</th>
                <th className="text-left p-3 font-medium text-rawhide">Subject</th>
                <th className="text-left p-3 font-medium text-rawhide">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => show(r)} className="border-b border-wheat/10 hover:bg-snow/50 cursor-pointer">
                  <td className="p-3 text-rawhide whitespace-nowrap">{fmtWhen(r.sent_at || r.created_at)}</td>
                  <td className="p-3 text-timber">
                    {KIND_LABEL[r.kind] || r.kind}{r.is_test && <span className="text-rawhide"> (test)</span>}
                  </td>
                  <td className="p-3 text-saddle">{r.to_email}</td>
                  <td className="p-3 text-timber">{r.subject || <span className="text-rawhide">not rendered yet</span>}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                      {r.status === 'logged' ? 'logged only' : r.status}
                    </span>
                    {r.last_error && <div className="text-xs text-ember mt-1">{r.last_error}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={Boolean(open)} onClose={() => setOpen(null)} title={open?.subject || 'Message'} size="lg">
        {open && (
          <div className="text-sm">
            <div className="text-rawhide mb-3">
              To {open.to_email} &middot; {KIND_LABEL[open.kind] || open.kind} &middot; {open.status}
            </div>
            <pre className="whitespace-pre-wrap font-body text-timber bg-snow border border-wheat/30 rounded p-3">
              {open.body_text || 'Not rendered yet -- the sender has not picked this one up.'}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
}
