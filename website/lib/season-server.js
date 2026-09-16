// ---------------------------------------------------------------------------
// Server-side season resolution.
//
// Split from lib/seasons.js on purpose: this file imports next/headers, which
// cannot be pulled into a client component. Keeping the season DATA importable
// from anywhere and the cookie READ confined here means SeasonPicker can share
// one source of truth without dragging a server-only module into the bundle.
//
// Every route in this app is already `force-dynamic`, so reading a cookie in
// the root layout costs nothing that was not already being paid. If a route is
// ever made static, it will need to stop calling this.
// ---------------------------------------------------------------------------

import { cookies } from 'next/headers';
import { SEASON_COOKIE, getSeason, normalizeSeason, seasonForDate } from './seasons.js';

// Returns { season, chosen }. `chosen` is false when the visitor has not
// picked yet, which is what tells the layout to show the picker. Never returns
// null: a missing or junk cookie falls back to the calendar.
export function resolveSeason() {
  const raw = cookies().get(SEASON_COOKIE)?.value;
  const chosen = normalizeSeason(raw);
  return {
    season: getSeason(chosen || seasonForDate()),
    chosen: Boolean(chosen),
  };
}
