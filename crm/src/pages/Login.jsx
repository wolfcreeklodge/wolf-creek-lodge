import React from 'react';
import { Navigate } from 'react-router-dom';

export default function Login({ user }) {
  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-snow px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-sm border border-wheat/30 p-8 text-center">
          {/* Logo / Brand */}
          <div className="mb-6">
            <div className="w-14 h-14 bg-creek/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-creek" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-display font-bold text-timber">
              Wolfridge CRM
            </h1>
            <p className="text-sm text-rawhide font-body mt-2">
              Wolf Creek Lodge &middot; Winthrop, WA
            </p>
          </div>

          <p className="text-sm text-rawhide/80 font-body mb-6">
            Sign in with your Microsoft account to continue.
          </p>

          <a
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 w-full bg-creek text-white hover:bg-pine rounded-lg px-4 py-3 font-body font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-creek focus:ring-offset-2"
          >
            {/* Microsoft icon */}
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            Sign in with Microsoft
          </a>
        </div>

        <p className="text-center text-xs text-rawhide/50 font-body mt-6">
          Access restricted to authorized staff only.
        </p>
      </div>
    </div>
  );
}
