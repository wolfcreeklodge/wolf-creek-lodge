import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function ReservationList() {
  const [reservations, setReservations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ property: '', status: '', sort: 'check_in', order: 'desc' });

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 25, ...filters });
    // Remove empty params
    for (const [key, val] of [...params.entries()]) {
      if (!val) params.delete(key);
    }
    fetch(`/crm/api/reservations?${params}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setReservations(data.reservations || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, filters]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-timber">Reservations</h1>
        <span className="text-sm text-rawhide">{total} total</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          className="px-3 py-1.5 border border-wheat/40 rounded-lg text-sm bg-white"
          value={filters.property}
          onChange={(e) => { setFilters(f => ({ ...f, property: e.target.value })); setPage(1); }}
        >
          <option value="">All properties</option>
          <option value="wolf-creek-lodge">Lodge</option>
          <option value="wolf-creek-apartment">Apartment</option>
          <option value="wolf-creek-retreat-combo">Retreat</option>
        </select>
        <select
          className="px-3 py-1.5 border border-wheat/40 rounded-lg text-sm bg-white"
          value={filters.status}
          onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-creek border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reservations.length === 0 ? (
        <p className="text-rawhide text-center py-12">No reservations found.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-wheat/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-snow border-b border-wheat/30">
              <tr>
                <th className="text-left p-3 font-medium text-rawhide">Guest</th>
                <th className="text-left p-3 font-medium text-rawhide">Property</th>
                <th className="text-left p-3 font-medium text-rawhide">Check-in</th>
                <th className="text-left p-3 font-medium text-rawhide">Check-out</th>
                <th className="text-left p-3 font-medium text-rawhide">Status</th>
                <th className="text-right p-3 font-medium text-rawhide">Total</th>
                <th className="text-right p-3 font-medium text-rawhide">Balance</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-wheat/10 hover:bg-snow/50">
                  <td className="p-3">
                    <Link to={`/guests/${r.guest_id}`} className="text-creek hover:underline">
                      {r.guest_first_name} {r.guest_last_name}
                    </Link>
                  </td>
                  <td className="p-3 text-rawhide">{r.property_id}</td>
                  <td className="p-3 text-timber">{r.check_in}</td>
                  <td className="p-3 text-timber">{r.check_out}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      r.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      r.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      r.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{r.status}</span>
                  </td>
                  <td className="p-3 text-right text-timber">${parseFloat(r.total_amount || 0).toLocaleString()}</td>
                  <td className="p-3 text-right">
                    {parseFloat(r.outstanding_balance) > 0 ? (
                      <span className="text-red-600">${parseFloat(r.outstanding_balance).toLocaleString()}</span>
                    ) : (
                      <span className="text-green-600">Paid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 25 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 border border-wheat/40 rounded text-sm disabled:opacity-40"
          >Prev</button>
          <span className="px-3 py-1 text-sm text-rawhide">Page {page} of {Math.ceil(total / 25)}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 25)}
            className="px-3 py-1 border border-wheat/40 rounded text-sm disabled:opacity-40"
          >Next</button>
        </div>
      )}
    </div>
  );
}
