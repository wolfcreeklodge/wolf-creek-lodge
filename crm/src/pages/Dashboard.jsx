import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../hooks/useApi';
import StatCard from '../components/StatCard';
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  formatRelativeTime,
  calcNights,
  getPropertyLabel,
  getStatusColor,
  getPaymentStatusColor,
} from '../utils/formatters';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [balances, setBalances] = useState([]);
  const [activity, setActivity] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dashData, actData] = await Promise.all([
          api.get('/api/dashboard'),
          api.get('/api/activity', { limit: 20 }),
        ]);

        // Flatten upcoming_checkins_7d from { property_id: [...] } to flat array
        const checkinsByProp = dashData.upcoming_checkins_7d || {};
        const flatCheckins = Object.values(checkinsByProp).flat();
        flatCheckins.sort((a, b) => new Date(a.check_in) - new Date(b.check_in));
        setCheckins(flatCheckins);

        // Outstanding balances — already an array
        setBalances(dashData.outstanding_balances || []);

        // Compute stats from response data
        const allCheckins30d = Object.values(dashData.upcoming_checkins_30d || {}).flat();
        const outstandingTotal = (dashData.outstanding_balances || [])
          .reduce((sum, r) => sum + parseFloat(r.balance || 0), 0);
        const ytdTotal = (dashData.revenue_ytd || [])
          .reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0);
        setStats({
          upcoming_checkins: allCheckins30d.length,
          outstanding_total: outstandingTotal,
          ytd_revenue: ytdTotal,
        });

        // Merge revenue_mtd and revenue_ytd into a per-property array
        const revByProp = {};
        for (const r of (dashData.revenue_ytd || [])) {
          revByProp[r.property_id] = { property_id: r.property_id, ytd: parseFloat(r.revenue || 0) };
        }
        for (const r of (dashData.revenue_mtd || [])) {
          if (!revByProp[r.property_id]) {
            revByProp[r.property_id] = { property_id: r.property_id, ytd: 0 };
          }
          revByProp[r.property_id].mtd = parseFloat(r.revenue || 0);
        }
        setRevenue(Object.values(revByProp));

        setActivity(actData.entries || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-timber">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-wheat/30 p-6">
              <div className="h-4 bg-parchment rounded animate-pulse w-1/2 mb-3" />
              <div className="h-8 bg-parchment rounded animate-pulse w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-timber">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Upcoming Check-ins"
          value={stats?.upcoming_checkins ?? 0}
          sublabel="Next 30 days"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Outstanding Balances"
          value={formatCurrency(stats?.outstanding_total ?? 0)}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="YTD Revenue"
          value={formatCurrency(stats?.ytd_revenue ?? 0)}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Check-ins */}
        <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-6">
          <h2 className="text-lg font-display font-bold text-timber mb-4">Upcoming Check-ins</h2>
          {checkins.length === 0 ? (
            <p className="text-sm text-rawhide font-body">No upcoming check-ins.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-wheat/30">
                    <th className="text-left text-xs font-body font-semibold text-rawhide uppercase pb-2">Guest</th>
                    <th className="text-left text-xs font-body font-semibold text-rawhide uppercase pb-2">Property</th>
                    <th className="text-left text-xs font-body font-semibold text-rawhide uppercase pb-2">Dates</th>
                    <th className="text-left text-xs font-body font-semibold text-rawhide uppercase pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {checkins.slice(0, 10).map((r) => (
                    <tr key={r.id} className="border-b border-wheat/10 hover:bg-parchment/30">
                      <td className="py-2 pr-3">
                        <Link
                          to={`/reservations/${r.id}`}
                          className="text-sm font-body text-creek hover:underline"
                        >
                          {`${r.first_name || ''} ${r.last_name || ''}`.trim() || '—'}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-sm font-body text-timber">
                        {getPropertyLabel(r.property_id)}
                      </td>
                      <td className="py-2 pr-3 text-sm font-body text-timber whitespace-nowrap">
                        {formatDateRange(r.check_in, r.check_out)}
                      </td>
                      <td className="py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${getPaymentStatusColor(r.payment_status)}`}>
                          {r.payment_status || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Outstanding Balances */}
        <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-6">
          <h2 className="text-lg font-display font-bold text-timber mb-4">Outstanding Balances</h2>
          {balances.length === 0 ? (
            <p className="text-sm text-rawhide font-body">No outstanding balances.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-wheat/30">
                    <th className="text-left text-xs font-body font-semibold text-rawhide uppercase pb-2">Guest</th>
                    <th className="text-left text-xs font-body font-semibold text-rawhide uppercase pb-2">Property</th>
                    <th className="text-right text-xs font-body font-semibold text-rawhide uppercase pb-2">Total</th>
                    <th className="text-right text-xs font-body font-semibold text-rawhide uppercase pb-2">Paid</th>
                    <th className="text-right text-xs font-body font-semibold text-rawhide uppercase pb-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.slice(0, 10).map((r) => (
                    <tr key={r.id} className="border-b border-wheat/10 hover:bg-parchment/30">
                      <td className="py-2 pr-3">
                        <Link
                          to={`/reservations/${r.id}`}
                          className="text-sm font-body text-creek hover:underline"
                        >
                          {`${r.first_name || ''} ${r.last_name || ''}`.trim() || '—'}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-sm font-body text-timber">
                        {getPropertyLabel(r.property_id)}
                      </td>
                      <td className="py-2 pr-3 text-sm font-body text-timber text-right">
                        {formatCurrency(r.total_amount)}
                      </td>
                      <td className="py-2 pr-3 text-sm font-body text-timber text-right">
                        {formatCurrency(r.amount_paid)}
                      </td>
                      <td className="py-2 text-sm font-body font-semibold text-ember text-right">
                        {formatCurrency(r.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-6">
          <h2 className="text-lg font-display font-bold text-timber mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-rawhide font-body">No recent activity.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {activity.map((a, idx) => (
                <div key={a.id || idx} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-creek/10 flex items-center justify-center text-creek text-xs mt-0.5">
                    {a.action === 'created' ? '+' : a.action === 'updated' ? '\u270e' : '\u2022'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body text-timber">
                      <span className="font-semibold">{a.entity_type || 'Record'}</span>{' '}
                      {a.action || 'modified'}
                    </p>
                    <p className="text-xs text-rawhide/60 font-body">
                      {formatRelativeTime(a.logged_at)}
                      {a.user_email ? ` by ${a.user_email}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue by Property */}
        <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-6">
          <h2 className="text-lg font-display font-bold text-timber mb-4">Revenue by Property</h2>
          {revenue.length === 0 ? (
            <p className="text-sm text-rawhide font-body">No revenue data available.</p>
          ) : (
            <div className="space-y-4">
              {revenue.map((r) => {
                const maxRev = Math.max(...revenue.map((x) => x.ytd || 0), 1);
                const pct = Math.round(((r.ytd || 0) / maxRev) * 100);
                return (
                  <div key={r.property_id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-body font-semibold text-timber">
                        {getPropertyLabel(r.property_id)}
                      </span>
                      <span className="text-sm font-body text-rawhide">
                        {formatCurrency(r.ytd || 0)} YTD
                      </span>
                    </div>
                    <div className="w-full bg-parchment rounded-full h-3">
                      <div
                        className="bg-creek h-3 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-rawhide/60 font-body mt-1">
                      MTD: {formatCurrency(r.mtd || 0)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
