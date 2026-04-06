import React from 'react';

export default function StatCard({ label, value, sublabel, icon, trend }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-6 flex items-start gap-4">
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-creek/10 flex items-center justify-center text-creek text-xl">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-rawhide font-body font-semibold uppercase tracking-wide">
          {label}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-display font-bold text-timber truncate">{value}</p>
          {trend && (
            <span
              className={`text-sm font-semibold ${
                trend === 'up' ? 'text-green-600' : 'text-ember'
              }`}
            >
              {trend === 'up' ? '\u2191' : '\u2193'}
            </span>
          )}
        </div>
        {sublabel && (
          <p className="text-xs text-rawhide/70 font-body mt-1">{sublabel}</p>
        )}
      </div>
    </div>
  );
}
