import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function ReservationDetail() {
  const { id } = useParams();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/crm/api/reservations/${id}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Reservation not found');
        return res.json();
      })
      .then((data) => {
        setReservation(data);
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

  if (error || !reservation) {
    return (
      <div className="max-w-2xl">
        <p className="text-red-600 mb-4">{error || 'Reservation not found'}</p>
        <Link to="/reservations" className="text-creek hover:underline">&larr; Back to reservations</Link>
      </div>
    );
  }

  const r = reservation;
  const balance = Math.max(0, parseFloat(r.total_amount || 0) - parseFloat(r.amount_paid || 0));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link to="/reservations" className="text-creek hover:underline text-sm">&larr; Back to reservations</Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-display font-bold text-timber">{r.property_id}</h1>
            <p className="text-rawhide mt-1">
              {r.check_in} &rarr; {r.check_out}
              {r.num_nights && <span className="ml-2 text-sm">({r.num_nights} nights)</span>}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            r.status === 'confirmed' ? 'bg-green-100 text-green-800' :
            r.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            r.status === 'completed' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>{r.status}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-rawhide">Guest</span>
            <p className="text-timber font-medium">
              <Link to={`/guests/${r.guest_id}`} className="text-creek hover:underline">
                {r.guest_first_name} {r.guest_last_name}
              </Link>
            </p>
            {r.guest_email && <p className="text-rawhide">{r.guest_email}</p>}
          </div>
          <div>
            <span className="text-rawhide">Guests</span>
            <p className="text-timber font-medium">{r.num_guests || '-'}</p>
          </div>
          <div>
            <span className="text-rawhide">Channel</span>
            <p className="text-timber font-medium">{r.booking_channel}</p>
          </div>
          {r.channel_conf_code && (
            <div>
              <span className="text-rawhide">Confirmation</span>
              <p className="text-timber font-medium">{r.channel_conf_code}</p>
            </div>
          )}
        </div>

        {/* Financials */}
        <div className="mt-6 pt-4 border-t border-wheat/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-snow rounded-lg">
              <div className="text-lg font-bold text-timber">${parseFloat(r.total_amount || 0).toLocaleString()}</div>
              <div className="text-xs text-rawhide">Total</div>
            </div>
            <div className="p-3 bg-snow rounded-lg">
              <div className="text-lg font-bold text-green-700">${parseFloat(r.amount_paid || 0).toLocaleString()}</div>
              <div className="text-xs text-rawhide">Paid</div>
            </div>
            <div className="p-3 bg-snow rounded-lg">
              <div className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                ${balance.toLocaleString()}
              </div>
              <div className="text-xs text-rawhide">Balance</div>
            </div>
          </div>
        </div>

        {r.notes && (
          <div className="mt-4 p-3 bg-snow rounded-lg">
            <p className="text-sm text-rawhide whitespace-pre-wrap">{r.notes}</p>
          </div>
        )}
      </div>

      {/* Payments */}
      <h2 className="text-lg font-display font-bold text-timber mb-3">Payments</h2>
      {r.payments && r.payments.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-wheat/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-snow border-b border-wheat/30">
              <tr>
                <th className="text-left p-3 font-medium text-rawhide">Date</th>
                <th className="text-left p-3 font-medium text-rawhide">Method</th>
                <th className="text-right p-3 font-medium text-rawhide">Amount</th>
                <th className="text-left p-3 font-medium text-rawhide">Notes</th>
              </tr>
            </thead>
            <tbody>
              {r.payments.map((p) => (
                <tr key={p.id} className="border-b border-wheat/10">
                  <td className="p-3 text-timber">{p.paid_at}</td>
                  <td className="p-3 text-rawhide">{p.method}</td>
                  <td className="p-3 text-right text-timber font-medium">${parseFloat(p.amount).toLocaleString()}</td>
                  <td className="p-3 text-rawhide">{p.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-rawhide text-sm">No payments recorded.</p>
      )}
    </div>
  );
}
