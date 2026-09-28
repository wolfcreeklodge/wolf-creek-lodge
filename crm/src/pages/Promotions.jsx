import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

// ---------------------------------------------------------------------------
// Promotions.
//
// Goes only to guests marked "opted in": people who ticked the box on the
// request form, or whom Bo has marked as agreeing on their guest page.
// "Not asked" is the default and is not permission. The sender adds the
// unsubscribe link and postal address to every message itself.
//
// Sending queues one email per recipient in the outbox; the email-send worker
// delivers them. The send is refused if the audience has changed since the
// number on screen, so nobody sends to a list they did not look at.
// ---------------------------------------------------------------------------

function fmtWhen(value) {
  return value
    ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
}

function Preview({ subject, body }) {
  const paras = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="bg-snow border border-wheat/40 rounded-lg p-4 text-sm">
      <div className="text-xs text-rawhide mb-1">Subject</div>
      <div className="font-semibold text-timber mb-3">{subject || <em className="text-rawhide">no subject</em>}</div>
      <div className="bg-white border border-parchment rounded p-4 text-saddle leading-relaxed">
        <p className="mb-3">Hi [first name],</p>
        {paras.length ? paras.map((p, i) => (
          <p key={i} className="mb-3 whitespace-pre-line">{p}</p>
        )) : <p className="text-rawhide italic">Your message will appear here.</p>}
      </div>
      <p className="text-xs text-rawhide mt-2">
        Added automatically: a one-click unsubscribe link and the Winthrop postal address.
      </p>
    </div>
  );
}

