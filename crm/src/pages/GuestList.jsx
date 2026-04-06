import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { formatCurrency, formatDate, getSourceColor } from '../utils/formatters';

const PROPERTIES = [
  { value: '', label: 'All Properties' },
  { value: 'wolf-creek-lodge', label: 'The House' },
  { value: 'wolf-creek-apartment', label: 'The Apartment' },
  { value: 'wolf-creek-retreat-combo', label: 'The Retreat' },
];

const CHANNELS = [
  { value: '', label: 'All Channels' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'vrbo', label: 'VRBO' },
  { value: 'direct', label: 'Direct' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
];

export default function GuestList() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filters, setFilters] = useState({ property: '', channel: '', payment_status: '' });
  const [data, setData] = useState({ guests: [], total: 0, stats: {} });
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('last_name');
  const [sortDir, setSortDir] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGuest, setNewGuest] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    state_province: '',
    country: '',
    source: '',
    notes: '',
  });
  const limit = 25;

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sort: sortKey,
        order: sortDir,
        search: debouncedSearch || undefined,
        property: filters.property || undefined,
        channel: filters.channel || undefined,
        payment_status: filters.payment_status || undefined,
      };
      const res = await api.get('/api/guests', params);
      setData({
        guests: res.guests || res.data || [],
        total: res.total || 0,
        stats: res.stats || {},
      });
    } catch (err) {
      toast.error('Failed to load guests: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortKey, sortDir, debouncedSearch, filters, toast]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const handleSort = (key, dir) => {
    setSortKey(key);
    setSortDir(dir);
  };

  const clearFilters = () => {
    setFilters({ property: '', channel: '', payment_status: '' });
    setSearch('');
  };

  const handleCreateGuest = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/api/guests', newGuest);
      toast.success('Guest created successfully');
      setShowCreate(false);
      setNewGuest({ first_name: '', last_name: '', email: '', phone: '', city: '', state_province: '', country: '', source: '', notes: '' });
      fetchGuests();
    } catch (err) {
      toast.error('Failed to create guest: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, row) => (
        <Link to={`/guests/${row.id}`} className="text-creek hover:underline font-semibold">
          {row.first_name} {row.last_name}
        </Link>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      hideOnMobile: true,
      render: (val) => val || '—',
    },
    {
      key: 'last_stay',
      label: 'Last Stay',
      sortable: true,
      hideOnMobile: true,
      render: (val) => formatDate(val),
    },
    {
      key: 'next_stay',
      label: 'Next Stay',
      sortable: true,
      hideOnMobile: true,
      render: (val) => formatDate(val),
    },
    {
      key: 'total_revenue',
      label: 'Revenue',
      sortable: true,
      render: (val) => formatCurrency(val || 0),
    },
    {
      key: 'outstanding_balance',
      label: 'Balance',
      sortable: true,
      render: (val) =>
        val > 0 ? (
          <span className="text-ember font-semibold">{formatCurrency(val)}</span>
        ) : (
          <span className="text-rawhide/50">{formatCurrency(0)}</span>
        ),
    },
    {
      key: 'tags',
      label: 'Tags',
      hideOnMobile: true,
      render: (val) => {
        if (!val) return '—';
        const tags = typeof val === 'string' ? val.split(',').filter(Boolean) : val;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-block bg-creek/10 text-creek rounded-full px-2 py-0.5 text-xs font-semibold"
              >
                {tag.trim()}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-rawhide">+{tags.length - 3}</span>
            )}
          </div>
        );
      },
    },
  ];

  const hasFilters = search || filters.property || filters.channel || filters.payment_status;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-timber">Guests</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-creek text-white hover:bg-pine rounded-lg px-4 py-2 text-sm font-body font-semibold focus:outline-none focus:ring-2 focus:ring-creek focus:ring-offset-2"
        >
          + Add Guest
        </button>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-4 space-y-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rawhide"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search guests by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-wheat rounded-lg text-sm font-body text-timber placeholder-rawhide/50 focus:outline-none focus:border-creek focus:ring-2 focus:ring-creek/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filters.property}
            onChange={(e) => setFilters((f) => ({ ...f, property: e.target.value }))}
            className="border border-wheat rounded-lg px-3 py-1.5 text-sm font-body text-timber focus:outline-none focus:border-creek focus:ring-2 focus:ring-creek/20"
          >
            {PROPERTIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <select
            value={filters.channel}
            onChange={(e) => setFilters((f) => ({ ...f, channel: e.target.value }))}
            className="border border-wheat rounded-lg px-3 py-1.5 text-sm font-body text-timber focus:outline-none focus:border-creek focus:ring-2 focus:ring-creek/20"
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={filters.payment_status}
            onChange={(e) => setFilters((f) => ({ ...f, payment_status: e.target.value }))}
            className="border border-wheat rounded-lg px-3 py-1.5 text-sm font-body text-timber focus:outline-none focus:border-creek focus:ring-2 focus:ring-creek/20"
          >
            <option value="">All Payment Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="advance">Advance</option>
            <option value="paid_in_full">Paid in Full</option>
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-creek hover:text-pine font-body font-semibold"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Stats summary */}
      {data.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-wheat/30 px-4 py-3 text-center">
            <p className="text-lg font-display font-bold text-timber">{data.total || 0}</p>
            <p className="text-xs text-rawhide font-body">Total Guests</p>
          </div>
          <div className="bg-white rounded-lg border border-wheat/30 px-4 py-3 text-center">
            <p className="text-lg font-display font-bold text-timber">{data.stats.upcoming || 0}</p>
            <p className="text-xs text-rawhide font-body">Upcoming Stays</p>
          </div>
          <div className="bg-white rounded-lg border border-wheat/30 px-4 py-3 text-center">
            <p className="text-lg font-display font-bold text-timber">{data.stats.with_balance || 0}</p>
            <p className="text-xs text-rawhide font-body">Outstanding</p>
          </div>
          <div className="bg-white rounded-lg border border-wheat/30 px-4 py-3 text-center">
            <p className="text-lg font-display font-bold text-timber">{data.stats.repeat || 0}</p>
            <p className="text-xs text-rawhide font-body">Repeat Guests</p>
          </div>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={data.guests}
        total={data.total}
        page={page}
        limit={limit}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No guests found. Try adjusting your search or filters."
      />

      {/* Create Guest Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add New Guest"
        size="md"
      >
        <form onSubmit={handleCreateGuest} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-body font-semibold text-timber mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={newGuest.first_name}
                onChange={(e) => setNewGuest((g) => ({ ...g, first_name: e.target.value }))}
                className="w-full border border-wheat rounded-lg px-3 py-2 text-sm font-body text-timber focus:outline-none focus:border-creek focus:ring-2 focus:ring-creek/20"
              />
            </div>
            <div>
              <label className="block text-sm font-body font-semibold text-timber mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={newGuest.last_name}
                onChange={(e) => setNewGuest((g) => ({ ...g, last_name: e.target.value }))}
                className="w-full border border-wheat rounded-lg px-3 py-2 text-sm font-body text-timber focus:outline-none focus:border-creek focus:ring-2 focus:ring-creek/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-timber mb-1">Email</label>
            <input
              type="email"
              value={newGuest.email}
              onChange={(e) => setNewGuest((g) => ({ ...g, email: e.target.value }))}
              className="w-full border border-wheat rounded-lg px-3 py-2 text-sm font-body text-timber focus:outline-none focus:border-creek focus:ring-2 focus:ring-creek/20"
            />
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-timber mb-1">Phone</label>
            <input
              type="tel"
              value={newGuest.phone}
              onChange={(e) => setNewGuest((g) => ({ ...g, phone: e.target.value }))}
              className="w-full border border-wheat rounded-lg px-3 py-2 text-sm font-body text-timber focus:outline-none focus:border-creek focus:ring-2 focus:ring-creek/20"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-body font-semibold text-timber mb-1">City</label>
              <input
                type="text"
                value={newGuest.city}
                onChange={(e) => setNewGuest((g) => ({ ...g, city: e.target.value }))}
                className="w-full border border-wheat rounded-lg px-3 py-2 text-sm font-body text-timber focus:outline-none focus:border-creek focus:ring-2 focus:ring-creek/20"
              />
            </div>
            <div>
              <label className="block text-sm font-body font-semibold text-timber mb-1">State</label>
              <input
                type="text"
                value={newGuest.state_province}
                onChange={(e) => setNewGuest((g) => ({ ...g, state_province: e.target.value }))}
                className="w-full border border-wheat rounded-lg px-3 py-2 text-sm font-body text-timber focus:outline-none focus:border-creek focus:ring-2 focus:ring-creek/20"
              />
            </div>
            <div>
              <label className="block text-sm font-body font-semibold text-timber mb-1">Country</label>
              <input
                type="text"
                value={newGuest.country}
                onChange={(e) => setNewGuest((g) => ({ ...g, country: e.target.value }))}
                className="w-full border border-wheat rounded-lg px-3 py-2 text-sm font-body text-timber focus:outline-none focus:border-creek focus:ring-2 focus:ring-creek/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-timber mb-1">Source</label>
            <select
              value={newGuest.source}
              onChange={(e) => setNewGuest((g) => ({ ...g, source: e.target.value }))}
              className="w-full border border-wheat rounded-lg px-3 py-2 text-sm font-body text-timber focus:outline-none focus:border-creek focus:ring-2 focus:ring-creek/20"
            >
              <option value="">Select source</option>
              <option value="airbnb">Airbnb</option>
              <option value="vrbo">VRBO</option>
              <option value="direct">Direct</option>
              <option value="referral">Referral</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-timber mb-1">Notes</label>
            <textarea
              value={newGuest.notes}
              onChange={(e) => setNewGuest((g) => ({ ...g, notes: e.target.value }))}
              rows={3}
              className="w-full border border-wheat rounded-lg px-3 py-2 text-sm font-body text-timber focus:outline-none focus:border-creek focus:ring-2 focus:ring-creek/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="bg-parchment text-timber border border-wheat hover:bg-wheat rounded-lg px-4 py-2 text-sm font-body font-semibold focus:outline-none focus:ring-2 focus:ring-creek"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="bg-creek text-white hover:bg-pine rounded-lg px-4 py-2 text-sm font-body font-semibold disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-creek focus:ring-offset-2"
            >
              {creating ? 'Creating...' : 'Create Guest'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
