'use client';

import { useState, useEffect, useCallback } from 'react';

const PROPERTY_COLORS = {
  'wolf-creek-lodge': { bg: 'var(--color-pine)', label: 'The House (3BR)' },
  'wolf-creek-apartment': { bg: 'var(--color-creek)', label: 'The Apartment (1BR)' },
  'wolf-creek-retreat-combo': { bg: 'var(--color-dusk)', label: 'The Retreat (4BR)' },
};

const PROPERTY_OPTIONS = [
  { value: 'wolf-creek-lodge', label: 'The House (3BR)' },
  { value: 'wolf-creek-apartment', label: 'The Apartment (1BR)' },
  { value: 'wolf-creek-retreat-combo', label: 'The Retreat (4BR)' },
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatMonthYear(year, month) {
  return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getRangesForDate(dateStr, properties) {
  const results = [];
  for (const prop of properties) {
    for (const r of prop.blockedRanges) {
      if (dateStr >= r.start && dateStr < r.end) {
        results.push({ ...r, propertyId: prop.id });
      }
    }
  }
  return results;
}

function isInSelection(dateStr, sel) {
  if (!sel.start) return false;
  if (!sel.end) return dateStr === sel.start;
  const a = sel.start < sel.end ? sel.start : sel.end;
  const b = sel.start < sel.end ? sel.end : sel.start;
  return dateStr >= a && dateStr <= b;
}

function MonthGrid({ year, month, properties, isAdmin, selection, onDayClick, onDayInfo }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="cal-month">
      <h3 className="cal-month-title">{formatMonthYear(year, month)}</h3>
      <div className="cal-day-headers">
        {dayNames.map(d => <div key={d} className="cal-day-header">{d}</div>)}
      </div>
      <div className="cal-grid">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="cal-cell cal-cell--empty" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = toDateStr(year, month, day);
          const isPast = dateStr < today;
          const selected = isAdmin && isInSelection(dateStr, selection);
          const ranges = getRangesForDate(dateStr, properties);

          return (
            <div
              key={day}
              className={`cal-cell ${isPast ? 'cal-cell--past' : ''} ${selected ? 'cal-cell--selected' : ''} ${isAdmin && !isPast ? 'cal-cell--clickable' : ''}`}
              onClick={() => {
                if (isAdmin && !isPast) onDayClick(dateStr);
              }}
            >
              <span className="cal-day-num">{day}</span>
              <div className="cal-indicators">
                {properties.map(prop => {
                  const match = ranges.find(r => r.propertyId === prop.id);
                  if (!match) return null;
                  const color = PROPERTY_COLORS[prop.id];
                  return (
                    <div
                      key={prop.id}
                      className={`cal-dot ${match.crossBlock ? 'cal-dot--cross' : ''} ${match.is_block ? 'cal-dot--block' : ''}`}
                      style={{ backgroundColor: color?.bg || '#999' }}
                      title={`${color?.label}: ${match.is_block ? 'Blocked' : 'Booked'}${match.guest_name && !match.is_block ? ` - ${match.guest_name}` : ''}${match.crossBlock ? ' (cross-property)' : ''}`}
                      onClick={(e) => {
                        if (isAdmin && match.reservation_id) {
                          e.stopPropagation();
                          onDayInfo(match);
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminToolbar({ user, mode, setMode, onLogout }) {
  return (
    <div className="cal-admin-toolbar">
      <div className="cal-admin-user">
        <span className="cal-admin-badge">Admin</span>
        <span>{user.name || user.email}</span>
      </div>
      <div className="cal-admin-modes">
        {['view', 'booking', 'block'].map(m => (
          <button
            key={m}
            className={`cal-mode-btn ${mode === m ? 'cal-mode-btn--active' : ''}`}
            onClick={() => setMode(m)}
          >
            {m === 'view' ? 'View' : m === 'booking' ? '+ Booking' : '+ Block'}
          </button>
        ))}
      </div>
      <button onClick={onLogout} className="cal-admin-logout">Sign out</button>
    </div>
  );
}

function BookingForm({ selection, onSubmit, onCancel, submitting, error }) {
  const [form, setForm] = useState({
    property_id: PROPERTY_OPTIONS[0].value,
    guest_first_name: '', guest_last_name: '', guest_email: '', guest_phone: '',
    notes: '', booking_channel: 'direct', num_guests: 1,
  });
  const startDate = selection.start < selection.end ? selection.start : selection.end;
  const endDate = selection.start < selection.end ? selection.end : selection.start;
  // Add one day to end since selection is inclusive but check_out is exclusive
  const checkOut = new Date(endDate);
  checkOut.setDate(checkOut.getDate() + 1);
  const checkOutStr = checkOut.toISOString().split('T')[0];

  return (
    <div className="cal-admin-form">
      <h3>New Booking: {startDate} to {checkOutStr}</h3>
      {error && <p className="cal-form-error">{error}</p>}
      <div className="cal-form-grid">
        <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}>
          {PROPERTY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <input placeholder="First name *" required value={form.guest_first_name}
          onChange={e => setForm(f => ({ ...f, guest_first_name: e.target.value }))} />
        <input placeholder="Last name *" required value={form.guest_last_name}
          onChange={e => setForm(f => ({ ...f, guest_last_name: e.target.value }))} />
        <input placeholder="Email" type="email" value={form.guest_email}
          onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))} />
        <input placeholder="Phone" type="tel" value={form.guest_phone}
          onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))} />
        <select value={form.booking_channel} onChange={e => setForm(f => ({ ...f, booking_channel: e.target.value }))}>
          <option value="direct">Direct</option>
          <option value="airbnb">Airbnb</option>
          <option value="vrbo">VRBO</option>
          <option value="phone">Phone</option>
          <option value="other">Other</option>
        </select>
        <input placeholder="# Guests" type="number" min="1" value={form.num_guests}
          onChange={e => setForm(f => ({ ...f, num_guests: parseInt(e.target.value) || 1 }))} />
        <textarea placeholder="Notes" value={form.notes} rows={2}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
      <div className="cal-form-actions">
        <button onClick={onCancel} className="cal-btn cal-btn--secondary">Cancel</button>
        <button
          onClick={() => onSubmit({ ...form, check_in: startDate, check_out: checkOutStr })}
          disabled={submitting || !form.guest_first_name || !form.guest_last_name}
          className="cal-btn cal-btn--primary"
        >
          {submitting ? 'Creating...' : 'Create Booking'}
        </button>
      </div>
    </div>
  );
}

function BlockForm({ selection, onSubmit, onCancel, submitting, error }) {
  const [property_id, setPropertyId] = useState(PROPERTY_OPTIONS[0].value);
  const [notes, setNotes] = useState('Owner block');
  const startDate = selection.start < selection.end ? selection.start : selection.end;
  const endDate = selection.start < selection.end ? selection.end : selection.start;
  const checkOut = new Date(endDate);
  checkOut.setDate(checkOut.getDate() + 1);
  const checkOutStr = checkOut.toISOString().split('T')[0];

  return (
    <div className="cal-admin-form">
      <h3>Block Dates: {startDate} to {checkOutStr}</h3>
      {error && <p className="cal-form-error">{error}</p>}
      <div className="cal-form-grid">
        <select value={property_id} onChange={e => setPropertyId(e.target.value)}>
          {PROPERTY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <input placeholder="Reason (e.g. Owner stay, Maintenance)" value={notes}
          onChange={e => setNotes(e.target.value)} />
      </div>
      <div className="cal-form-actions">
        <button onClick={onCancel} className="cal-btn cal-btn--secondary">Cancel</button>
        <button
          onClick={() => onSubmit({ property_id, check_in: startDate, check_out: checkOutStr, notes })}
          disabled={submitting}
          className="cal-btn cal-btn--primary"
        >
          {submitting ? 'Blocking...' : 'Block Dates'}
        </button>
      </div>
    </div>
  );
}

function InfoPanel({ info, onClose, onUpdateNotes, onRemoveBlock }) {
  const [notes, setNotes] = useState(info.notes || '');
  const [saving, setSaving] = useState(false);

  return (
    <div className="cal-admin-form">
      <h3>{info.is_block ? 'Block' : 'Booking'} Details</h3>
      <div className="cal-info-details">
        <p><strong>Dates:</strong> {info.start} to {info.end}</p>
        {!info.is_block && <p><strong>Guest:</strong> {info.guest_name}</p>}
        <p><strong>Channel:</strong> {info.booking_channel || 'direct'}</p>
        {info.crossBlock && <p><em>Cross-property block</em></p>}
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Notes" />
      <div className="cal-form-actions">
        <button onClick={onClose} className="cal-btn cal-btn--secondary">Close</button>
        {info.is_block && !info.crossBlock && (
          <button onClick={() => onRemoveBlock(info.reservation_id)} className="cal-btn cal-btn--danger">
            Remove Block
          </button>
        )}
        <button
          disabled={saving}
          className="cal-btn cal-btn--primary"
          onClick={async () => {
            setSaving(true);
            await onUpdateNotes(info.reservation_id, notes);
            setSaving(false);
          }}
        >
          {saving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>
    </div>
  );
}

export default function AvailabilityCalendar() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);
  const [mode, setMode] = useState('view'); // view, booking, block
  const [selection, setSelection] = useState({ start: null, end: null });
  const [activeInfo, setActiveInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const fetchData = useCallback(() => {
    fetch('/api/availability?months=8')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Check admin status
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.user) setAdminUser(d.user); })
      .catch(() => {});
    fetchData();
  }, [fetchData]);

  const months = [];
  let y = startMonth.year;
  let m = startMonth.month;
  for (let i = 0; i < 4; i++) {
    months.push({ year: y, month: m });
    m++;
    if (m > 11) { m = 0; y++; }
  }

  function navigate(dir) {
    setStartMonth(prev => {
      let nm = prev.month + dir * 2;
      let ny = prev.year;
      while (nm < 0) { nm += 12; ny--; }
      while (nm > 11) { nm -= 12; ny++; }
      return { year: ny, month: nm };
    });
  }

  function handleDayClick(dateStr) {
    if (mode === 'view') return;
    setActiveInfo(null);
    setFormError(null);
    if (!selection.start || selection.end) {
      setSelection({ start: dateStr, end: null });
    } else {
      setSelection(s => ({ ...s, end: dateStr }));
    }
  }

  function handleDayInfo(rangeInfo) {
    setSelection({ start: null, end: null });
    setActiveInfo(rangeInfo);
  }

  async function handleCreateBooking(body) {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSelection({ start: null, end: null });
      setMode('view');
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateBlock(body) {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/admin/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSelection({ start: null, end: null });
      setMode('view');
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateNotes(reservationId, notes) {
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, notes }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setActiveInfo(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleRemoveBlock(reservationId) {
    if (!confirm('Remove this block?')) return;
    try {
      const res = await fetch('/api/admin/blocks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId }),
      });
      if (!res.ok) throw new Error('Failed to remove');
      setActiveInfo(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAdminUser(null);
    setMode('view');
    setSelection({ start: null, end: null });
    setActiveInfo(null);
    fetchData();
  }

  if (loading) {
    return (
      <div className="cal-loading">
        <div className="cal-spinner" />
        <p>Loading availability...</p>
      </div>
    );
  }

  if (!data || !data.properties) {
    return <p className="cal-error">Unable to load availability data.</p>;
  }

  const showBookingForm = adminUser && mode === 'booking' && selection.start && selection.end;
  const showBlockForm = adminUser && mode === 'block' && selection.start && selection.end;

  return (
    <div className="cal-container">
      {/* Admin toolbar */}
      {adminUser && (
        <AdminToolbar user={adminUser} mode={mode} setMode={(m) => {
          setMode(m);
          setSelection({ start: null, end: null });
          setActiveInfo(null);
          setFormError(null);
        }} onLogout={handleLogout} />
      )}

      {/* Legend */}
      <div className="cal-legend">
        {data.properties.map(prop => {
          const color = PROPERTY_COLORS[prop.id];
          return (
            <div key={prop.id} className="cal-legend-item">
              <span className="cal-legend-dot" style={{ backgroundColor: color?.bg || '#999' }} />
              <span>{color?.label || prop.title}</span>
            </div>
          );
        })}
        <div className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--available" />
          <span>Available</span>
        </div>
        {adminUser && (
          <div className="cal-legend-item">
            <span className="cal-legend-dot cal-legend-dot--block-example" />
            <span>Block</span>
          </div>
        )}
      </div>

      {/* Admin forms */}
      {showBookingForm && (
        <BookingForm selection={selection} onSubmit={handleCreateBooking}
          onCancel={() => setSelection({ start: null, end: null })}
          submitting={submitting} error={formError} />
      )}
      {showBlockForm && (
        <BlockForm selection={selection} onSubmit={handleCreateBlock}
          onCancel={() => setSelection({ start: null, end: null })}
          submitting={submitting} error={formError} />
      )}
      {adminUser && activeInfo && (
        <InfoPanel info={activeInfo} onClose={() => setActiveInfo(null)}
          onUpdateNotes={handleUpdateNotes} onRemoveBlock={handleRemoveBlock} />
      )}

      {/* Selection hint */}
      {adminUser && mode !== 'view' && !selection.start && (
        <p className="cal-hint">Click a start date on the calendar below</p>
      )}
      {adminUser && mode !== 'view' && selection.start && !selection.end && (
        <p className="cal-hint">Now click an end date</p>
      )}

      {/* Navigation */}
      <div className="cal-nav">
        <button onClick={() => navigate(-1)} className="cal-nav-btn" aria-label="Previous months">&larr;</button>
        <span className="cal-nav-range">
          {formatMonthYear(months[0].year, months[0].month)} &ndash; {formatMonthYear(months[months.length - 1].year, months[months.length - 1].month)}
        </span>
        <button onClick={() => navigate(1)} className="cal-nav-btn" aria-label="Next months">&rarr;</button>
      </div>

      {/* Calendar grid */}
      <div className="cal-months">
        {months.map(({ year, month }) => (
          <MonthGrid
            key={`${year}-${month}`}
            year={year}
            month={month}
            properties={data.properties}
            isAdmin={!!adminUser}
            selection={selection}
            onDayClick={handleDayClick}
            onDayInfo={handleDayInfo}
          />
        ))}
      </div>

      {/* Admin login link (subtle) */}
      {!adminUser && (
        <div className="cal-admin-login">
          <a href="/api/auth/login">Admin</a>
        </div>
      )}
    </div>
  );
}