export default function Promotions() {
  const toast = useToast();
  const { data: list, refetch: refetchList } = useApi('/api/promotions');
  const { data: audience, refetch: refetchAudience } = useApi('/api/promotions/audience');

  const [editing, setEditing] = useState(null); // promotion id, or 'new', or null
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);

  const promotions = list?.data || [];
  const count = audience?.count ?? 0;
  const byConsent = audience?.byConsent || {};

  function startNew() {
    setEditing('new');
    setSubject('');
    setBody('');
  }

  function edit(p) {
    setEditing(p.id);
    setSubject(p.subject);
    setBody(p.body);
  }

  async function save() {
    setBusy(true);
    try {
      const saved = editing === 'new'
        ? await api.post('/api/promotions', { subject, body })
        : await api.put(`/api/promotions/${editing}`, { subject, body });
      setEditing(saved.id);
      toast.success('Draft saved.');
      refetchList();
      return saved.id;
    } catch (err) {
      toast.error(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    const id = await save();
    if (!id) return;
    try {
      const res = await api.post(`/api/promotions/${id}/test`);
      toast.success(`Test queued to ${res.to}. Check the Outbox.`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function send() {
    setConfirmSend(false);
    const id = await save();
    if (!id) return;
    try {
      await api.post(`/api/promotions/${id}/send`, { expectedCount: count });
      toast.success(`Queued for ${count} ${count === 1 ? 'person' : 'people'}.`);
      setEditing(null);
    } catch (err) {
      toast.error(err.message);
    }
    refetchList();
    refetchAudience();
  }

  async function remove(p) {
    try {
      await api.delete(`/api/promotions/${p.id}`);
      if (editing === p.id) setEditing(null);
      refetchList();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-baseline justify-between mb-2">
        <h1 className="text-2xl font-display font-bold text-timber">Promotions</h1>
        {!editing && (
          <button
            type="button"
            onClick={startNew}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-pine text-white hover:bg-creek"
          >
            New promotion
          </button>
        )}
      </div>

      {/* Audience */}
      <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-4 mb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <span className="text-2xl font-display font-bold text-timber">{count}</span>
            <span className="text-sm text-saddle"> {count === 1 ? 'person has' : 'people have'} opted in</span>
          </div>
          <button
            type="button"
            onClick={() => setShowRecipients((s) => !s)}
            className="text-sm text-creek hover:underline"
            disabled={!count}
          >
            {showRecipients ? 'Hide list' : 'See who'}
          </button>
        </div>
        <p className="text-xs text-rawhide mt-1">
          Of guests with an email address: {byConsent.opted_in || 0} opted in,{' '}
          {byConsent.unknown || 0} never asked, {byConsent.opted_out || 0} unsubscribed.
          Only &ldquo;opted in&rdquo; get promotions. If a past guest has told you they are happy
          to hear from you, mark them on their <Link to="/guests" className="text-creek hover:underline">guest page</Link>.
        </p>
        {showRecipients && count > 0 && (
          <ul className="mt-3 text-sm text-timber grid sm:grid-cols-2 gap-x-4">
            {audience.recipients.map((g) => (
              <li key={g.id}>
                <Link to={`/guests/${g.id}`} className="hover:underline">{g.first_name} {g.last_name}</Link>
                <span className="text-rawhide"> &middot; {g.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Composer */}
      {editing && (
        <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-5 mb-6">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-saddle">
                Subject
                <input
                  type="text"
                  maxLength={150}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Larch season: two midweek nights, 15% off"
                  className="mt-1 w-full px-3 py-2 border border-wheat/60 rounded-lg text-sm font-normal"
                />
              </label>
              <label className="text-sm font-semibold text-saddle">
                Message
                <textarea
                  rows={12}
                  maxLength={10000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={'Write it like a note to a past guest.\n\nLeave a blank line between paragraphs.'}
                  className="mt-1 w-full px-3 py-2 border border-wheat/60 rounded-lg text-sm font-normal"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={save} disabled={busy}
                  className="px-3 py-1.5 rounded-lg text-sm border border-wheat/60 text-saddle hover:bg-snow disabled:opacity-40">
                  Save draft
                </button>
                <button type="button" onClick={sendTest} disabled={busy || !subject || !body}
                  className="px-3 py-1.5 rounded-lg text-sm border border-wheat/60 text-saddle hover:bg-snow disabled:opacity-40">
                  Send a test to me
                </button>
                <button type="button" onClick={() => setConfirmSend(true)} disabled={busy || !subject || !body || !count}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-pine text-white hover:bg-creek disabled:opacity-40">
                  Send to {count} {count === 1 ? 'person' : 'people'}
                </button>
                <button type="button" onClick={() => setEditing(null)}
                  className="px-3 py-1.5 rounded-lg text-sm text-rawhide hover:underline">
                  Close
                </button>
              </div>
            </div>
            <Preview subject={subject} body={body} />
          </div>
        </div>
      )}

      {/* History */}
      <h2 className="text-lg font-display font-bold text-timber mb-2">All promotions</h2>
      {promotions.length === 0 ? (
        <p className="text-rawhide py-6">None yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-wheat/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-snow border-b border-wheat/30">
              <tr>
                <th className="text-left p-3 font-medium text-rawhide">Subject</th>
                <th className="text-left p-3 font-medium text-rawhide">Status</th>
                <th className="text-left p-3 font-medium text-rawhide">Delivery</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {promotions.map((p) => (
                <tr key={p.id} className="border-b border-wheat/10">
                  <td className="p-3 text-timber">{p.subject}</td>
                  <td className="p-3">
                    {p.status === 'sent'
                      ? <span className="text-green-700">Sent {fmtWhen(p.sent_at)}</span>
                      : <span className="text-rawhide">Draft</span>}
                  </td>
                  <td className="p-3 text-rawhide text-xs">
                    {p.status === 'sent' && (
                      <>
                        {p.recipient_count} recipient{p.recipient_count === 1 ? '' : 's'}
                        {p.sent > 0 && <> &middot; {p.sent} sent</>}
                        {p.logged > 0 && <> &middot; {p.logged} logged only</>}
                        {p.queued > 0 && <> &middot; {p.queued} waiting</>}
                        {p.skipped > 0 && <> &middot; {p.skipped} unsubscribed</>}
                        {p.failed > 0 && <span className="text-ember"> &middot; {p.failed} failed</span>}
                      </>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {p.status === 'draft' && (
                      <>
                        <button type="button" onClick={() => edit(p)} className="text-creek hover:underline mr-3">Edit</button>
                        <button type="button" onClick={() => remove(p)} className="text-ember hover:underline">Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmSend}
        onConfirm={send}
        onCancel={() => setConfirmSend(false)}
        title={`Send to ${count} ${count === 1 ? 'person' : 'people'}?`}
        message="This cannot be unsent. Everyone on the opted-in list gets it, each with their own unsubscribe link."
        confirmLabel="Send it"
        variant="warning"
      />
    </div>
  );
}
