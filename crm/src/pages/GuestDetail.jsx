import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function GuestDetail() {
  const { id } = useParams();
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/guests/${id}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Guest not found');
        return res.json();
      })
      .then((data) => {
        setGuest(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-creek border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="max-w-2xl">
        <p className="text-red-600 mb-4">{error || 'Guest not found'}</p>
        <Link to="/guests" className="text-creek hover:underline">&larr; Back to guests</Link>
      </div>
    );
  }

  const stats = guest.lifetime_stats || {};

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link to="/guests" className="text-creek hover:underline text-sm">&larr; Back to guests</Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-timber">
              {guest.first_name} {guest.last_name}
            </h1>
            <p className="text-rawhide mt-1">{guest.email || 'No email'}</p>
            {guest.phone && <p className="text-rawhide">{guest.phone}</p>}
          </div>
          <span className="px-3 py-1 bg-creek/10 text-creek rounded-full text-sm font-medium">
            {guest.source}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center p-3 bg-snow rounded-lg">
            <div className="text-xl font-bold text-timber">{stats.total_stays || 0}</div>
            <div className="text-xs text-rawhide">Stays</div>
          </div>
          <div className="text-center p-3 bg-snow rounded-lg">
            <div className="text-xl font-bold text-timber">${(stats.total_revenue || 0).toLocaleString()}</div>
            <div className="text-xs text-rawhide">Revenue</div>
          </div>
          <div className="text-center p-3 bg-snow rounded-lg">
            <div className="text-xl font-bold text-timber">${(stats.avg_nightly_rate || 0).toFixed(0)}</div>
            <div className="text-xs text-rawhide">Avg Rate</div>
          </div>
          <div className="text-center p-3 bg-snow rounded-lg">
            <div className="text-xl font-bold text-timber">{stats.avg_party_size || 0}</div>
            <div className="text-xs text-rawhide">Avg Party</div>
          </div>
        </div>

        {guest.city && (
          <p className="text-rawhide text-sm mt-4">
            {[guest.city, guest.state_province, guest.country].filter(Boolean).join(', ')}
          </p>
        )}

        {guest.tags && guest.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {guest.tags.map((tag, i) => (
              <span key={i} className="px-2 py-1 bg-wheat/20 text-rawhide rounded text-xs">{tag}</span>
            ))}
          </div>
        )}

        {guest.notes && (
          <div className="mt-4 p-3 bg-snow rounded-lg">
            <p className="text-sm text-rawhide whitespace-pre-wrap">{guest.notes}</p>
          </div>
        )}
      </div>

      {/* Reservations */}
      <h2 className="text-lg font-display font-bold text-timber mb-3">Reservations</h2>
      {guest.reservations && guest.reservations.length > 0 ? (
        <div className="space-y-3">
          {guest.reservations.map((r) => (
            <div key={r.id} className="bg-white rounded-lg shadow-sm border border-wheat/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-timber">{r.property_id}</span>
                  <span className="mx-2 text-wheat">|</span>
                  <span className="text-rawhide text-sm">{r.check_in} &rarr; {r.check_out}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    r.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    r.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>{r.status}</span>
                  <span className="text-timber font-medium">${parseFloat(r.total_amount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-rawhide text-sm">No reservations yet.</p>
      )}
    </div>
  );
}
