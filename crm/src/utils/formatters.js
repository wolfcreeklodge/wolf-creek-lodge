/**
 * Format a number as US currency.
 * @param {number} amount
 * @returns {string} e.g. "$1,234.56"
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format an ISO date string to readable format.
 * @param {string} isoString
 * @returns {string} e.g. "Apr 5, 2026"
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date range for check-in / check-out.
 * @param {string} checkIn
 * @param {string} checkOut
 * @returns {string} e.g. "Apr 5 – Apr 12, 2026"
 */
export function formatDateRange(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '—';
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return '—';

  const sameYear = a.getFullYear() === b.getFullYear();
  const sameMonth = sameYear && a.getMonth() === b.getMonth();

  const startOpts = { month: 'short', day: 'numeric' };
  if (!sameYear) startOpts.year = 'numeric';

  const endOpts = { month: 'short', day: 'numeric', year: 'numeric' };
  if (sameMonth) delete endOpts.month;

  return `${a.toLocaleDateString('en-US', startOpts)} – ${b.toLocaleDateString('en-US', endOpts)}`;
}

/**
 * Format a relative time string.
 * @param {string} isoString
 * @returns {string} e.g. "2 hours ago", "3 days ago"
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const now = Date.now();
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return '';

  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;
  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear} year${diffYear === 1 ? '' : 's'} ago`;
}

/**
 * Calculate nights between two dates.
 * @param {string} checkIn
 * @param {string} checkOut
 * @returns {number}
 */
export function calcNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const diff = (b - a) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.round(diff));
}

/**
 * Map property key to display label.
 * @param {string} property
 * @returns {string}
 */
export function getPropertyLabel(property) {
  const map = {
    house: 'The House',
    apartment: 'The Apartment',
    retreat: 'The Retreat',
  };
  return map[property] || property || '—';
}

/**
 * Return a Tailwind badge class string for a reservation status.
 * @param {string} status
 * @returns {string}
 */
export function getStatusColor(status) {
  const map = {
    confirmed: 'bg-blue-100 text-blue-800',
    checked_in: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-yellow-100 text-yellow-800',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

/**
 * Return a Tailwind badge class string for a payment status.
 * @param {string} status
 * @returns {string}
 */
export function getPaymentStatusColor(status) {
  const map = {
    unpaid: 'bg-red-100 text-red-800',
    advance: 'bg-yellow-100 text-yellow-800',
    paid_in_full: 'bg-green-100 text-green-800',
    refunded: 'bg-gray-100 text-gray-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

/**
 * Return a Tailwind badge class string for a booking source.
 * @param {string} source
 * @returns {string}
 */
export function getSourceColor(source) {
  const map = {
    airbnb: 'bg-pink-100 text-pink-800',
    vrbo: 'bg-blue-100 text-blue-800',
    direct: 'bg-green-100 text-green-800',
    referral: 'bg-purple-100 text-purple-800',
    other: 'bg-gray-100 text-gray-700',
  };
  return map[source] || 'bg-gray-100 text-gray-700';
}
