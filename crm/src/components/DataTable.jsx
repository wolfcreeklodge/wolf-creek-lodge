import React from 'react';

export default function DataTable({
  columns = [],
  data = [],
  total = 0,
  page = 1,
  limit = 25,
  sortKey,
  sortDir,
  onSort,
  onPageChange,
  loading = false,
  emptyMessage = 'No records found.',
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleSort = (col) => {
    if (!col.sortable || !onSort) return;
    const newDir = sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    onSort(col.key, newDir);
  };

  // Build page numbers to show
  const pageNumbers = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-wheat/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-parchment/50 border-b border-wheat/30">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-body font-semibold uppercase tracking-wide text-rawhide ${col.hideOnMobile ? 'hidden md:table-cell' : ''}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-wheat/20">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 ${col.hideOnMobile ? 'hidden md:table-cell' : ''}`}
                    >
                      <div className="h-4 bg-parchment rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-wheat/30 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-parchment/50 border-b border-wheat/30">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-body font-semibold uppercase tracking-wide text-rawhide ${
                    col.sortable ? 'cursor-pointer select-none hover:text-timber' : ''
                  } ${col.hideOnMobile ? 'hidden md:table-cell' : ''}`}
                  onClick={() => handleSort(col)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-creek">
                        {sortDir === 'asc' ? '\u25b2' : '\u25bc'}
                      </span>
                    )}
                    {col.sortable && sortKey !== col.key && (
                      <span className="text-wheat">{'\u25b4\u25be'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-rawhide font-body"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className="border-b border-wheat/20 even:bg-parchment/30 hover:bg-parchment/50 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 font-body text-sm text-timber ${col.hideOnMobile ? 'hidden md:table-cell' : ''}`}
                    >
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-wheat/30 bg-parchment/20">
          <p className="text-xs text-rawhide font-body">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="px-2 py-1 text-xs rounded border border-wheat/50 text-timber disabled:opacity-40 hover:bg-parchment focus:outline-none focus:ring-2 focus:ring-creek"
            >
              Prev
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => onPageChange?.(p)}
                className={`px-2 py-1 text-xs rounded border focus:outline-none focus:ring-2 focus:ring-creek ${
                  p === page
                    ? 'bg-creek text-white border-creek'
                    : 'border-wheat/50 text-timber hover:bg-parchment'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="px-2 py-1 text-xs rounded border border-wheat/50 text-timber disabled:opacity-40 hover:bg-parchment focus:outline-none focus:ring-2 focus:ring-creek"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
