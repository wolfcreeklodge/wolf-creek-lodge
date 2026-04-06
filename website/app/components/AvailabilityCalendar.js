'use client';

import { useState, useEffect } from 'react';

const PROPERTY_COLORS = {
  'wolf-creek-lodge': { bg: 'var(--color-pine)', label: 'The House (3BR)' },
  'wolf-creek-apartment': { bg: 'var(--color-creek)', label: 'The Apartment (1BR)' },
  'wolf-creek-retreat-combo': { bg: 'var(--color-dusk)', label: 'The Retreat (4BR)' },
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatMonthYear(year, month) {
  return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function isDateInRange(year, month, day, ranges) {
  const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  for (const r of ranges) {
    if (d >= r.start && d < r.end) {
      return r.crossBlock ? 'cross' : 'direct';
    }
  }
  return null;
}

function MonthGrid({ year, month, properties }) {
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
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isPast = dateStr < today;

          return (
            <div key={day} className={`cal-cell ${isPast ? 'cal-cell--past' : ''}`}>
              <span className="cal-day-num">{day}</span>
              <div className="cal-indicators">
                {properties.map(prop => {
                  const status = isDateInRange(year, month, day, prop.blockedRanges);
                  if (!status) return null;
                  const color = PROPERTY_COLORS[prop.id];
                  return (
                    <div
                      key={prop.id}
                      className={`cal-dot ${status === 'cross' ? 'cal-dot--cross' : ''}`}
                      style={{ backgroundColor: color?.bg || '#999' }}
                      title={`${color?.label || prop.id}: Booked${status === 'cross' ? ' (blocked by related property)' : ''}`}
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

export default function AvailabilityCalendar() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    fetch('/api/availability?months=8')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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

  return (
    <div className="cal-container">
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
      </div>

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
          />
        ))}
      </div>
    </div>
  );
}
