import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { ConfidentialClientApplication } from '@azure/msal-node';

const SESSION_OPTIONS = {
  password: process.env.WEBSITE_AUTH_SECRET || 'dev-secret-must-be-at-least-32-chars-long!!',
  cookieName: 'wcl-admin',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
  },
};

const ALLOWED_EMAILS = (process.env.ADMIN_ALLOWED_EMAILS || process.env.CRM_ALLOWED_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// Fail closed. The old callers wrote "if (ALLOWED_EMAILS.length > 0 && !includes)",
// so an unset allowlist admitted everyone. That is a bad default generally, and a
// dangerous one here: the app registration accepts personal Microsoft accounts, so
// with authority 'common' anyone at all reaches the callback. .env has been
// reconstructed by hand once already; losing it must not open the admin panel.
export function isAllowedEmail(email) {
  if (ALLOWED_EMAILS.length === 0) return false;
  return ALLOWED_EMAILS.includes(String(email || '').toLowerCase());
}

// MSAL never exposes result.refreshToken -- it keeps refresh tokens in its token
// cache by design. Reading that property (which both this route and the CRM used
// to do) silently stored null forever, which is why email_sync_state had an
// access token but no refresh token and sync-email.mjs never ran.
export function extractRefreshToken(msalClient, homeAccountId) {
  try {
    const cache = JSON.parse(msalClient.getTokenCache().serialize());
    const entries = Object.values(cache.RefreshToken || {});
    if (entries.length === 0) return null;
    const match = homeAccountId
      ? entries.find((e) => e.home_account_id === homeAccountId)
      : null;
    return (match || entries[0]).secret || null;
  } catch (err) {
    console.error('Could not read refresh token from MSAL cache:', err.message);
    return null;
  }
}

const REDIRECT_URI = process.env.WEBSITE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
const DEV_BYPASS = process.env.DEV_BYPASS_AUTH === 'true';

export function getMsalClient() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

  if (!clientId || !clientSecret) return null;

  return new ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession(cookieStore, SESSION_OPTIONS);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session.user) return null;
  return session.user;
}

export { ALLOWED_EMAILS, REDIRECT_URI, DEV_BYPASS };
