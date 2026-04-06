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
